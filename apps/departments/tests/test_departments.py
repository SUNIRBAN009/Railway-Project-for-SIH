import json
import datetime
from decimal import Decimal
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.utils import timezone
from django.urls import reverse

from apps.accounts.models import UserProfile, UserRole, DepartmentCode
from apps.blocks.models import Corridor, Block, BlockStatus, LineType, WorkType
from apps.departments.models import (
    Department,
    Gang,
    MaintenanceEquipment,
    WorkOrder,
    EquipmentType,
    EquipmentStatus,
    WorkOrderStatus,
)


class DepartmentLogisticsTests(TestCase):
    def setUp(self):
        self.client = Client()

        # Engineer user
        self.engineer = User.objects.create_user(
            username='sse_pway_verma',
            password='Password@123',
            first_name='Sunil',
            last_name='Verma'
        )
        p1, _ = UserProfile.objects.get_or_create(user=self.engineer)
        p1.employee_id = 'NR-ENG-201'
        p1.role = UserRole.DEPT_ENGINEER
        p1.department_code = DepartmentCode.ENG
        p1.save()

        # Site Supervisor user
        self.supervisor = User.objects.create_user(
            username='sup_sharma',
            password='Password@123',
            first_name='Ramesh',
            last_name='Sharma'
        )
        p2, _ = UserProfile.objects.get_or_create(user=self.supervisor)
        p2.employee_id = 'NR-SUP-301'
        p2.role = UserRole.SITE_SUPERVISOR
        p2.department_code = DepartmentCode.ENG
        p2.save()

        # Baseline Departments
        self.dept_eng = Department.objects.create(
            code=DepartmentCode.ENG,
            name='Civil Engineering & Permanent Way',
            headquarters_division='DLI',
            contact_email='eng.dli@railnet.gov.in',
            escalation_phone='011-23341001'
        )
        self.dept_trd = Department.objects.create(
            code=DepartmentCode.TRD,
            name='Traction Distribution',
            headquarters_division='DLI',
            contact_email='trd.dli@railnet.gov.in',
            escalation_phone='011-23341002'
        )

        # Maintenance Gang
        self.gang_eng = Gang.objects.create(
            gang_number='GANG-ENG-NDLS-01',
            department=self.dept_eng,
            supervisor=self.supervisor,
            headquarters_station='NDLS',
            crew_strength=14,
            assigned_section_start_km=Decimal('0.000'),
            assigned_section_end_km=Decimal('28.500'),
            is_active=True
        )

        # Heavy Equipment (Fit)
        today = timezone.now().date()
        self.tamper = MaintenanceEquipment.objects.create(
            equipment_code='CSM-9021',
            equipment_name='09-32 CSM Continuous Track Tamper',
            equipment_type=EquipmentType.TRACK_TAMPER_CSM,
            department=self.dept_eng,
            home_depot='TKD',
            current_location_km=Decimal('14.500'),
            operational_status=EquipmentStatus.AVAILABLE,
            fitness_expiry_date=today + datetime.timedelta(days=60)
        )

        # Expired Equipment
        self.expired_bcm = MaintenanceEquipment.objects.create(
            equipment_code='BCM-OLD-01',
            equipment_name='RM-80 Ballast Cleaner (Overdue)',
            equipment_type=EquipmentType.BALLAST_CLEANER_BCM,
            department=self.dept_eng,
            home_depot='GZB',
            current_location_km=Decimal('28.500'),
            operational_status=EquipmentStatus.AVAILABLE,
            fitness_expiry_date=today - datetime.timedelta(days=5)
        )

        # Track Corridor and Sanctioned Block for testing work orders
        self.corridor = Corridor.objects.create(
            code='NDLS-GZB-UP',
            name='New Delhi - Ghaziabad Up Main Line',
            division='DLI',
            start_km=Decimal('0.000'),
            end_km=Decimal('28.500')
        )
        now = timezone.now() + datetime.timedelta(days=1)
        self.block = Block.objects.create(
            block_code='BLK-TEST-ENG-01',
            corridor=self.corridor,
            department_code=DepartmentCode.ENG,
            line_type=LineType.UP,
            work_type=WorkType.TRACK_TAMPING,
            start_km=Decimal('12.000'),
            end_km=Decimal('15.000'),
            scheduled_start_time=now.replace(hour=1, minute=0, second=0, microsecond=0),
            scheduled_end_time=now.replace(hour=4, minute=0, second=0, microsecond=0),
            status=BlockStatus.SANCTIONED,
            requested_by=self.engineer
        )

    # ------------------------------------------------------------------------
    # Task TSK-P2-015 & TSK-P2-016: Models Creation & Constraints
    # ------------------------------------------------------------------------
    def test_models_creation_and_fitness_flags(self):
        self.assertEqual(Department.objects.count(), 2)
        self.assertEqual(Gang.objects.count(), 1)
        self.assertTrue(self.tamper.is_fit)
        self.assertFalse(self.expired_bcm.is_fit)
        self.assertTrue(self.expired_bcm.is_fitness_expired)

    # ------------------------------------------------------------------------
    # Task TSK-P2-018: FUNC-DEPT-001 Gang Rosters Query
    # ------------------------------------------------------------------------
    def test_func_dept_001_gang_roster_query(self):
        self.client.force_login(self.engineer)
        url = reverse('departments:gangs')

        # Get all gangs
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['count'], 1)

        # Filter by department
        resp_eng = self.client.get(url, {'department': 'ENG'})
        self.assertEqual(resp_eng.json()['data']['count'], 1)

        resp_trd = self.client.get(url, {'department': 'TRD'})
        self.assertEqual(resp_trd.json()['data']['count'], 0)

    # ------------------------------------------------------------------------
    # Task TSK-P2-018: FUNC-DEPT-002 Register Gang Unit
    # ------------------------------------------------------------------------
    def test_func_dept_002_register_gang(self):
        self.client.force_login(self.engineer)
        url = reverse('departments:gangs')

        payload = {
            'gang_number': 'GANG-TRD-GZB-09',
            'department_code': 'TRD',
            'headquarters_station': 'GZB',
            'crew_strength': 12,
            'assigned_section_start_km': '10.000',
            'assigned_section_end_km': '50.000',
            'is_active': True
        }
        resp = self.client.post(url, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['gang_number'], 'GANG-TRD-GZB-09')

    # ------------------------------------------------------------------------
    # Task TSK-P2-019: FUNC-DEPT-003 Equipment Readiness Query
    # ------------------------------------------------------------------------
    def test_func_dept_003_equipment_readiness_query(self):
        self.client.force_login(self.engineer)
        url = reverse('departments:equipment')

        resp = self.client.get(url, {'fit_only': 'true'})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['success'])
        # Only self.tamper is fit, self.expired_bcm is filtered out
        self.assertEqual(data['data']['count'], 1)
        self.assertEqual(data['data']['equipment'][0]['equipment_code'], 'CSM-9021')

    # ------------------------------------------------------------------------
    # Task TSK-P2-020: FUNC-DEPT-004 Work Order Creation & Reservation
    # ------------------------------------------------------------------------
    def test_func_dept_004_work_order_creation_success(self):
        self.client.force_login(self.engineer)
        url = reverse('departments:work_orders')

        payload = {
            'block_id': str(self.block.id),
            'gang_id': str(self.gang_eng.id),
            'equipment_id': str(self.tamper.id),
            'planned_work_scope': 'Tamping of PSC sleeper track from KM 12.000 to KM 14.500 using CSM.',
            'target_metric_units': '2500.00'
        }
        resp = self.client.post(url, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data['success'])
        self.assertIn('WO-', data['data']['order_number'])
        self.assertEqual(data['data']['status'], 'PENDING')

        # Verify equipment status is locked to ASSIGNED
        self.tamper.refresh_from_db()
        self.assertEqual(self.tamper.operational_status, EquipmentStatus.ASSIGNED)

    def test_func_dept_004_expired_equipment_rejected(self):
        """Validates that machinery with an expired fitness certificate is rejected."""
        self.client.force_login(self.engineer)
        url = reverse('departments:work_orders')

        payload = {
            'block_id': str(self.block.id),
            'gang_id': str(self.gang_eng.id),
            'equipment_id': str(self.expired_bcm.id),
            'planned_work_scope': 'Deep screening with expired machine',
            'target_metric_units': '1000.00'
        }
        resp = self.client.post(url, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(resp.status_code, 400)
        data = resp.json()
        self.assertFalse(data['success'])
        self.assertIn('fitness expired', str(data['error']['details']))

    # ------------------------------------------------------------------------
    # Task TSK-P2-021: FUNC-DEPT-005 Digital Safety Clearance Sign-Off
    # ------------------------------------------------------------------------
    def test_func_dept_005_safety_clearance_signoff(self):
        # Create an active work order
        wo = WorkOrder.objects.create(
            order_number='WO-20260907-ENG-001',
            block=self.block,
            department=self.dept_eng,
            gang=self.gang_eng,
            equipment=self.tamper,
            planned_work_scope='Track tamping completed',
            target_metric_units=Decimal('2500.00'),
            status=WorkOrderStatus.ON_SITE
        )
        self.tamper.operational_status = EquipmentStatus.ASSIGNED
        self.tamper.save()

        self.client.force_login(self.supervisor)
        url = reverse('departments:work_order_clearance', kwargs={'pk': str(wo.id)})

        payload = {
            'safety_certified': True,
            'actual_metric_units': '2480.00',
            'ballast_profile_verified': True,
            'track_gauge_checked': True,
            'remarks': 'Cross levels checked. Line fit for 30 km/h pilot passage.'
        }
        resp = self.client.patch(url, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['work_order']['status'], 'SAFETY_CLEARANCE_SIGNED')
        self.assertTrue(data['data']['all_block_orders_cleared'])

        # Verify equipment released back to AVAILABLE
        self.tamper.refresh_from_db()
        self.assertEqual(self.tamper.operational_status, EquipmentStatus.AVAILABLE)

    # ------------------------------------------------------------------------
    # SSR Dashboard & HTMX Partial Tests
    # ------------------------------------------------------------------------
    def test_departments_dashboard_ssr_view(self):
        self.client.force_login(self.engineer)
        resp = self.client.get(reverse('departments:dashboard'))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, 'Departmental Logistics & Resource Service')
        self.assertContains(resp, 'Field Gangs (Crews)')
        self.assertContains(resp, 'Heavy Machinery Fleet')

    def test_htmx_quick_safety_signoff_view(self):
        wo = WorkOrder.objects.create(
            order_number='WO-20260907-ENG-002',
            block=self.block,
            department=self.dept_eng,
            gang=self.gang_eng,
            equipment=self.tamper,
            planned_work_scope='Quick tamping',
            target_metric_units=Decimal('1500.00'),
            status=WorkOrderStatus.ON_SITE
        )
        self.client.force_login(self.supervisor)
        url = reverse('departments:htmx_clearance', kwargs={'pk': str(wo.id)})
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, 'Cleared')
        self.assertContains(resp, 'Track Safe')
