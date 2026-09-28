"""
Master 2-Month (60-Day) Operational History Seeder for Indian Railways AI Platform.
Populates complete, mathematically consistent 60-day historical data (Aug 1 - Sep 27, 2026):
  1. CorridorDailyKPI (OLAP daily rollup for NDLS-CNB, NDLS-AGC, NDLS-GZB-UP, NDLS-GZB-DN, NDLS-CNB-MAIN)
  2. TrainLiveStatus (Per-train daily journey logs ensuring train-level punctuality consistency)
  3. BlockEfficiencyRecord (Granular work order execution audits & burst overtime records)
"""
import os
import sys
import datetime
from decimal import Decimal
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
import django
django.setup()

from apps.analytics.models import CorridorDailyKPI, BlockEfficiencyRecord
from apps.trains.models import Train, TrainLiveStatus, TrainLiveRunStatus, Station
from apps.blocks.models import Corridor, Block, BlockStatus, LineType, WorkType


def run_60_day_seeder():
    print("=" * 70)
    print("[*] SEEDING 60-DAY (2-MONTH) OPERATIONAL HISTORY INTO DATABASE")
    print("=" * 70)

    now = datetime.datetime(2026, 9, 27, 12, 0, 0)
    corridors = ['NDLS-CNB', 'NDLS-AGC', 'NDLS-GZB-UP', 'NDLS-GZB-DN', 'NDLS-CNB-MAIN']
    trains = list(Train.objects.all())
    stations = list(Station.objects.all())
    default_stn = stations[0].code if stations else 'NDLS'

    print(f"Target Corridors: {corridors}")
    print(f"Total Trains Available: {len(trains)}")
    print(f"Date Span: {(now - datetime.timedelta(days=59)).date()} to {now.date()} (60 Calendar Days)\n")

    # ------------------------------------------------------------------------
    # 1. Seed CorridorDailyKPI for 60 Days
    # ------------------------------------------------------------------------
    print("[1/3] Generating 60-day CorridorDailyKPI records across all corridors...")
    total_kpi_created = 0

    for c_code in corridors:
        for day_idx in range(60):
            day_date = (now - datetime.timedelta(days=day_idx)).date()

            # Deterministic, realistic patterns
            day_seed = (day_idx * 7 + hash(c_code)) % 100
            
            blocks_sanctioned = 8 + (day_idx % 4)  # 8, 9, 10, or 11
            blocks_requested = blocks_sanctioned + 2  # 10, 11, 12, or 13
            blocks_executed = blocks_sanctioned - (1 if day_idx % 7 == 0 else 0)
            cancelled_count = 1 if day_idx % 7 == 0 else 0

            # Realistic possession durations: ~3 hours per block
            sanctioned_mins = blocks_sanctioned * 190
            # Actual duration variance: mostly 93% to 98% utilization
            actual_mins = blocks_sanctioned * 180 + (day_idx % 5) * 8
            possession_hours = Decimal(str(round(actual_mins / 60.0, 2)))

            # Multi-department Co-Possessions & Shadow Bundling
            co_possessions = 2 + (day_idx % 3)  # 2, 3, or 4 co-possessions
            if co_possessions > blocks_sanctioned:
                co_possessions = blocks_sanctioned // 2

            shadow_blocks = co_possessions
            bundling_ratio_pct = Decimal(str(round((co_possessions / blocks_sanctioned) * 100.0, 2)))

            # Punctuality: realistically around 94.2% to 96.8%
            punctuality = Decimal('96.20') - Decimal(str((day_idx % 3) * 0.8))
            if day_idx % 5 == 1:
                punctuality = Decimal('94.60')
            elif day_idx % 5 == 3:
                punctuality = Decimal('95.40')

            # Conflict Mitigation: 91.5% to 94.0%
            mitigation_rate = Decimal('91.50') + Decimal(str((day_idx % 5) * 0.5))

            # Train Delays Incurred
            delays_incurred = 25 + (day_idx % 7) * 8

            # Track Quality Index (TQI)
            tqi_score = Decimal('24.20') + Decimal(str(round((day_idx % 6) * 0.25, 2)))

            CorridorDailyKPI.objects.update_or_create(
                metric_date=day_date,
                division_code='DLI',
                corridor_code=c_code,
                defaults={
                    'total_blocks_requested': blocks_requested,
                    'total_blocks_sanctioned': blocks_sanctioned,
                    'total_blocks_executed': blocks_executed,
                    'cancelled_blocks_count': cancelled_count,
                    'total_sanctioned_duration_minutes': sanctioned_mins,
                    'total_actual_duration_minutes': actual_mins,
                    'total_possession_hours': possession_hours,
                    'co_possession_blocks_count': co_possessions,
                    'shadow_blocks_count': shadow_blocks,
                    'shadow_bundling_ratio_pct': bundling_ratio_pct,
                    'total_train_delay_minutes_incurred': delays_incurred,
                    'corridor_punctuality_percentage': punctuality,
                    'conflict_mitigation_rate_pct': mitigation_rate,
                    'average_tqi_score': tqi_score,
                    'tqi_status': 'GOOD',
                }
            )
            total_kpi_created += 1

    print(f"  [OK] Successfully populated {total_kpi_created} daily KPI entries across 60 days.")

    # ------------------------------------------------------------------------
    # 2. Seed TrainLiveStatus records for 60 Days
    # ------------------------------------------------------------------------
    print("\n[2/3] Generating daily TrainLiveStatus journey records for 60 days...")
    train_status_count = 0
    if trains:
        for day_idx in range(60):
            day_date = (now - datetime.timedelta(days=day_idx)).date()
            for t_idx, trn in enumerate(trains):
                # Deterministic delays: ~95% on-time (< 10 mins delay), ~5% delayed (> 10 mins)
                is_delayed = ((day_idx * 3 + t_idx) % 20 == 0)
                delay_mins = (15 + (t_idx * 5) % 25) if is_delayed else ((t_idx * 2) % 6)
                status_val = TrainLiveRunStatus.DELAYED if delay_mins > 10 else TrainLiveRunStatus.ON_TIME

                TrainLiveStatus.objects.update_or_create(
                    train=trn,
                    journey_date=day_date,
                    defaults={
                        'current_station_code': default_stn,
                        'current_section': 'NDLS-CNB Main Line',
                        'current_km': Decimal(str(float((t_idx * 35) % 400))),
                        'delay_minutes': delay_mins,
                        'speed_kmh': Decimal('110.00'),
                        'status': status_val,
                    }
                )
                train_status_count += 1
        print(f"  [OK] Successfully populated {train_status_count} train journey telemetry logs.")
    else:
        print("  [SKIP] No trains found in catalog to attach journey records.")

    # ------------------------------------------------------------------------
    # 3. Seed BlockEfficiencyRecord for 60 Days
    # ------------------------------------------------------------------------
    print("\n[3/3] Generating granular BlockEfficiencyRecord audit logs...")
    eff_count = 0
    for day_idx in range(0, 60, 2):  # Every 2 days
        day_date = (now - datetime.timedelta(days=day_idx)).date()
        for b_sub in range(1, 4):
            blk_code = f"BLK-{day_date.strftime('%Y%m%d')}-0{b_sub}"
            p_hrs = Decimal('3.50') + Decimal(str(b_sub * 0.5))
            burst = Decimal('0.30') if (day_idx + b_sub) % 5 == 0 else Decimal('0.00')
            a_hrs = p_hrs + burst

            BlockEfficiencyRecord.objects.update_or_create(
                block_id=blk_code,
                defaults={
                    'corridor_code': 'NDLS-CNB',
                    'planned_hours': p_hrs,
                    'actual_hours': a_hrs,
                    'burst_hours': burst,
                    'gang_utilization_score': Decimal('96.50') if burst == 0 else Decimal('84.00'),
                    'trains_delayed_count': 1 if burst > 0 else 0,
                    'total_delay_minutes': int(burst * 60),
                }
            )
            eff_count += 1
    print(f"  [OK] Successfully populated {eff_count} granular efficiency audit records.")

    print("\n" + "=" * 70)
    print("SUCCESS: 2-MONTH (60-DAY) OPERATIONAL DEMO DATA PRIMED IN DATABASE!")
    print("=" * 70)


if __name__ == '__main__':
    run_60_day_seeder()
