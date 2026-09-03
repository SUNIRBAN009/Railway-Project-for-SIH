from django.test import TestCase, Client
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile, UserRole
from apps.trains.models import Station, Train, TrainType, TrainStatus
from apps.grievances.models import Grievance, GrievanceCategory, GrievancePriority, GrievanceStatus
from apps.grievances.ai_classifier import analyze_grievance_text
from apps.maintenance.models import DefectReport, DefectType, DefectSeverity
from apps.emergency.models import SOSAlert, EmergencyType, SOSStatus

class RailwaySystemTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='test_passenger', password='password123')
        self.station1 = Station.objects.create(name='New Delhi', code='NDLS')
        self.station2 = Station.objects.create(name='Howrah', code='HWH')
        self.train = Train.objects.create(
            train_number='22436',
            name='Vande Bharat Express',
            train_type=TrainType.VANDE_BHARAT,
            source_station=self.station1,
            destination_station=self.station2,
        )

    def test_home_page_loads(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'RailConnect')

    def test_ai_classifier_critical_detection(self):
        analysis = analyze_grievance_text("There is a robbery and harassment happening in our coach")
        self.assertEqual(analysis['priority'], 'CRITICAL')
        self.assertEqual(analysis['suggested_category'], 'SECURITY')
        self.assertTrue(analysis['is_critical'])

    def test_ai_classifier_electrical_detection(self):
        analysis = analyze_grievance_text("AC not working and fan is dead in coach B2")
        self.assertEqual(analysis['priority'], 'HIGH')
        self.assertEqual(analysis['suggested_category'], 'ELECTRICAL')

    def test_lodge_grievance(self):
        self.client.login(username='test_passenger', password='password123')
        response = self.client.post('/grievances/lodge/', {
            'passenger_name': 'Test User',
            'passenger_phone': '9876543210',
            'pnr_number': '1234567890',
            'train_number': '22436',
            'coach_number': 'C1',
            'seat_number': '42',
            'current_station': 'NDLS',
            'category': GrievanceCategory.ELECTRICAL,
            'subject': 'AC cooling failure',
            'description': 'AC dead and severe heat in coach C1',
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Grievance.objects.count(), 1)
        grv = Grievance.objects.first()
        self.assertEqual(grv.priority, GrievancePriority.HIGH)

    def test_sos_trigger(self):
        response = self.client.post('/emergency/trigger/', {
            'passenger_name': 'Emergency User',
            'passenger_phone': '9998887776',
            'emergency_type': EmergencyType.SECURITY,
            'train_number': '22436',
            'coach_number': 'C1',
            'seat_number': '10',
            'current_location_desc': 'Near Kanpur',
            'details': 'Intruders attempting to break coach door',
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(SOSAlert.objects.count(), 1)

    def test_api_summary_endpoint(self):
        response = self.client.get('/api/analytics/summary/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('trains', data)
        self.assertIn('grievances', data)
        self.assertIn('maintenance', data)
        self.assertIn('emergency', data)

    def test_demo_role_switch(self):
        response = self.client.get('/accounts/demo-switch/station_master/', follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['user'].username, 'demo_station_master')
