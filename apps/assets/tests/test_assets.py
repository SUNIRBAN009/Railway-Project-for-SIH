from decimal import Decimal
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import UserProfile, UserRole, DepartmentCode as DeptCode
from apps.blocks.models import Corridor, Block, LineType, BlockStatus, WorkType
from apps.assets.models import TrackAsset, AssetDefectLog, AssetCategory, DefectSeverity, DefectType
from apps.assets.services import AssetHealthService

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class AssetConditionMonitoringTestCase(TestCase):
    """
    Test suite for Asset Condition Monitoring (SVC-AST).
    Verifies:
      - TSK-P3-007: TrackAsset & AssetDefectLog models and lifecycle
      - TSK-P3-008: Track Quality Index (TQI) and Degradation Score calculations
      - TSK-P3-009: Automated Emergency Block generation on critical flaws
      - FUNC-AST-001, FUNC-AST-002, FUNC-AST-003: API endpoints
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="asset_engineer",
            email="asset_engineer@railway.gov.in",
            password="StrongPassword123!"
        )
        self.profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                'role': UserRole.DEPT_ENGINEER,
                'employee_id': "EMP-ENG-AST-01",
                'department_code': DeptCode.ENG,
            }
        )
        self.client.force_authenticate(user=self.user)

        self.corridor = Corridor.objects.create(
            code="CORR-NDLS-GZB",
            name="Delhi - Ghaziabad High Density Corridor",
            zone="NR",
            division="DLI",
            source_station="NDLS",
            destination_station="GZB",
            start_km=0.000,
            end_km=25.000,
        )

        self.rail_asset = TrackAsset.objects.create(
            asset_tag="RAIL-NDLS-GZB-DN-KM-14.2",
            name="60kg UIC Continuous Welded Rail KM 14.2",
            asset_category=AssetCategory.PERMANENT_WAY,
            sub_type="60KG_UIC_RAIL",
            corridor=self.corridor,
            location_km=Decimal("14.200"),
            line_type=LineType.DOWN,
            current_health_score=Decimal("100.00"),
            tqi_index=Decimal("24.50"),
            is_operational=True,
        )

    def test_tsk_p3_007_track_asset_creation_and_attributes(self):
        """TSK-P3-007: Validates TrackAsset attributes, relationships, and maintenance properties."""
        asset = self.rail_asset
        self.assertEqual(asset.asset_category, AssetCategory.PERMANENT_WAY)
        self.assertEqual(asset.line_type, LineType.DOWN)
        self.assertFalse(asset.needs_maintenance)

        # Update health score below 40.0
        asset.current_health_score = Decimal("35.00")
        asset.save()
        self.assertTrue(asset.needs_maintenance)

    def test_tsk_p3_008_tqi_calculation_algorithm(self):
        """TSK-P3-008: Validates RDSO TQI summation and rating classifications."""
        # Good track geometry
        good_result = AssetHealthService.calculate_tqi(
            unevenness_sd=6.2,
            alignment_sd=5.8,
            twist_sd=7.1,
            gauge_sd=5.4
        )
        self.assertEqual(good_result['tqi_value'], 24.5)
        self.assertEqual(good_result['rating'], "VERY_GOOD")
        self.assertFalse(good_result['tamping_needed'])

        # Degraded track geometry requiring tamping
        degraded_result = AssetHealthService.calculate_tqi(
            unevenness_sd=14.0,
            alignment_sd=12.5,
            twist_sd=13.0,
            gauge_sd=9.5
        )
        self.assertEqual(degraded_result['tqi_value'], 49.0)
        self.assertEqual(degraded_result['rating'], "MAINTENANCE_REQUIRED")
        self.assertTrue(degraded_result['tamping_needed'])

    def test_tsk_p3_008_asset_degradation_score_calculation(self):
        """TSK-P3-008: Validates Asset Health Score degradation formula."""
        asset = self.rail_asset
        initial_score = AssetHealthService.calculate_health_score(asset)
        self.assertEqual(initial_score, Decimal("100.00"))

        # Add minor defect
        minor_defect = AssetDefectLog.objects.create(
            defect_code="DEF-TEST-001",
            asset=asset,
            defect_type=DefectType.WHEEL_BURN,
            severity=DefectSeverity.MONITORING_REQUIRED,
            flaw_depth_mm=Decimal("2.0"),
        )
        score_minor = AssetHealthService.calculate_health_score(asset)
        # Expected: 100.0 - 10.0 (severity) - (2.0 * 2.5 = 5.0) = 85.0
        self.assertEqual(score_minor, Decimal("85.00"))

        # Add critical defect (should cap at 25.0 max)
        critical_defect = AssetDefectLog.objects.create(
            defect_code="DEF-TEST-002",
            asset=asset,
            defect_type=DefectType.INTERNAL_RAIL_FRACTURE,
            severity=DefectSeverity.CRITICAL_IMMEDIATE_STOP,
            flaw_depth_mm=Decimal("15.0"),
        )
        score_critical = AssetHealthService.calculate_health_score(asset)
        self.assertLessEqual(score_critical, Decimal("25.00"))

    def test_tsk_p3_009_critical_defect_triggers_automated_emergency_block(self):
        """
        TSK-P3-009: Verifies that registering a CRITICAL_IMMEDIATE_STOP defect
        automatically provisions a draft Emergency Block in SVC-BLK.
        """
        defect_data = {
            'defect_code': 'DEF-EMG-USFD-09',
            'defect_type': DefectType.INTERNAL_RAIL_FRACTURE,
            'severity': DefectSeverity.CRITICAL_IMMEDIATE_STOP,
            'detected_by_source': 'USFD_CAR_04',
            'flaw_depth_mm': Decimal('16.50'),
            'recommended_speed_restriction_kmh': 20,
            'block_recommended': True,
            'description': 'Transverse rail fracture detected under heavy axle load section.',
        }

        defect, emergency_block = AssetHealthService.register_defect(self.rail_asset, defect_data)

        # Assert defect was saved and health score degraded
        self.assertIsNotNone(defect.id)
        self.assertEqual(defect.severity, DefectSeverity.CRITICAL_IMMEDIATE_STOP)
        self.assertLessEqual(self.rail_asset.current_health_score, Decimal("25.00"))

        # Assert emergency block was created in apps.blocks
        self.assertIsNotNone(emergency_block)
        self.assertTrue(emergency_block.block_code.startswith("BLK-EMG-"))
        self.assertEqual(emergency_block.corridor, self.corridor)
        self.assertEqual(emergency_block.line_type, LineType.DOWN)
        self.assertEqual(emergency_block.work_type, WorkType.RAIL_RENEWAL)
        self.assertIn(emergency_block.status, [BlockStatus.PENDING_APPROVAL, BlockStatus.CONFLICT_DETECTED])

        # Assert spatial span (500m around KM 14.200 -> 13.700 to 14.700)
        self.assertAlmostEqual(float(emergency_block.start_km), 13.700, places=2)
        self.assertAlmostEqual(float(emergency_block.end_km), 14.700, places=2)

        # Assert defect links to emergency block
        self.assertEqual(defect.emergency_block_id, str(emergency_block.id))
        self.assertTrue(defect.block_recommended)

    def test_func_ast_001_query_assets_endpoint(self):
        """FUNC-AST-001: GET /api/v1/assets/ returns asset collection with health scores."""
        response = self.client.get('/api/v1/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertTrue(len(data['data']) >= 1)
        item = data['data'][0]
        self.assertEqual(item['asset_tag'], self.rail_asset.asset_tag)
        self.assertIn('current_health_score', item)
        self.assertIn('tqi_index', item)

        # Test filtering by corridor
        filtered_resp = self.client.get(f'/api/v1/assets/?corridor={self.corridor.code}')
        self.assertEqual(filtered_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filtered_resp.json()['data']), 1)

    def test_func_ast_002_register_defect_endpoint(self):
        """FUNC-AST-002: POST /api/v1/assets/defects/ registers flaw and provisions emergency block."""
        payload = {
            'asset_id': self.rail_asset.asset_tag,
            'defect_type': DefectType.INTERNAL_RAIL_FRACTURE,
            'severity': DefectSeverity.CRITICAL_IMMEDIATE_STOP,
            'detected_by_source': 'USFD_ULTRASONIC',
            'flaw_depth_mm': 15.2,
            'recommended_speed_restriction_kmh': 30,
            'block_recommended': True,
            'description': 'Severe flaw detected during night USFD run.',
        }

        response = self.client.post('/api/v1/assets/defects/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertTrue(data['data']['emergency_block_created'])
        self.assertIn('emergency_block', data['data'])
        self.assertTrue(data['data']['emergency_block']['block_code'].startswith('BLK-EMG-'))

    def test_func_ast_003_maintenance_recommendations_endpoint(self):
        """FUNC-AST-003: GET /api/v1/assets/maintenance-recommendations/ returns degraded assets."""
        # Degrade asset health score
        self.rail_asset.current_health_score = Decimal("30.00")
        self.rail_asset.save()

        response = self.client.get('/api/v1/assets/maintenance-recommendations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertTrue(len(data['data']) >= 1)
        rec = data['data'][0]
        self.assertEqual(rec['asset_tag'], self.rail_asset.asset_tag)
        self.assertIn('suggested_work_type', rec)
        self.assertIn('urgency', rec)
        self.assertIn('recommended_span', rec)

    def test_tqi_calculate_api_endpoint(self):
        """POST /api/v1/assets/tqi/calculate/ returns TQI rating and updates asset."""
        payload = {
            'asset_id': self.rail_asset.asset_tag,
            'unevenness_sd': 8.5,
            'alignment_sd': 7.2,
            'twist_sd': 8.0,
            'gauge_sd': 6.3,
        }
        response = self.client.post('/api/v1/assets/tqi/calculate/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data['data']['tqi_value'], 30.0)
        self.assertEqual(data['data']['rating'], 'GOOD')

        # Verify asset was updated in DB
        self.rail_asset.refresh_from_db()
        self.assertEqual(self.rail_asset.tqi_index, Decimal("30.00"))
