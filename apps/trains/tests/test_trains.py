import json
import datetime
from decimal import Decimal
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.utils import timezone
from django.urls import reverse

from apps.accounts.models import UserProfile, UserRole, DepartmentCode
from apps.trains.models import (
    Train,
    TrainSchedule,
    TrainLiveStatus,
    TrainType,
    TractionType,
    TrainLiveRunStatus,
)
from apps.trains.delay_engine import DelayCascadeEngine
from apps.trains.tasks import ingest_coa_feed


class TrainOperationsTests(TestCase):
    def setUp(self):
        self.client = Client()

        # Section Controller user for authenticated tests
        self.controller = User.objects.create_user(
            username='sec_ctrl_delhi',
            password='Password@123',
            first_name='Anil',
            last_name='Kumar'
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.controller)
        profile.employee_id = 'IR-CTRL-101'
        profile.role = UserRole.SECTION_CONTROLLER
        profile.department_code = DepartmentCode.OPERATIONS
        profile.save()

        # Setup baseline test trains
        self.vande_bharat = Train.objects.create(
            train_number='22436',
            train_name='New Delhi - Varanasi Vande Bharat Express',
            train_type=TrainType.PRESTIGE_SUPERFAST,
            priority_rank=1,
            source_station='NDLS',
            destination_station='BSB',
            traction_type=TractionType.ELECTRIC,
            max_speed_kmh=160,
            length_meters=Decimal('420.00')
        )

        self.rajdhani = Train.objects.create(
            train_number='12424',
            train_name='Dibrugarh Rajdhani Express',
            train_type=TrainType.PRESTIGE_SUPERFAST,
            priority_rank=2,
            source_station='NDLS',
            destination_station='DBRG',
            traction_type=TractionType.ELECTRIC,
            max_speed_kmh=140,
            length_meters=Decimal('650.00')
        )

        self.freight = Train.objects.create(
            train_number='BOXN-881',
            train_name='Coal Rake Freight (Tughlakabad - Dadri Yard)',
            train_type=TrainType.BULK_FREIGHT,
            priority_rank=60,
            source_station='TKD',
            destination_station='DER',
            traction_type=TractionType.ELECTRIC,
            max_speed_kmh=75,
            length_meters=Decimal('712.00')
        )

        # Schedules for Vande Bharat
        self.s1 = TrainSchedule.objects.create(
            train=self.vande_bharat,
            station_code='NDLS',
            station_sequence=1,
            scheduled_arrival_time=None,
            scheduled_departure_time=datetime.time(6, 0, 0),
            platform_number='16',
            km_milestone=Decimal('0.000')
        )
        self.s2 = TrainSchedule.objects.create(
            train=self.vande_bharat,
            station_code='GZB',
            station_sequence=2,
            scheduled_arrival_time=datetime.time(6, 28, 0),
            scheduled_departure_time=datetime.time(6, 30, 0),
            platform_number='2',
            km_milestone=Decimal('28.500')
        )

        # Live Status
        self.today = timezone.now().date()
        self.live1 = TrainLiveStatus.objects.create(
            train=self.vande_bharat,
            journey_date=self.today,
            current_station_code='GZB',
            current_km=Decimal('28.500'),
            delay_minutes=0,
            speed_kmh=Decimal('130.00'),
            status=TrainLiveRunStatus.ON_TIME
        )
        self.live2 = TrainLiveStatus.objects.create(
            train=self.rajdhani,
            journey_date=self.today,
            current_station_code='NDLS',
            current_km=Decimal('4.200'),
            delay_minutes=12,
            speed_kmh=Decimal('65.00'),
            status=TrainLiveRunStatus.RUNNING
        )

    # ------------------------------------------------------------------------
    # Task TSK-P2-009: Train and TrainSchedule Models
    # ------------------------------------------------------------------------
    def test_train_and_schedule_models(self):
        self.assertEqual(Train.objects.count(), 3)
        self.assertTrue(self.vande_bharat.is_prestige)
        self.assertFalse(self.vande_bharat.is_freight)
        self.assertTrue(self.freight.is_freight)

        schedules = self.vande_bharat.schedules.all().order_by('station_sequence')
        self.assertEqual(schedules.count(), 2)
        self.assertEqual(schedules[0].station_code, 'NDLS')
        self.assertEqual(schedules[1].station_code, 'GZB')

    # ------------------------------------------------------------------------
    # Task TSK-P2-010: TrainLiveStatus Model & Delay Tracking
    # ------------------------------------------------------------------------
    def test_train_live_status_model(self):
        self.assertTrue(self.live1.is_punctual)
        self.assertFalse(self.live2.is_punctual)
        self.assertEqual(self.live1.status, TrainLiveRunStatus.ON_TIME)
        self.assertEqual(self.live2.delay_minutes, 12)

    # ------------------------------------------------------------------------
    # Task TSK-P2-011: FUNC-TRN-001 Timetable Search and Schedule Retrieval
    # ------------------------------------------------------------------------
    def test_func_trn_001_timetable_search_and_schedule(self):
        self.client.force_login(self.controller)

        # Search catalog endpoint
        url = reverse('trains:catalog')
        resp = self.client.get(url, {'search': 'Vande Bharat'})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['count'], 1)
        self.assertEqual(data['data']['trains'][0]['train_number'], '22436')

        # Filter by type
        resp_freight = self.client.get(url, {'type': TrainType.BULK_FREIGHT})
        self.assertEqual(resp_freight.status_code, 200)
        self.assertEqual(resp_freight.json()['data']['count'], 1)

        # Train schedule detail
        sched_url = reverse('trains:schedule_detail', kwargs={'train_number': '22436'})
        resp_sched = self.client.get(sched_url)
        self.assertEqual(resp_sched.status_code, 200)
        sched_data = resp_sched.json()
        self.assertTrue(sched_data['success'])
        self.assertEqual(len(sched_data['data']['schedules']), 2)

    # ------------------------------------------------------------------------
    # Task TSK-P2-012: FUNC-TRN-002 Live Train Position Endpoint
    # ------------------------------------------------------------------------
    def test_func_trn_002_live_positions(self):
        self.client.force_login(self.controller)

        url = reverse('trains:live_positions')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['count'], 2)

        # Filter with delay_greater_than=10
        resp_delayed = self.client.get(url, {'delay_greater_than': '10'})
        self.assertEqual(resp_delayed.status_code, 200)
        delayed_data = resp_delayed.json()
        self.assertEqual(delayed_data['data']['count'], 1)
        self.assertEqual(delayed_data['data']['active_live_trains'][0]['train_number'], '12424')

    # ------------------------------------------------------------------------
    # Task TSK-P2-013: FUNC-TRN-003 Timetable Ingestion Worker Task
    # ------------------------------------------------------------------------
    def test_func_trn_003_ingest_coa_feed(self):
        summary = ingest_coa_feed()
        self.assertEqual(summary['status'], 'SUCCESS')
        self.assertGreaterEqual(summary['trains_processed'], 6)
        self.assertGreaterEqual(summary['schedules_created'], 15)
        self.assertGreaterEqual(summary['live_positions_updated'], 5)

        # Verify new train created from feed
        shatabdi = Train.objects.filter(train_number='12004').first()
        self.assertIsNotNone(shatabdi)
        self.assertEqual(shatabdi.train_name, 'Lucknow Swarna Shatabdi Express')

    # ------------------------------------------------------------------------
    # Task TSK-P2-014: FUNC-TRN-004 Delay Cascade Propagation Algorithm
    # ------------------------------------------------------------------------
    def test_func_trn_004_delay_cascade_engine_calculation(self):
        """
        Mathematical proof test:
        L = 3.700 km, V_caution = 30 km/h, V_0 = 130 km/h, T_lost = 3.0 min
        T_0 = (3.7 / 130) * 60 = 1.7077 min
        T_caution = (3.7 / 30) * 60 = 7.4000 min
        Delta_T = (7.4 - 1.7077) + 3.0 = 8.6923 min -> round ~ 8.7 min
        """
        engine = DelayCascadeEngine(
            corridor_length_km=3.700,
            imposed_speed_restriction_kmh=30.0
        )
        lead_delay = engine.calculate_lead_delay(normal_speed_kmh=130.0)
        self.assertAlmostEqual(lead_delay, 8.6923, places=2)

        simulation = engine.simulate()
        self.assertEqual(simulation['lead_train_delay_minutes'], 8.7)
        self.assertGreater(simulation['total_passenger_delay_minutes'], 0)
        self.assertIn('recommendation', simulation['rerouting_recommendation'].lower() or simulation['rerouting_recommendation'].lower())
        self.assertTrue(len(simulation['train_breakdown']) > 0)

    def test_func_trn_004_delay_simulation_api(self):
        self.client.force_login(self.controller)

        url = reverse('trains:simulate_delay')
        payload = {
            'block_id': 'blk-demo-01',
            'imposed_speed_restriction_kmh': 30,
            'corridor_length_km': 3.700
        }
        resp = self.client.post(url, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['lead_train_delay_minutes'], 8.7)
        self.assertIn('rerouting_recommendation', data['data'])

    # ------------------------------------------------------------------------
    # Frontend SSR and HTMX Partial View
    # ------------------------------------------------------------------------
    def test_train_operations_dashboard_ssr_view(self):
        resp = self.client.get(reverse('trains:dashboard'))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, 'Train Operations & Timetable Service')
        self.assertContains(resp, 'corridor-train-map')
        self.assertContains(resp, '22436')

    def test_htmx_simulate_delay_partial(self):
        url = reverse('trains:htmx_simulate_delay')
        resp = self.client.post(url, {
            'speed_restriction': '30',
            'corridor_length': '3.700'
        })
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, 'Lead Train Delay')
        self.assertContains(resp, '+8.7m')
        self.assertContains(resp, 'AI Automated Dispatch Recommendation')
