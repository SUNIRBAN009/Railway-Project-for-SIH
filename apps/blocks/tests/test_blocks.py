import json
import datetime
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import UserProfile, UserRole, DepartmentCode
from apps.blocks.models import Corridor, Block, BlockConflict, BlockStatus, LineType, WorkType, ConflictType, ConflictSeverity
from apps.blocks.conflict_engine import ConflictDetector


class BlockCoreTests(TestCase):
    def setUp(self):
        # Users
        self.engineer = User.objects.create_user(username='sse_pway_sharma', password='pwd', first_name='Rohan', last_name='Sharma')
        p1, _ = UserProfile.objects.get_or_create(user=self.engineer)
        p1.employee_id = 'NR-ENG-101'
        p1.role = UserRole.DEPT_ENGINEER
        p1.department_code = DepartmentCode.ENG
        p1.save()

        self.coa = User.objects.create_user(username='coa_chief_delhi', password='pwd', first_name='Rajesh', last_name='Verma')
        p2, _ = UserProfile.objects.get_or_create(user=self.coa)
        p2.employee_id = 'IR-COA-001'
        p2.role = UserRole.CHIEF_CONTROLLER
        p2.department_code = DepartmentCode.OPERATIONS
        p2.save()

        # Corridor
        self.corridor = Corridor.objects.create(
            code='NDLS-GZB-UP',
            name='New Delhi - Ghaziabad Up Main Line',
            division='DLI',
            start_km=0.000,
            end_km=28.500,
            is_electrified=True,
            max_permissible_speed_kmh=130
        )

        now = timezone.now() + datetime.timedelta(days=1)
        self.t_start = now.replace(hour=11, minute=0, second=0, microsecond=0)
        self.t_end = now.replace(hour=14, minute=0, second=0, microsecond=0)

    def test_corridor_creation(self):
        """Verify corridor boundaries and total length."""
        self.assertEqual(self.corridor.code, 'NDLS-GZB-UP')
        self.assertEqual(self.corridor.total_length_km, 28.5)

    def test_block_proposal_creation_and_properties(self):
        """Verify block attributes, duration calculation, and state machine validation."""
        block = Block.objects.create(
            block_code='BLK-20260907-ENG-001',
            corridor=self.corridor,
            line_type=LineType.UP,
            department_code=DepartmentCode.ENG,
            work_type=WorkType.TRACK_TAMPING,
            requested_by=self.engineer,
            start_km=10.000,
            end_km=15.000,
            scheduled_start_time=self.t_start,
            scheduled_end_time=self.t_end,
            status=BlockStatus.PENDING_APPROVAL
        )

        self.assertEqual(block.duration_hours, 3.0)
        self.assertEqual(block.span_km, 5.0)
        self.assertTrue(block.can_transition_to(BlockStatus.SANCTIONED))
        self.assertFalse(block.can_transition_to(BlockStatus.ACTIVE))

    def test_conflict_detection_train_collision(self):
        """Verify sweep-line detector identifies scheduled train paths intersecting possession zone."""
        # Daytime block overlapping with Shatabdi (06:10)
        t_day_start = self.t_start.replace(hour=5, minute=30)
        t_day_end = self.t_start.replace(hour=7, minute=30)

        block = Block.objects.create(
            block_code='BLK-20260907-ENG-002',
            corridor=self.corridor,
            department_code=DepartmentCode.ENG,
            work_type=WorkType.TRACK_TAMPING,
            start_km=5.000,
            end_km=15.000,
            scheduled_start_time=t_day_start,
            scheduled_end_time=t_day_end,
            status=BlockStatus.PENDING_APPROVAL
        )

        detector = ConflictDetector(block)
        report = detector.run_sweep()

        self.assertGreater(report['total_conflicts'], 0)
        self.assertGreaterEqual(report['critical_conflicts'], 1)
        self.assertEqual(block.status, BlockStatus.CONFLICT_DETECTED)

    def test_shadow_block_coordination(self):
        """Verify compatible multi-department overlap (ENG + TRD) is identified as Shadow Co-Possession."""
        # Primary ENG Block
        eng_block = Block.objects.create(
            block_code='BLK-20260907-ENG-003',
            corridor=self.corridor,
            department_code=DepartmentCode.ENG,
            work_type=WorkType.TRACK_TAMPING,
            start_km=12.000,
            end_km=16.000,
            scheduled_start_time=self.t_start,
            scheduled_end_time=self.t_end,
            status=BlockStatus.SANCTIONED
        )

        # Overlapping TRD Catenary Block on same section and window
        trd_block = Block.objects.create(
            block_code='BLK-20260907-TRD-001',
            corridor=self.corridor,
            department_code=DepartmentCode.TRD,
            work_type=WorkType.CATENARY_MAINTENANCE,
            start_km=13.000,
            end_km=15.500,
            scheduled_start_time=self.t_start + datetime.timedelta(minutes=15),
            scheduled_end_time=self.t_end - datetime.timedelta(minutes=15),
            status=BlockStatus.PENDING_APPROVAL
        )

        detector = ConflictDetector(trd_block)
        report = detector.run_sweep()

        self.assertGreater(report['shadow_opportunities'], 0)
        # TRD block should be marked as COORDINATED
        self.assertEqual(trd_block.status, BlockStatus.COORDINATED)


class BlockAPIRoutesTests(TestCase):
    def setUp(self):
        self.client = Client()

        # Departmental Engineer
        self.engineer = User.objects.create_user(username='eng_user', password='pwd')
        p1, _ = UserProfile.objects.get_or_create(user=self.engineer, defaults={'employee_id': 'NR-ENG-777'})
        p1.role = UserRole.DEPT_ENGINEER
        p1.department_code = DepartmentCode.ENG
        p1.save()
        self.engineer.refresh_from_db()

        # Chief Controller
        self.coa = User.objects.create_user(username='coa_chief', password='pwd')
        p2, _ = UserProfile.objects.get_or_create(user=self.coa, defaults={'employee_id': 'IR-COA-777'})
        p2.role = UserRole.CHIEF_CONTROLLER
        p2.department_code = DepartmentCode.OPERATIONS
        p2.save()
        self.coa.refresh_from_db()

        # Corridor
        self.corridor = Corridor.objects.create(
            code='NDLS-GZB-DN',
            name='New Delhi - Ghaziabad Down Main Line',
            division='DLI',
            start_km=0.000,
            end_km=28.500,
        )

        now = timezone.now() + datetime.timedelta(days=1)
        self.t_start = now.replace(hour=1, minute=30, second=0, microsecond=0)
        self.t_end = now.replace(hour=4, minute=30, second=0, microsecond=0)

    def test_submit_block_proposal_api(self):
        """FUNC-BLK-001: POST /api/v1/blocks/proposals/ creates block and executes conflict sweep."""
        self.client.force_login(self.engineer)
        url = reverse('blocks:api_proposal_create')
        payload = {
            'corridor': str(self.corridor.id),
            'line_type': LineType.DOWN,
            'department_code': DepartmentCode.ENG,
            'work_type': WorkType.TRACK_TAMPING,
            'start_km': 10.0,
            'end_km': 14.5,
            'scheduled_start_time': self.t_start.isoformat(),
            'scheduled_end_time': self.t_end.isoformat(),
            'traction_power_cutoff_required': False,
            'work_description': 'CSM Tamping testing'
        }

        response = self.client.post(url, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('block_code', data['data'])
        self.assertIn('sweep_report', data['data'])

    def test_sanction_block_optimistic_locking(self):
        """FUNC-BLK-005: POST /api/v1/blocks/<id>/sanction/ enforces version concurrency lock."""
        block = Block.objects.create(
            block_code='BLK-TEST-SANCTION-01',
            corridor=self.corridor,
            department_code=DepartmentCode.ENG,
            start_km=5.0,
            end_km=8.0,
            scheduled_start_time=self.t_start,
            scheduled_end_time=self.t_end,
            status=BlockStatus.PENDING_APPROVAL,
            version=1
        )

        self.client.force_login(self.coa)
        url = reverse('blocks:api_block_sanction', kwargs={'pk': block.id})

        # Mismatched version should return HTTP 409 Conflict
        payload_stale = {'action': 'SANCTION', 'version': 99, 'remarks': 'Stale version test'}
        res_stale = self.client.post(url, data=json.dumps(payload_stale), content_type='application/json')
        self.assertEqual(res_stale.status_code, 409)

        # Correct version should succeed
        payload_correct = {'action': 'SANCTION', 'version': 1, 'remarks': 'Approved by COA'}
        res_correct = self.client.post(url, data=json.dumps(payload_correct), content_type='application/json')
        self.assertEqual(res_correct.status_code, 200)
        block.refresh_from_db()
        self.assertEqual(block.status, BlockStatus.SANCTIONED)
        self.assertEqual(block.version, 2)
        self.assertEqual(block.sanctioned_by, self.coa)

    def test_block_activation_and_completion_lifecycle(self):
        """FUNC-BLK-006 & 007: Activate with Caution Order and complete with safety sign-off."""
        block = Block.objects.create(
            block_code='BLK-TEST-LIFECYCLE-01',
            corridor=self.corridor,
            department_code=DepartmentCode.ENG,
            start_km=5.0,
            end_km=8.0,
            scheduled_start_time=self.t_start,
            scheduled_end_time=self.t_end,
            status=BlockStatus.SANCTIONED,
            version=1
        )

        self.client.force_login(self.coa)

        # 1. Activate
        url_activate = reverse('blocks:api_block_activate', kwargs={'pk': block.id})
        res_act = self.client.post(url_activate, data=json.dumps({'caution_order_id': 'CO-NDLS-2026-089'}), content_type='application/json')
        self.assertEqual(res_act.status_code, 200)
        block.refresh_from_db()
        self.assertEqual(block.status, BlockStatus.ACTIVE)
        self.assertEqual(block.caution_order_id, 'CO-NDLS-2026-089')

        # 2. Complete
        url_complete = reverse('blocks:api_block_complete', kwargs={'pk': block.id})
        res_comp = self.client.post(url_complete, data=json.dumps({'track_fit_certified': True}), content_type='application/json')
        self.assertEqual(res_comp.status_code, 200)
        block.refresh_from_db()
        self.assertEqual(block.status, BlockStatus.COMPLETED)
        self.assertTrue(block.track_fit_certified)
