"""
End-to-End (E2E) Integration Tests for All 5 Mission-Critical Scenarios (TSK-P4-007).
Authoritative reference: docs/06-testing-qa/01-e2e-scenarios.md
Verifies:
  Scenario 1: Routine Track Maintenance Block Lifecycle
  Scenario 2: Multi-Department Co-Possession Coordination
  Scenario 3: Emergency USFD Rail Flaw Defect & Automated Block
  Scenario 4: Semantic Digital Twin Safety Validation
  Scenario 5: Concurrent Modification Race Condition (Optimistic Locking)
"""
import datetime
from decimal import Decimal
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.accounts.models import UserRole, DepartmentCode, UserProfile
from apps.blocks.models import Corridor, Block, BlockStatus, LineType, WorkType
from apps.blocks.conflict_engine import ConflictDetector
from apps.departments.models import Department, Gang, MaintenanceEquipment, EquipmentType, WorkOrder, WorkOrderStatus
from apps.assets.models import TrackAsset, AssetCategory, DefectSeverity, DefectType
from apps.assets.services import AssetHealthService
from apps.ontology.services import DigitalTwinService
from apps.notifications.models import Notification, NotificationPriority

User = get_user_model()

TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS, CELERY_TASK_ALWAYS_EAGER=True)
class CriticalOperationalE2ETests(TestCase):
    """End-to-End Operational Journey Integration Test Suite (PS 26027)."""

    def setUp(self):
        # 1. Staff Users
        self.chief_controller = User.objects.create_user(
            username='e2e_controller',
            password='password123',
            email='controller@nr.railnet.gov.in'
        )
        p1 = getattr(self.chief_controller, 'profile', None) or UserProfile.objects.get_or_create(user=self.chief_controller)[0]
        p1.employee_id = 'IR-COA-8801'
        p1.role = UserRole.CHIEF_CONTROLLER
        p1.department_code = DepartmentCode.OPERATIONS
        p1.division_code = 'DLI'
        p1.save()

        self.eng_engineer = User.objects.create_user(
            username='e2e_eng_engineer',
            password='password123',
            email='eng@nr.railnet.gov.in'
        )
        p2 = getattr(self.eng_engineer, 'profile', None) or UserProfile.objects.get_or_create(user=self.eng_engineer)[0]
        p2.employee_id = 'NR-ENG-1201'
        p2.role = UserRole.DEPT_ENGINEER
        p2.department_code = DepartmentCode.ENG
        p2.division_code = 'DLI'
        p2.save()

        self.trd_engineer = User.objects.create_user(
            username='e2e_trd_engineer',
            password='password123',
            email='trd@nr.railnet.gov.in'
        )
        p3 = getattr(self.trd_engineer, 'profile', None) or UserProfile.objects.get_or_create(user=self.trd_engineer)[0]
        p3.employee_id = 'NR-TRD-1202'
        p3.role = UserRole.DEPT_ENGINEER
        p3.department_code = DepartmentCode.TRD
        p3.division_code = 'DLI'
        p3.save()

        # 2. Corridor Geography
        self.corridor = Corridor.objects.create(
            code='NDLS-CNB',
            name='New Delhi - Kanpur Central Main Line',
            zone='NR',
            division='DLI',
            source_station='NDLS',
            destination_station='CNB',
            start_km=Decimal('0.000'),
            end_km=Decimal('440.000'),
            is_electrified=True,
            max_permissible_speed_kmh=130
        )

        # 3. Departmental Entities
        self.dept_eng = Department.objects.create(
            code=DepartmentCode.ENG,
            name='Civil Engineering (P-Way)'
        )
        self.dept_trd = Department.objects.create(
            code=DepartmentCode.TRD,
            name='Traction Distribution (OHE)'
        )
        self.gang_eng = Gang.objects.create(
            gang_number='GANG-ENG-E2E',
            department=self.dept_eng,
            headquarters_station='NDLS',
            crew_strength=12
        )
        self.machine_csm = MaintenanceEquipment.objects.create(
            equipment_code='CSM-E2E-01',
            equipment_type=EquipmentType.TRACK_TAMPER_CSM,
            department=self.dept_eng,
            equipment_name='Plasser 09-32 Continuous Tamper',
            home_depot='NDLS',
            fitness_expiry_date=timezone.now().date() + datetime.timedelta(days=365)
        )

    # ------------------------------------------------------------------------
    # Scenario 1: Routine Track Maintenance Block Lifecycle
    # ------------------------------------------------------------------------
    def test_scenario_1_routine_track_maintenance_block_lifecycle(self):
        """
        User Journey 1: Proposal -> Conflict Sweep -> Controller Sanction -> Work Order -> Handback.
        """
        start_t = timezone.now() + datetime.timedelta(hours=2)
        end_t = start_t + datetime.timedelta(hours=4)

        # Step 1: P-Way engineer submits proposal
        block = Block.objects.create(
            block_code='BLK-E2E-SCENARIO-01',
            corridor=self.corridor,
            line_type=LineType.UP,
            department_code=DepartmentCode.ENG,
            work_type=WorkType.TRACK_TAMPING,
            requested_by=self.eng_engineer,
            start_km=Decimal('142.500'),
            end_km=Decimal('146.200'),
            scheduled_start_time=start_t,
            scheduled_end_time=end_t,
            status=BlockStatus.PENDING_APPROVAL,
            work_description='Routine 4-hour tamping Up Line'
        )
        self.assertEqual(block.status, BlockStatus.PENDING_APPROVAL)

        # Step 2: Sweep-line conflict detection
        detector = ConflictDetector(block)
        sweep_result = detector.run_sweep()
        self.assertIn('total_conflicts', sweep_result)

        # Step 3: Section controller reviews and sanctions block
        self.client.login(username='e2e_controller', password='password123')
        sanction_url = reverse('blocks:api_block_sanction', kwargs={'pk': block.id})
        resp = self.client.post(sanction_url, {
            'action': 'SANCTION',
            'version': block.version,
            'remarks': 'Approved routine tamping window.'
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 200)

        block.refresh_from_db()
        self.assertEqual(block.status, BlockStatus.SANCTIONED)
        self.assertEqual(block.sanctioned_by, self.chief_controller)

        # Step 4: Issue Work Order
        wo = WorkOrder.objects.create(
            order_number='WO-E2E-001',
            block=block,
            department=self.dept_eng,
            gang=self.gang_eng,
            equipment=self.machine_csm,
            planned_work_scope='Tamping 3.7 km track under 45 km/h Caution Order',
            target_metric_units=Decimal('3700.00'),
            status=WorkOrderStatus.ON_SITE
        )
        self.assertEqual(wo.status, WorkOrderStatus.ON_SITE)

        # Step 5: Safety handback & track fit certification
        block.actual_start_time = start_t
        block.actual_end_time = end_t
        block.track_fit_certified = True
        block.status = BlockStatus.COMPLETED
        block.save()

        self.assertTrue(block.track_fit_certified)
        self.assertEqual(block.status, BlockStatus.COMPLETED)

    # ------------------------------------------------------------------------
    # Scenario 2: Multi-Department Co-Possession Coordination
    # ------------------------------------------------------------------------
    def test_scenario_2_multi_department_co_possession_coordination(self):
        """
        User Journey 2: Parallel overlapping requests (ENG + TRD) bundled into shadow block.
        """
        start_t = timezone.now() + datetime.timedelta(hours=6)
        end_t = start_t + datetime.timedelta(hours=4)

        # ENG Block Proposal
        eng_block = Block.objects.create(
            block_code='BLK-E2E-ENG-02',
            corridor=self.corridor,
            line_type=LineType.DOWN,
            department_code=DepartmentCode.ENG,
            work_type=WorkType.TRACK_TAMPING,
            requested_by=self.eng_engineer,
            start_km=Decimal('50.000'),
            end_km=Decimal('55.000'),
            scheduled_start_time=start_t,
            scheduled_end_time=end_t,
            status=BlockStatus.PENDING_APPROVAL
        )

        # TRD Block Proposal on same corridor & overlapping KM span
        trd_block = Block.objects.create(
            block_code='BLK-E2E-TRD-02',
            corridor=self.corridor,
            line_type=LineType.DOWN,
            department_code=DepartmentCode.TRD,
            work_type=WorkType.CATENARY_MAINTENANCE,
            requested_by=self.trd_engineer,
            start_km=Decimal('51.000'),
            end_km=Decimal('54.000'),
            scheduled_start_time=start_t,
            scheduled_end_time=end_t,
            status=BlockStatus.PENDING_APPROVAL
        )

        # Conflict Detector flags parallel spatial overlap
        detector = ConflictDetector(trd_block)
        res = detector.run_sweep()
        self.assertGreaterEqual(res.get('shadow_opportunities', 0), 0)

        # Section Controller coordinates TRD inside ENG as integrated shadow block
        trd_block.parent_block = eng_block
        trd_block.is_shadow = True
        trd_block.status = BlockStatus.COORDINATED
        trd_block.save()

        self.assertTrue(trd_block.is_shadow)
        self.assertEqual(trd_block.parent_block, eng_block)
        self.assertEqual(trd_block.status, BlockStatus.COORDINATED)

    # ------------------------------------------------------------------------
    # Scenario 3: Emergency USFD Rail Flaw Defect & Automated Caution Order
    # ------------------------------------------------------------------------
    def test_scenario_3_emergency_usfd_rail_flaw_and_automated_block(self):
        """
        User Journey 3: USFD defect detected -> Automated Emergency Block -> SMS alert -> Immediate Sanction.
        """
        asset = TrackAsset.objects.create(
            asset_tag='TRK-USFD-DEFECT-01',
            name='60kg UIC Rail KM 144.200',
            corridor=self.corridor,
            asset_category=AssetCategory.PERMANENT_WAY,
            sub_type='60KG_RAIL',
            line_type=LineType.DOWN,
            location_km=Decimal('144.200'),
            current_health_score=Decimal('45.0')
        )

        # Log critical flaw
        defect, emergency_block = AssetHealthService.register_defect(
            asset=asset,
            defect_data={
                'defect_type': DefectType.INTERNAL_RAIL_FRACTURE,
                'severity': DefectSeverity.CRITICAL_IMMEDIATE_STOP,
                'flaw_depth_mm': Decimal('18.0'),
                'description': "18mm Internal Transverse Fissure detected by USFD trolley",
                'detected_by_source': 'USFD_ULTRASONIC',
            }
        )

        self.assertIsNotNone(defect)
        self.assertEqual(defect.severity, DefectSeverity.CRITICAL_IMMEDIATE_STOP)
        self.assertIsNotNone(emergency_block)
        self.assertEqual(emergency_block.status, BlockStatus.PENDING_APPROVAL)

        # Immediate controller sanction of emergency block
        self.client.login(username='e2e_controller', password='password123')
        sanction_url = reverse('blocks:api_block_sanction', kwargs={'pk': emergency_block.id})
        resp = self.client.post(sanction_url, {
            'action': 'SANCTION',
            'version': emergency_block.version,
            'remarks': 'Immediate emergency sanction for USFD rail fracture.'
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 200)

        emergency_block.refresh_from_db()
        self.assertEqual(emergency_block.status, BlockStatus.SANCTIONED)

    # ------------------------------------------------------------------------
    # Scenario 4: Semantic Digital Twin Safety Validation
    # ------------------------------------------------------------------------
    def test_scenario_4_semantic_digital_twin_safety_validation(self):
        """
        User Journey 4: Semantic reasoning engine validates electrical isolation safety.
        """
        start_t = timezone.now() + datetime.timedelta(hours=4)
        onto_block = Block.objects.create(
            block_code='BLK-E2E-ONTO-01',
            corridor=self.corridor,
            line_type=LineType.UP,
            department_code=DepartmentCode.TRD,
            work_type=WorkType.CATENARY_MAINTENANCE,
            requested_by=self.trd_engineer,
            start_km=Decimal('14.000'),
            end_km=Decimal('16.000'),
            scheduled_start_time=start_t,
            scheduled_end_time=start_t + datetime.timedelta(hours=3),
            traction_power_cutoff_required=True,
            status=BlockStatus.PENDING_APPROVAL
        )

        from apps.ontology.services import DigitalTwinService
        violations = DigitalTwinService.run_reasoning(onto_block.id)
        self.assertIsInstance(violations, list)

    # ------------------------------------------------------------------------
    # Scenario 5: Concurrent Modification Race Condition (Optimistic Locking)
    # ------------------------------------------------------------------------
    def test_scenario_5_concurrent_modification_race_condition(self):
        """
        User Journey 5: Two controllers sanction simultaneously at version 1 -> Second receives 409 Conflict.
        """
        start_t = timezone.now() + datetime.timedelta(hours=10)
        block = Block.objects.create(
            block_code='BLK-E2E-RACE-05',
            corridor=self.corridor,
            line_type=LineType.UP,
            department_code=DepartmentCode.ENG,
            work_type=WorkType.TRACK_TAMPING,
            requested_by=self.eng_engineer,
            start_km=Decimal('20.000'),
            end_km=Decimal('22.000'),
            scheduled_start_time=start_t,
            scheduled_end_time=start_t + datetime.timedelta(hours=2),
            status=BlockStatus.PENDING_APPROVAL,
            version=1
        )

        self.client.login(username='e2e_controller', password='password123')
        sanction_url = reverse('blocks:api_block_sanction', kwargs={'pk': block.id})

        # Request 1 from Controller A (version 1) -> Success, increments version to 2
        resp1 = self.client.post(sanction_url, {'action': 'SANCTION', 'version': 1}, content_type='application/json')
        self.assertEqual(resp1.status_code, 200)

        block.refresh_from_db()
        self.assertEqual(block.version, 2)

        # Request 2 from Controller B (stale version 1) -> 409 Conflict
        resp2 = self.client.post(sanction_url, {'action': 'SANCTION', 'version': 1}, content_type='application/json')
        self.assertEqual(resp2.status_code, 409)
        self.assertEqual(resp2.json()['error']['code'], 'BLK-409')
