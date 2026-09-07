"""
Comprehensive Unit & Integration Tests for Operations Analytics Service (SVC-ANA).
Covers TSK-P4-001 (OLAP KPI Mart), TSK-P4-002 (Dashboard Summary API),
TSK-P4-003 (Celery Beat Rollup Task), and TSK-P4-004 (Executive PDF Export).
"""
import datetime
from decimal import Decimal
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.analytics.models import CorridorDailyKPI, BlockEfficiencyRecord
from apps.analytics.services.kpi_aggregation_service import KPIAggregationService
from apps.analytics.services.pdf_report_service import ExecutivePDFReportGenerator
from apps.analytics.tasks import rollup_corridor_daily_kpis_task, materialize_block_efficiency_task
from apps.blocks.models import Corridor, Block, BlockStatus, LineType, WorkType

User = get_user_model()


class KPIAggregationServiceTests(TestCase):
    """Tests for KPIAggregationService mathematical and analytical computations (TSK-P4-001 / TSK-P4-002)."""

    def setUp(self):
        self.user = User.objects.create_user(username='analytics_user', password='password123')
        self.corridor = Corridor.objects.create(
            code='NDLS-GZB-UP',
            name='New Delhi - Ghaziabad Up Main Line',
            division='DLI',
            start_km=Decimal('0.000'),
            end_km=Decimal('28.500'),
        )
        self.now = timezone.now()
        self.target_date = self.now.date()

        # Create a sanctioned block
        self.block1 = Block.objects.create(
            block_code='BLK-TEST-ANA-01',
            corridor=self.corridor,
            line_type=LineType.UP,
            work_type=WorkType.TRACK_TAMPING,
            requested_by=self.user,
            start_km=Decimal('10.000'),
            end_km=Decimal('15.000'),
            scheduled_start_time=self.now,
            scheduled_end_time=self.now + datetime.timedelta(hours=4),
            status=BlockStatus.COMPLETED,
            is_shadow=True,
        )

    def test_compute_corridor_kpi(self):
        kpi = KPIAggregationService.compute_corridor_kpi(
            corridor_code='NDLS-GZB-UP',
            target_date=self.target_date
        )
        self.assertIsNotNone(kpi)
        self.assertEqual(kpi.corridor_code, 'NDLS-GZB-UP')
        self.assertEqual(kpi.division_code, 'DLI')
        self.assertEqual(kpi.total_blocks_requested, 1)
        self.assertEqual(kpi.total_blocks_sanctioned, 1)
        self.assertEqual(kpi.total_blocks_executed, 1)
        self.assertGreater(kpi.total_sanctioned_duration_minutes, 0)
        self.assertEqual(kpi.co_possession_blocks_count, 1)
        self.assertGreaterEqual(kpi.corridor_punctuality_percentage, Decimal('0.00'))

    def test_get_dashboard_summary(self):
        # Pre-seed a KPI record
        CorridorDailyKPI.objects.create(
            metric_date=self.target_date,
            division_code='DLI',
            corridor_code='NDLS-CNB',
            total_blocks_requested=10,
            total_blocks_sanctioned=8,
            total_blocks_executed=8,
            total_sanctioned_duration_minutes=1440,
            total_actual_duration_minutes=1400,
            total_possession_hours=Decimal('23.33'),
            co_possession_blocks_count=3,
            total_train_delay_minutes_incurred=40,
            corridor_punctuality_percentage=Decimal('96.50'),
            conflict_mitigation_rate_pct=Decimal('92.00'),
        )

        summary = KPIAggregationService.get_dashboard_summary(
            division_code='DLI',
            corridor_code='NDLS-CNB',
            days_range=7
        )
        self.assertIn('executive_cards', summary)
        cards = summary['executive_cards']
        self.assertIn('possession_utilization_rate_pct', cards)
        self.assertIn('average_corridor_punctuality_pct', cards)
        self.assertIn('co_possession_hours_saved', cards)
        self.assertGreater(cards['possession_utilization_rate_pct'], 0)
        self.assertEqual(cards['co_possession_blocks_count'], 3)
        self.assertGreaterEqual(len(summary['trend']), 1)

    def test_get_corridor_comparison(self):
        CorridorDailyKPI.objects.create(
            metric_date=self.target_date,
            division_code='DLI',
            corridor_code='NDLS-CNB',
            corridor_punctuality_percentage=Decimal('97.20'),
            total_possession_hours=Decimal('20.00')
        )
        comparison = KPIAggregationService.get_corridor_comparison()
        self.assertIsInstance(comparison, list)
        self.assertGreaterEqual(len(comparison), 1)
        self.assertEqual(comparison[0]['corridor_code'], 'NDLS-CNB')

    def test_get_block_efficiency_records(self):
        BlockEfficiencyRecord.objects.create(
            block_id='BLK-TEST-ANA-01',
            corridor_code='NDLS-GZB-UP',
            planned_hours=Decimal('4.00'),
            actual_hours=Decimal('4.20'),
            burst_hours=Decimal('0.20'),
            gang_utilization_score=Decimal('92.00'),
            trains_delayed_count=1,
            total_delay_minutes=12
        )
        records = KPIAggregationService.get_block_efficiency_records(corridor_code='NDLS-GZB-UP')
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['block_id'], 'BLK-TEST-ANA-01')
        self.assertEqual(records[0]['burst_hours'], 0.20)


class AnalyticsAPITests(TestCase):
    """Tests for Analytics REST endpoints (TSK-P4-002 / TSK-P4-004)."""

    def setUp(self):
        self.user = User.objects.create_user(username='api_evaluator', password='password123')
        self.client.login(username='api_evaluator', password='password123')

        CorridorDailyKPI.objects.create(
            metric_date=timezone.now().date(),
            division_code='DLI',
            corridor_code='NDLS-CNB',
            total_blocks_requested=5,
            total_blocks_sanctioned=5,
            total_blocks_executed=5,
            total_sanctioned_duration_minutes=900,
            total_actual_duration_minutes=880,
            total_possession_hours=Decimal('14.67'),
            co_possession_blocks_count=2,
            total_train_delay_minutes_incurred=15,
            corridor_punctuality_percentage=Decimal('98.00'),
        )

    def test_dashboard_summary_endpoint(self):
        url = reverse('analytics:dashboard_summary')
        response = self.client.get(url, {'corridor': 'NDLS-CNB', 'range': '7d'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('executive_cards', data['data'])

    def test_corridor_comparison_endpoint(self):
        url = reverse('analytics:corridor_comparison')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIsInstance(data['data'], list)

    def test_block_efficiency_endpoint(self):
        url = reverse('analytics:block_efficiency')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

    def test_report_export_pdf_endpoint(self):
        url = reverse('analytics:report_export')
        response = self.client.get(url, {'type': 'PDF', 'corridor': 'NDLS-CNB'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment;', response['Content-Disposition'])
        self.assertTrue(len(response.content) > 1000)


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class AnalyticsTasksTests(TestCase):
    """Tests for Celery tasks in apps.analytics (TSK-P4-003)."""

    def setUp(self):
        self.corridor = Corridor.objects.create(
            code='NDLS-CNB',
            name='New Delhi - Kanpur Central',
            division='DLI'
        )
        self.user = User.objects.create_user(username='task_user', password='password123')
        self.now = timezone.now()

        self.block = Block.objects.create(
            block_code='BLK-TASK-001',
            corridor=self.corridor,
            line_type=LineType.UP,
            work_type=WorkType.TRACK_TAMPING,
            requested_by=self.user,
            start_km=Decimal('10.000'),
            end_km=Decimal('15.000'),
            scheduled_start_time=self.now,
            scheduled_end_time=self.now + datetime.timedelta(hours=3),
            actual_start_time=self.now,
            actual_end_time=self.now + datetime.timedelta(hours=3, minutes=30),
            status=BlockStatus.COMPLETED,
        )

    def test_rollup_corridor_daily_kpis_task(self):
        count = rollup_corridor_daily_kpis_task()
        self.assertGreaterEqual(count, 1)

    def test_materialize_block_efficiency_task(self):
        rec_id = materialize_block_efficiency_task(self.block.block_code)
        self.assertIsNotNone(rec_id)
        record = BlockEfficiencyRecord.objects.get(id=rec_id)
        self.assertEqual(record.planned_hours, Decimal('3.00'))
        self.assertEqual(record.actual_hours, Decimal('3.50'))
        self.assertEqual(record.burst_hours, Decimal('0.50'))
        self.assertEqual(record.trains_delayed_count, 1)
