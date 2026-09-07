"""
Core Service and Telemetry Integration Tests (TSK-P4-008).
Validates home dashboard, Prometheus metrics scrape endpoint, and runtime metrics collector.
"""
from decimal import Decimal
import datetime
from django.test import TestCase, Client
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.accounts.models import DepartmentCode
from apps.blocks.models import Corridor, Block, BlockStatus, LineType, WorkType
from apps.analytics.models import CorridorDailyKPI
from apps.assets.models import TrackAsset, AssetCategory

User = get_user_model()


class PrometheusTelemetryTests(TestCase):
    """Verifies Prometheus /metrics telemetry exporter."""

    def setUp(self):
        self.client = Client()
        self.corridor = Corridor.objects.create(
            code='NDLS-CNB-METRICS',
            name='New Delhi - Kanpur Central Test Corridor',
            zone='NR',
            division='Delhi',
            start_km=Decimal('0.000'),
            end_km=Decimal('440.000')
        )

        # Create active block
        self.block = Block.objects.create(
            block_code='BLK-METRICS-001',
            corridor=self.corridor,
            line_type=LineType.UP,
            department_code=DepartmentCode.ENG,
            work_type=WorkType.TRACK_TAMPING,
            start_km=Decimal('10.000'),
            end_km=Decimal('15.000'),
            scheduled_start_time=timezone.now(),
            scheduled_end_time=timezone.now() + datetime.timedelta(hours=2),
            status=BlockStatus.ACTIVE
        )

        # Create shadow block
        self.shadow_block = Block.objects.create(
            block_code='BLK-METRICS-002',
            corridor=self.corridor,
            line_type=LineType.UP,
            department_code=DepartmentCode.TRD,
            work_type=WorkType.CATENARY_MAINTENANCE,
            start_km=Decimal('11.000'),
            end_km=Decimal('14.000'),
            scheduled_start_time=timezone.now(),
            scheduled_end_time=timezone.now() + datetime.timedelta(hours=2),
            is_shadow=True,
            parent_block=self.block,
            status=BlockStatus.ACTIVE
        )

        # Create KPI record
        self.kpi = CorridorDailyKPI.objects.create(
            metric_date=timezone.now().date(),
            corridor_code='NDLS-CNB-METRICS',
            division_code='DLI',
            corridor_punctuality_percentage=Decimal('96.80'),
            total_train_delay_minutes_incurred=45
        )

        # Create track asset
        self.asset = TrackAsset.objects.create(
            asset_tag='TRK-METRIC-ASSET-01',
            name='Test 60kg Rail Section',
            corridor=self.corridor,
            asset_category=AssetCategory.PERMANENT_WAY,
            sub_type='60KG_RAIL',
            line_type=LineType.UP,
            location_km=Decimal('12.500'),
            current_health_score=Decimal('82.5')
        )

    def test_home_page_loads(self):
        """Home page route returns HTTP 200 or 302."""
        resp = self.client.get('/')
        self.assertIn(resp.status_code, [200, 302])

    def test_prometheus_metrics_endpoint_status(self):
        """GET /metrics returns 200 with Prometheus text format."""
        resp = self.client.get('/metrics')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('text/plain', resp.headers.get('Content-Type', ''))

    def test_prometheus_metrics_telemetry_content(self):
        """Metrics payload contains active block counts, punctuality, and TQI."""
        resp = self.client.get('/metrics')
        body = resp.content.decode('utf-8')

        # Check core gauges are declared and present
        self.assertIn('railway_system_uptime_seconds', body)
        self.assertIn('railway_active_blocks_total', body)
        self.assertIn('railway_corridor_punctuality_percentage', body)
        self.assertIn('railway_co_possession_blocks_total', body)
        self.assertIn('railway_tqi_average', body)

        # Verify live values for test corridor
        self.assertIn('corridor="NDLS-CNB-METRICS"', body)
        self.assertIn('railway_co_possession_blocks_total{corridor="NDLS-CNB-METRICS"} 1.0', body)
        self.assertIn('railway_corridor_punctuality_percentage{corridor="NDLS-CNB-METRICS"} 96.8', body)
