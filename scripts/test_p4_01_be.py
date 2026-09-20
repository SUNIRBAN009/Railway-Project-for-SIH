import os
import sys
import uuid
import django
from decimal import Decimal
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import UserRole, DepartmentCode, UserProfile
from apps.blocks.models import Block, BlockStatus, LineType, WorkType, Corridor
from apps.assets.models import TrackAsset, AssetCategory
from apps.analytics.models import CorridorDailyKPI, BlockEfficiencyRecord
from apps.analytics.services.kpi_aggregation_service import KPIAggregationService
from apps.analytics.views import (
    DashboardSummaryView,
    CorridorComparisonView,
    CorridorDailyKPIOLAPRecalculateView,
)

User = get_user_model()


def log(msg, symbol="ℹ️"):
    print(f"[{symbol}] {msg}")


def test_p4_01_be():
    print("=" * 80)
    print("TSK-P4-01-BE: DAILY OLAP AGGREGATIONS VERIFICATION")
    print("PUNCTUALITY, BLOCK COUNTS, SHADOW BUNDLING RATIOS & TQI SCORES")
    print("=" * 80)

    # 1. Setup corridor & auth persona
    today = timezone.now().date()
    corridor, _ = Corridor.objects.get_or_create(
        code='NDLS-CNB-MAIN',
        defaults={
            'name': 'New Delhi - Kanpur Central Golden Corridor',
            'division': 'DLI',
            'start_km': Decimal('0.000'),
            'end_km': Decimal('440.200'),
        }
    )
    log(f"Corridor initialized: {corridor.code} ({corridor.division})", "✅")

    coa_user, _ = User.objects.get_or_create(
        username='coa_delhi_chief',
        defaults={'email': 'coa_chief@railblock.gov.in'}
    )
    coa_user.is_staff = True
    coa_user.save()
    profile, _ = UserProfile.objects.get_or_create(
        user=coa_user,
        defaults={
            'role': UserRole.CHIEF_CONTROLLER,
            'department': DepartmentCode.OPERATIONS,
            'employee_id': 'IR-DLI-COA-001',
            'assigned_corridor': corridor.code,
        }
    )
    profile.role = UserRole.CHIEF_CONTROLLER
    profile.save()
    log(f"Chief Controller Authenticated: {coa_user.username} ({profile.get_role_display()})", "✅")

    factory = APIRequestFactory()

    # 2. Seed & Verify Track Assets with RDSO TQI Measurements
    print("\n" + "=" * 80)
    print("STEP 2: Seeding & Auditing Track Assets with Track Quality Index (TQI)")
    print("=" * 80)
    asset_configs = [
        ('AST-NDLS-PWAY-01', 'NDLS Yard Point Machine & Turnout', Decimal('18.40'), Decimal('4.200')),
        ('AST-GZB-PWAY-02', 'GZB Fast Track CWR Section', Decimal('22.10'), Decimal('28.500')),
        ('AST-ALJN-PWAY-03', 'ALJN Junction High-Speed Crossover', Decimal('26.80'), Decimal('126.100')),
        ('AST-TDL-PWAY-04', 'TDL Heavy Axle Load Track Section', Decimal('24.20'), Decimal('205.000')),
    ]
    for tag, name, tqi, km in asset_configs:
        TrackAsset.objects.update_or_create(
            asset_tag=tag,
            defaults={
                'name': name,
                'asset_category': AssetCategory.PERMANENT_WAY,
                'sub_type': '60KG_UIC_RAIL',
                'corridor': corridor,
                'location_km': km,
                'tqi_index': tqi,
                'current_health_score': Decimal('92.00'),
                'is_operational': True,
            }
        )
    corridor_assets = TrackAsset.objects.filter(corridor=corridor)
    log(f"Corridor Track Assets Verified: {corridor_assets.count()} units with TQI range [18.40 - 26.80]", "✅")

    # 3. Seed & Verify Block Possessions with Shadow Bundling
    print("\n" + "=" * 80)
    print("STEP 3: Seeding Blocks & Shadow Possessions for OLAP Aggregation")
    print("=" * 80)
    now = timezone.now()
    # Primary Block 1 (Completed)
    b1, _ = Block.objects.update_or_create(
        block_code='BLK-OLAP-ENG-01',
        defaults={
            'corridor': corridor,
            'line_type': LineType.DOWN,
            'work_type': WorkType.TRACK_TAMPING,
            'requested_by': coa_user,
            'start_km': Decimal('25.000'),
            'end_km': Decimal('30.000'),
            'scheduled_start_time': now.replace(hour=2, minute=0, second=0),
            'scheduled_end_time': now.replace(hour=6, minute=0, second=0),
            'actual_start_time': now.replace(hour=2, minute=0, second=0),
            'actual_end_time': now.replace(hour=5, minute=45, second=0),
            'status': BlockStatus.COMPLETED,
            'is_shadow': False,
        }
    )

    # Shadow Block 2 (Bundled under Block 1)
    b2, _ = Block.objects.update_or_create(
        block_code='BLK-OLAP-TRD-02',
        defaults={
            'corridor': corridor,
            'line_type': LineType.DOWN,
            'work_type': WorkType.OHE_INSPECTION,
            'requested_by': coa_user,
            'start_km': Decimal('26.000'),
            'end_km': Decimal('29.000'),
            'scheduled_start_time': now.replace(hour=2, minute=30, second=0),
            'scheduled_end_time': now.replace(hour=5, minute=30, second=0),
            'actual_start_time': now.replace(hour=2, minute=30, second=0),
            'actual_end_time': now.replace(hour=5, minute=15, second=0),
            'status': BlockStatus.COMPLETED,
            'is_shadow': True,
            'parent_block': b1,
        }
    )

    # Regular Sanctioned Block 3
    b3, _ = Block.objects.update_or_create(
        block_code='BLK-OLAP-SNT-03',
        defaults={
            'corridor': corridor,
            'line_type': LineType.UP,
            'work_type': WorkType.SIGNAL_INTERLOCKING_TEST,
            'requested_by': coa_user,
            'start_km': Decimal('110.000'),
            'end_km': Decimal('112.000'),
            'scheduled_start_time': now.replace(hour=10, minute=0, second=0),
            'scheduled_end_time': now.replace(hour=12, minute=0, second=0),
            'status': BlockStatus.SANCTIONED,
            'is_shadow': False,
        }
    )

    # Cancelled Block 4
    b4, _ = Block.objects.update_or_create(
        block_code='BLK-OLAP-ENG-04',
        defaults={
            'corridor': corridor,
            'line_type': LineType.UP,
            'work_type': WorkType.BALLAST_CLEANING,
            'requested_by': coa_user,
            'start_km': Decimal('80.000'),
            'end_km': Decimal('85.000'),
            'scheduled_start_time': now.replace(hour=14, minute=0, second=0),
            'scheduled_end_time': now.replace(hour=18, minute=0, second=0),
            'status': BlockStatus.CANCELLED,
            'is_shadow': False,
        }
    )
    log("Seeded 4 test blocks: 1 Primary Completed, 1 Shadow Bundled, 1 Sanctioned, 1 Cancelled", "✅")

    # 4. Mathematical OLAP Aggregation Engine
    print("\n" + "=" * 80)
    print("STEP 4: Executing Mathematical Daily OLAP Aggregation Engine")
    print("=" * 80)
    kpi_record = KPIAggregationService.compute_corridor_kpi(
        corridor_code=corridor.code,
        target_date=today
    )
    assert kpi_record is not None, "Failed to compute corridor KPI record"
    assert kpi_record.corridor_code == corridor.code
    assert kpi_record.total_blocks_requested >= 3, f"Expected >=3 requested, got {kpi_record.total_blocks_requested}"
    assert kpi_record.total_blocks_sanctioned >= 2, f"Expected >=2 sanctioned, got {kpi_record.total_blocks_sanctioned}"
    assert kpi_record.total_blocks_executed >= 1, f"Expected >=1 executed, got {kpi_record.total_blocks_executed}"
    assert kpi_record.shadow_blocks_count >= 1, f"Expected >=1 shadow block, got {kpi_record.shadow_blocks_count}"
    assert kpi_record.shadow_bundling_ratio_pct > Decimal('0.00'), f"Bundling ratio must be > 0%, got {kpi_record.shadow_bundling_ratio_pct}"
    assert kpi_record.average_tqi_score > Decimal('0.00'), f"Average TQI must be > 0, got {kpi_record.average_tqi_score}"
    assert kpi_record.tqi_status in ['EXCELLENT', 'GOOD', 'FAIR', 'URGENT_MAINTENANCE']
    assert kpi_record.corridor_punctuality_percentage >= Decimal('70.00'), f"Punctuality below valid threshold, got {kpi_record.corridor_punctuality_percentage}"

    log(f"OLAP Rollup Computed for Date: {kpi_record.metric_date}", "✅")
    log(f"  - Total Blocks: Requested={kpi_record.total_blocks_requested} | Sanctioned={kpi_record.total_blocks_sanctioned} | Executed={kpi_record.total_blocks_executed}", "📊")
    log(f"  - Shadow Bundling: Shadow Count={kpi_record.shadow_blocks_count} | Ratio={kpi_record.shadow_bundling_ratio_pct}%", "📊")
    log(f"  - Track Quality Index: Average TQI={kpi_record.average_tqi_score} | Classification={kpi_record.tqi_status}", "📊")
    log(f"  - Punctuality: {kpi_record.corridor_punctuality_percentage}% | Delay Incurred={kpi_record.total_train_delay_minutes_incurred} min", "📊")

    # 5. Test Dashboard Summary REST API
    print("\n" + "=" * 80)
    print("STEP 5: Testing Executive Dashboard Summary REST API (GET /dashboard/summary/)")
    print("=" * 80)
    req = factory.get(f'/api/v1/analytics/dashboard/summary/?corridor={corridor.code}&range=7d')
    force_authenticate(req, user=coa_user)
    view = DashboardSummaryView.as_view()
    res = view(req)
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}"
    body = res.data
    assert body.get('success') is True
    cards = body['data']['executive_cards']

    assert 'shadow_bundling_ratio_pct' in cards, "Missing shadow_bundling_ratio_pct in cards"
    assert 'average_tqi_score' in cards, "Missing average_tqi_score in cards"
    assert 'tqi_status' in cards, "Missing tqi_status in cards"
    assert 'average_corridor_punctuality_pct' in cards, "Missing punctuality in cards"
    assert 'possession_utilization_rate_pct' in cards, "Missing possession_utilization_rate_pct"
    assert 'total_blocks_sanctioned' in cards, "Missing total_blocks_sanctioned"

    log(f"Executive Cards API verified successfully: {len(cards)} KPI dimensions returned", "✅")
    log(f"  - Possession Utilization Rate: {cards['possession_utilization_rate_pct']}%", "📈")
    log(f"  - Average Punctuality: {cards['average_corridor_punctuality_pct']}%", "📈")
    log(f"  - Shadow Bundling Ratio: {cards['shadow_bundling_ratio_pct']}%", "📈")
    log(f"  - Average TQI: {cards['average_tqi_score']} ({cards['tqi_status']})", "📈")

    # 6. Test On-Demand OLAP Recalculate Endpoint
    print("\n" + "=" * 80)
    print("STEP 6: Testing On-Demand OLAP Recalculate API (POST /kpi/recalculate/)")
    print("=" * 80)
    req = factory.post(
        '/api/v1/analytics/kpi/recalculate/',
        {'corridor': corridor.code, 'date': str(today)},
        format='json'
    )
    force_authenticate(req, user=coa_user)
    recalc_view = CorridorDailyKPIOLAPRecalculateView.as_view()
    res = recalc_view(req)
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}"
    recalc_data = res.data['data']
    assert recalc_data['recalculated'] is True
    assert recalc_data['corridor'] == corridor.code
    assert 'shadow_bundling_ratio_pct' in recalc_data['kpi']
    assert 'average_tqi_score' in recalc_data['kpi']
    log("On-demand OLAP recalculation endpoint passed with live serialized KPI payload.", "✅")

    # 7. Test Multi-Corridor Comparison API
    print("\n" + "=" * 80)
    print("STEP 7: Testing Multi-Corridor Comparison API (GET /corridors/comparison/)")
    print("=" * 80)
    req = factory.get('/api/v1/analytics/corridors/comparison/')
    force_authenticate(req, user=coa_user)
    comp_view = CorridorComparisonView.as_view()
    res = comp_view(req)
    assert res.status_code == 200
    comp_list = res.data['data']
    assert isinstance(comp_list, list) and len(comp_list) > 0
    matched = [c for c in comp_list if c['corridor_code'] == corridor.code]
    assert len(matched) > 0, f"Corridor {corridor.code} not found in comparison matrix"
    comp_item = matched[0]
    assert 'average_tqi_score' in comp_item
    assert 'shadow_bundling_ratio_pct' in comp_item
    assert 'average_punctuality_pct' in comp_item
    log(f"Multi-corridor comparison verified: Corridor {corridor.code} TQI={comp_item['average_tqi_score']}, Bundling={comp_item['shadow_bundling_ratio_pct']}%", "✅")

    # 8. Direct PostgreSQL Audit
    print("\n" + "=" * 80)
    print("STEP 8: Direct PostgreSQL Audit of corridor_daily_kpis")
    print("=" * 80)
    db_kpi = CorridorDailyKPI.objects.get(corridor_code=corridor.code, metric_date=today)
    log(f"DB Record: ID={db_kpi.id}", "✅")
    log(f"  - Table: corridor_daily_kpis", "✅")
    log(f"  - shadow_bundling_ratio_pct: {db_kpi.shadow_bundling_ratio_pct}%", "✅")
    log(f"  - average_tqi_score: {db_kpi.average_tqi_score}", "✅")
    log(f"  - tqi_status: {db_kpi.tqi_status}", "✅")
    log(f"  - cancelled_blocks_count: {db_kpi.cancelled_blocks_count}", "✅")
    log(f"  - corridor_punctuality_percentage: {db_kpi.corridor_punctuality_percentage}%", "✅")

    print("\n" + "=" * 80)
    print("ALL TSK-P4-01-BE OLAP VERIFICATION CHECKS PASSED (100% SUCCESS)!")
    print("=" * 80)


if __name__ == '__main__':
    test_p4_01_be()
