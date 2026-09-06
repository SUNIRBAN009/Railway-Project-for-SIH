import os
import uuid
from datetime import time, timedelta
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.ontology.models import OntologyGraph, SemanticViolation
from apps.ontology.services import DigitalTwinService
from apps.blocks.models import Corridor, Block, WorkType, DepartmentCode, LineType
from apps.trains.models import Train, TrainSchedule, TractionType, TrainType

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class OntologyDigitalTwinTestCase(TestCase):
    """
    Test suite for Semantic Digital Twin & Ontology Reasoning (SVC-ONTO).
    Verifies:
      - TSK-P3-001: OWL 2 DL ontology file structure
      - TSK-P3-002: DigitalTwinService ontology loading and hydration
      - TSK-P3-003 / TSK-P3-005: Asynchronous reasoning execution
      - TSK-P3-004: DL rule inference for stranded electric train hazard
      - TSK-P3-006: Narrative proofs and API endpoints
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="ontologist",
            email="ontologist@railway.gov.in",
            password="StrongPassword123!"
        )
        from apps.accounts.models import UserProfile, UserRole, DepartmentCode as DeptCode
        self.profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                'role': UserRole.CHIEF_CONTROLLER,
                'employee_id': "EMP-ONTO-001",
                'department_code': DeptCode.OPERATIONS,
            }
        )
        self.client.force_authenticate(user=self.user)

        self.corridor = Corridor.objects.create(
            code="CORR-DEL-CNB",
            name="Delhi - Kanpur High Density Corridor",
            zone="NR",
            division="DLI",
            source_station="NDLS",
            destination_station="CNB",
            start_km=0.000,
            end_km=440.000,
        )

        self.now = timezone.now()

        # Electric Train (e.g. Rajdhani Express)
        self.electric_train = Train.objects.create(
            train_number="12424",
            train_name="Dibrugarh Rajdhani Express",
            train_type=TrainType.PRESTIGE_SUPERFAST,
            priority_rank=1,
            traction_type=TractionType.ELECTRIC,
            source_station="NDLS",
            destination_station="DBRG",
        )
        TrainSchedule.objects.create(
            train=self.electric_train,
            station_code="NDLS",
            station_sequence=1,
            scheduled_departure_time=time(2, 30),
            km_milestone=15.000,
        )

        # Diesel Train (e.g. Freight or Diesel Passenger)
        self.diesel_train = Train.objects.create(
            train_number="15036",
            train_name="Uttarakhand Sampark Kranti Express",
            train_type=TrainType.PASSENGER_EXPRESS,
            priority_rank=20,
            traction_type=TractionType.DIESEL,
            source_station="DLI",
            destination_station="KGM",
        )
        TrainSchedule.objects.create(
            train=self.diesel_train,
            station_code="DLI",
            station_sequence=1,
            scheduled_departure_time=time(3, 0),
            km_milestone=15.000,
        )

    def test_tsk_p3_001_ontology_file_structure(self):
        """TSK-P3-001: Verifies OWL 2 DL ontology exists and defines all required classes."""
        filepath = DigitalTwinService.get_ontology_file_path()
        self.assertTrue(os.path.exists(filepath))

        world, onto = DigitalTwinService.create_isolated_world()
        classes = {c.name for c in onto.classes()}
        properties = {p.name for p in onto.properties()}

        # Verify Core Domain Classes
        expected_classes = {
            'RailwayAsset', 'TrackSection', 'TrackSegment', 'TractionOHE', 'OHEZone',
            'SignalPoint', 'Train', 'ElectricTrain', 'DieselTrain',
            'MaintenanceBlock', 'TractionPowerCutBlock', 'BlockPossession',
            'OperationalHazard', 'SafetyHazard', 'StrandedElectricTrainHazard'
        }
        for cls_name in expected_classes:
            self.assertIn(cls_name, classes, f"Missing class in ontology: {cls_name}")

        # Verify Core Object Properties
        expected_properties = {
            'occupiesTrack', 'blocksSection', 'reservesTrack',
            'depowersOHE', 'cutsPowerTo', 'electrifies', 'hasHazard'
        }
        for prop_name in expected_properties:
            self.assertIn(prop_name, properties, f"Missing property in ontology: {prop_name}")

    def test_tsk_p3_002_digital_twin_service_summary(self):
        """TSK-P3-002: Verifies DigitalTwinService graph metrics summary."""
        summary = DigitalTwinService.get_graph_summary()
        self.assertIn('version_tag', summary)
        self.assertIn('total_classes', summary)
        self.assertGreaterEqual(summary['total_classes'], 20)
        self.assertGreaterEqual(summary['total_properties'], 7)
        self.assertTrue(summary['is_active'])

    def test_tsk_p3_004_stranded_electric_train_hazard_inference(self):
        """
        TSK-P3-004: Verifies Description Logic rule detects stranded electric train hazard
        when OHE de-energization coincides with electric locomotive train path.
        """
        ohe_block = Block.objects.create(
            block_code="BLK-TEST-TRD-001",
            corridor=self.corridor,
            line_type=LineType.UP,
            department_code=DepartmentCode.TRD,
            work_type=WorkType.CATENARY_MAINTENANCE,
            start_km=12.000,
            end_km=18.000,
            scheduled_start_time=self.now,
            scheduled_end_time=self.now + timedelta(hours=3),
            traction_power_cutoff_required=True,
        )

        violations = DigitalTwinService.run_reasoning(ohe_block.id)
        self.assertTrue(len(violations) > 0)

        # Check for STRANDED_ELECTRIC_TRAIN violation
        stranded_viols = [
            v for v in violations
            if v.violation_type == SemanticViolation.ViolationType.STRANDED_ELECTRIC_TRAIN
        ]
        self.assertTrue(len(stranded_viols) > 0, "No stranded electric train violation detected!")

        v = stranded_viols[0]
        self.assertEqual(v.rule_identifier, "RULE-OHE-ELECTRIC-ISOLATION-04")
        self.assertEqual(v.severity, SemanticViolation.Severity.CRITICAL_SAFETY)
        self.assertIn("12424", v.explanation_narrative)
        self.assertIn("OHE catenary de-energization", v.explanation_narrative)
        self.assertIn("Formal DL Axiom Proof", v.explanation_narrative)
        self.assertTrue(len(v.involved_owl_individuals) >= 4)

    def test_diesel_train_does_not_incur_stranded_hazard(self):
        """Verifies that a diesel train alone does NOT incur stranded electric train hazard."""
        # De-link or remove electric train for this test
        TrainSchedule.objects.filter(train=self.electric_train).delete()
        self.electric_train.delete()

        ohe_block = Block.objects.create(
            block_code="BLK-TEST-DIESEL-001",
            corridor=self.corridor,
            line_type=LineType.UP,
            department_code=DepartmentCode.TRD,
            work_type=WorkType.CATENARY_MAINTENANCE,
            start_km=12.000,
            end_km=18.000,
            scheduled_start_time=self.now,
            scheduled_end_time=self.now + timedelta(hours=2),
            traction_power_cutoff_required=True,
        )

        violations = DigitalTwinService.run_reasoning(ohe_block.id)
        stranded_viols = [
            v for v in violations
            if v.violation_type == SemanticViolation.ViolationType.STRANDED_ELECTRIC_TRAIN
        ]
        self.assertEqual(len(stranded_viols), 0, "Diesel train should not trigger stranded electric train hazard!")

    def test_crossover_points_deadlock_inference(self):
        """Verifies that signaling/turnout overhaul flags crossover points deadlock."""
        snt_block = Block.objects.create(
            block_code="BLK-TEST-SNT-001",
            corridor=self.corridor,
            line_type=LineType.DOWN,
            department_code=DepartmentCode.SNT,
            work_type=WorkType.TURNOUT_OVERHAUL,
            start_km=14.000,
            end_km=16.000,
            scheduled_start_time=self.now,
            scheduled_end_time=self.now + timedelta(hours=2),
            traction_power_cutoff_required=False,
        )

        violations = DigitalTwinService.run_reasoning(snt_block.id)
        deadlock_viols = [
            v for v in violations
            if v.violation_type == SemanticViolation.ViolationType.CROSSOVER_POINTS_DEADLOCK
        ]
        self.assertTrue(len(deadlock_viols) > 0, "No crossover deadlock violation detected!")
        v = deadlock_viols[0]
        self.assertEqual(v.rule_identifier, "RULE-SIGNAL-CROSSOVER-DEADLOCK-02")
        self.assertIn("flank protection", v.explanation_narrative)

    def test_func_onto_001_trigger_reasoning_endpoint(self):
        """FUNC-ONTO-001: POST /api/v1/ontology/reason/ returns HTTP 202 with job_id."""
        block = Block.objects.create(
            block_code="BLK-TEST-API-001",
            corridor=self.corridor,
            start_km=10.000,
            end_km=15.000,
            scheduled_start_time=self.now,
            scheduled_end_time=self.now + timedelta(hours=3),
            traction_power_cutoff_required=True,
        )

        response = self.client.post('/api/v1/ontology/reason/', {
            'block_id': str(block.id),
            'validate_train_paths': True,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertIn('job_id', data)
        self.assertIn('status_check_url', data)

    def test_func_onto_002_job_status_endpoint(self):
        """FUNC-ONTO-002: GET /api/v1/ontology/jobs/{job_id}/ returns job status."""
        block = Block.objects.create(
            block_code="BLK-TEST-API-002",
            corridor=self.corridor,
            start_km=10.000,
            end_km=15.000,
            scheduled_start_time=self.now,
            scheduled_end_time=self.now + timedelta(hours=3),
            traction_power_cutoff_required=True,
        )

        # Trigger reasoning
        resp = self.client.post('/api/v1/ontology/reason/', {'block_id': str(block.id)}, format='json')
        job_id = resp.json()['job_id']

        # Query status
        status_resp = self.client.get(f'/api/v1/ontology/jobs/{job_id}/')
        self.assertEqual(status_resp.status_code, status.HTTP_200_OK)
        status_data = status_resp.json()
        self.assertTrue(status_data.get('success'))
        self.assertIn(status_data['data']['status'], ['QUEUED', 'PROCESSING', 'COMPLETED'])

    def test_func_onto_003_query_violations_endpoint(self):
        """FUNC-ONTO-003: GET /api/v1/ontology/violations/?block_id=... returns violations with narrative proofs."""
        block = Block.objects.create(
            block_code="BLK-TEST-API-003",
            corridor=self.corridor,
            start_km=12.000,
            end_km=16.000,
            scheduled_start_time=self.now,
            scheduled_end_time=self.now + timedelta(hours=3),
            traction_power_cutoff_required=True,
        )

        # Run reasoning directly to generate violations
        DigitalTwinService.run_reasoning(block.id)

        # Query endpoint
        response = self.client.get(f'/api/v1/ontology/violations/?block_id={block.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertTrue(len(data['data']) > 0)
        violation = data['data'][0]
        self.assertIn('explanation_narrative', violation)
        self.assertIn('involved_owl_individuals', violation)

    def test_func_onto_004_graph_summary_endpoint(self):
        """FUNC-ONTO-004: GET /api/v1/ontology/graph/summary/ returns graph metrics."""
        response = self.client.get('/api/v1/ontology/graph/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertIn('total_classes', data['data'])
        self.assertIn('version_tag', data['data'])
