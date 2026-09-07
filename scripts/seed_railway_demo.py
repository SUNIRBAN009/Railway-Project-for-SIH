"""
Master Demo Data Seeder for Indian Railways AI Block Planning Platform (PS 26027).
Populates Delhi Division (NR-DLI) corridors, departmental gangs, machines, trains, blocks, and demo staff.
Usage:
    python scripts/seed_railway_demo.py
    OR
    python manage.py seed_railway_demo
"""
import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
import django
django.setup()

import datetime
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile, UserRole, DepartmentCode
from apps.blocks.models import Corridor, Block, BlockStatus, LineType, WorkType
from apps.blocks.conflict_engine import ConflictDetector
from apps.departments.models import (
    Department,
    Gang,
    MaintenanceEquipment,
    EquipmentType,
    EquipmentStatus,
    WorkOrder,
    WorkOrderStatus,
)
from apps.trains.tasks import ingest_coa_feed


def run_seeder():
    print("=" * 70)
    print("[*] INDIAN RAILWAYS AI BLOCK PLANNING PLATFORM (PS 26027)")
    print("   Master Demo Data Seeder")
    print("=" * 70)

    # ------------------------------------------------------------------------
    # 1. Seed Core Staff Personas
    # ------------------------------------------------------------------------
    print("\n[1/7] Seeding staff personas and operational roles...")
    staff_data = [
        ('coa_delhi_chief', 'Rajesh', 'Verma', 'IR-COA-1001', UserRole.CHIEF_CONTROLLER, DepartmentCode.OPERATIONS, 'DLI'),
        ('eng_track_pway', 'Amit', 'Sharma', 'NR-ENG-4921', UserRole.DEPT_ENGINEER, DepartmentCode.ENG, 'DLI'),
        ('trd_ohe_power', 'Vikram', 'Singh', 'NR-TRD-8842', UserRole.DEPT_ENGINEER, DepartmentCode.TRD, 'DLI'),
        ('snt_signal_telecom', 'Pooja', 'Mishra', 'NR-SNT-3319', UserRole.DEPT_ENGINEER, DepartmentCode.SNT, 'DLI'),
        ('sec_controller_dli', 'Sunil', 'Yadav', 'NR-OPS-2201', UserRole.SECTION_CONTROLLER, DepartmentCode.OPERATIONS, 'DLI'),
    ]

    staff_map = {}
    for username, fname, lname, empid, role, dept, div in staff_data:
        user, created = User.objects.get_or_create(username=username, defaults={
            'first_name': fname,
            'last_name': lname,
            'email': f"{username}@railnet.gov.in",
            'is_staff': True,
        })
        user.set_password('railway@123')
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.employee_id = empid
        profile.role = role
        profile.department_code = dept
        profile.division_code = div
        profile.save()
        staff_map[username] = user
        action = "Created" if created else "Updated"
        print(f"  [OK] {action} user: {username} ({role} - {dept})")

    # ------------------------------------------------------------------------
    # 2. Seed Departments
    # ------------------------------------------------------------------------
    print("\n[2/7] Seeding maintenance departments (ENG, TRD, SNT, OPERATIONS)...")
    dept_configs = [
        {
            'code': DepartmentCode.ENG,
            'name': 'Civil Engineering (Track / P-Way / Bridges)',
            'headquarters_division': 'DLI',
            'contact_email': 'srden.coor@nr.railnet.gov.in',
            'escalation_phone': '+91-11-23340001',
        },
        {
            'code': DepartmentCode.TRD,
            'name': 'Traction Distribution (25kV AC OHE / Power)',
            'headquarters_division': 'DLI',
            'contact_email': 'srdee.trd@nr.railnet.gov.in',
            'escalation_phone': '+91-11-23340002',
        },
        {
            'code': DepartmentCode.SNT,
            'name': 'Signal & Telecommunication (Interlocking & Points)',
            'headquarters_division': 'DLI',
            'contact_email': 'srdste.coor@nr.railnet.gov.in',
            'escalation_phone': '+91-11-23340003',
        },
        {
            'code': DepartmentCode.OPERATIONS,
            'name': 'Traffic & Control Office (COA / Operating)',
            'headquarters_division': 'DLI',
            'contact_email': 'srdom.coor@nr.railnet.gov.in',
            'escalation_phone': '+91-11-23340004',
        },
    ]

    dept_map = {}
    for d_conf in dept_configs:
        dept_obj, _ = Department.objects.update_or_create(
            code=d_conf['code'],
            defaults={
                'name': d_conf['name'],
                'headquarters_division': d_conf['headquarters_division'],
                'contact_email': d_conf['contact_email'],
                'escalation_phone': d_conf['escalation_phone'],
            }
        )
        dept_map[d_conf['code']] = dept_obj
        print(f"  [OK] Department ready: {dept_obj.code} - {dept_obj.name}")

    # ------------------------------------------------------------------------
    # 3. Seed Corridors
    # ------------------------------------------------------------------------
    print("\n[3/7] Seeding operational corridors (Delhi Division)...")
    corridor_configs = [
        {
            'code': 'NDLS-GZB-UP',
            'name': 'New Delhi - Ghaziabad Up Main Line',
            'zone': 'NR',
            'division': 'DLI',
            'source_station': 'NDLS',
            'destination_station': 'GZB',
            'start_km': Decimal('0.000'),
            'end_km': Decimal('28.500'),
            'is_electrified': True,
            'max_permissible_speed_kmh': 130,
        },
        {
            'code': 'NDLS-GZB-DN',
            'name': 'New Delhi - Ghaziabad Down Main Line',
            'zone': 'NR',
            'division': 'DLI',
            'source_station': 'NDLS',
            'destination_station': 'GZB',
            'start_km': Decimal('0.000'),
            'end_km': Decimal('28.500'),
            'is_electrified': True,
            'max_permissible_speed_kmh': 130,
        },
        {
            'code': 'GZB-ALJN-DN',
            'name': 'Ghaziabad - Aligarh Down Main Line',
            'zone': 'NCR',
            'division': 'PRYJ',
            'source_station': 'GZB',
            'destination_station': 'ALJN',
            'start_km': Decimal('28.500'),
            'end_km': Decimal('126.000'),
            'is_electrified': True,
            'max_permissible_speed_kmh': 160,
        }
    ]

    corridor_map = {}
    for c_conf in corridor_configs:
        corr_obj, _ = Corridor.objects.update_or_create(
            code=c_conf['code'],
            defaults=c_conf
        )
        corridor_map[c_conf['code']] = corr_obj
        print(f"  [OK] Corridor ready: {corr_obj.code} ({corr_obj.total_length_km} km)")

    # ------------------------------------------------------------------------
    # 4. Seed Gangs & Heavy Equipment
    # ------------------------------------------------------------------------
    print("\n[4/7] Seeding maintenance gangs and heavy track machines...")
    gang_configs = [
        {
            'gang_number': 'GANG-ENG-PWAY-04',
            'department': dept_map[DepartmentCode.ENG],
            'supervisor': staff_map['eng_track_pway'],
            'headquarters_station': 'SBB',
            'crew_strength': 14,
            'assigned_section_start_km': Decimal('0.0'),
            'assigned_section_end_km': Decimal('28.5'),
        },
        {
            'gang_number': 'GANG-TRD-OHE-02',
            'department': dept_map[DepartmentCode.TRD],
            'supervisor': staff_map['trd_ohe_power'],
            'headquarters_station': 'GZB',
            'crew_strength': 10,
            'assigned_section_start_km': Decimal('10.0'),
            'assigned_section_end_km': Decimal('45.0'),
        },
        {
            'gang_number': 'GANG-SNT-SIG-01',
            'department': dept_map[DepartmentCode.SNT],
            'supervisor': staff_map['snt_signal_telecom'],
            'headquarters_station': 'NDLS',
            'crew_strength': 8,
            'assigned_section_start_km': Decimal('0.0'),
            'assigned_section_end_km': Decimal('15.0'),
        },
    ]

    gang_map = {}
    for g_conf in gang_configs:
        gang_obj, _ = Gang.objects.update_or_create(
            gang_number=g_conf['gang_number'],
            defaults=g_conf
        )
        gang_map[g_conf['gang_number']] = gang_obj
        print(f"  [OK] Gang registered: {gang_obj.gang_number} ({gang_obj.crew_strength} crew @ {gang_obj.headquarters_station})")

    today = timezone.now().date()
    equipment_configs = [
        {
            'equipment_code': 'BCM-NR-104',
            'equipment_name': 'Plasser RM-80 Ballast Cleaning Machine',
            'equipment_type': EquipmentType.BALLAST_CLEANER_BCM,
            'department': dept_map[DepartmentCode.ENG],
            'home_depot': 'GZB',
            'current_location_km': Decimal('12.4'),
            'operational_status': EquipmentStatus.AVAILABLE,
            'fitness_expiry_date': today + datetime.timedelta(days=180),
        },
        {
            'equipment_code': 'CSM-NR-092',
            'equipment_name': 'Plasser 09-32 CSM Continuous Track Tamper',
            'equipment_type': EquipmentType.TRACK_TAMPER_CSM,
            'department': dept_map[DepartmentCode.ENG],
            'home_depot': 'NDLS',
            'current_location_km': Decimal('5.0'),
            'operational_status': EquipmentStatus.AVAILABLE,
            'fitness_expiry_date': today + datetime.timedelta(days=120),
        },
        {
            'equipment_code': 'TW-NR-8812',
            'equipment_name': '8-Wheeler High-Speed OHE Tower Wagon',
            'equipment_type': EquipmentType.OHE_TOWER_WAGON,
            'department': dept_map[DepartmentCode.TRD],
            'home_depot': 'GZB',
            'current_location_km': Decimal('15.0'),
            'operational_status': EquipmentStatus.AVAILABLE,
            'fitness_expiry_date': today + datetime.timedelta(days=90),
        },
        {
            'equipment_code': 'USFD-NR-03',
            'equipment_name': 'Ultrasonic Flaw Detection Digital Trolley',
            'equipment_type': EquipmentType.USFD_TROLLEY,
            'department': dept_map[DepartmentCode.ENG],
            'home_depot': 'NDLS',
            'current_location_km': Decimal('0.0'),
            'operational_status': EquipmentStatus.AVAILABLE,
            'fitness_expiry_date': today + datetime.timedelta(days=365),
        },
    ]

    equipment_map = {}
    for eq_conf in equipment_configs:
        eq_obj, _ = MaintenanceEquipment.objects.update_or_create(
            equipment_code=eq_conf['equipment_code'],
            defaults=eq_conf
        )
        equipment_map[eq_conf['equipment_code']] = eq_obj
        print(f"  [OK] Track Machine ready: {eq_obj.equipment_code} ({eq_obj.equipment_name})")

    # ------------------------------------------------------------------------
    # 5. Ingest Live Trains & Timetables (SVC-TRN)
    # ------------------------------------------------------------------------
    print("\n[5/7] Ingesting Control Office Application (COA) live train feed...")
    coa_summary = ingest_coa_feed()
    print(f"  [OK] COA Feed ingested: {coa_summary['trains_processed']} trains, "
          f"{coa_summary['schedules_created']} station schedules, "
          f"{coa_summary['live_positions_updated']} live telemetry tracking records.")

    # ------------------------------------------------------------------------
    # 6. Seed Demonstration Maintenance Blocks (SVC-BLK)
    # ------------------------------------------------------------------------
    print("\n[6/7] Generating demonstration maintenance blocks & running conflict sweeps...")
    now = timezone.now()
    tomorrow = now + datetime.timedelta(days=1)

    # Window 1: Night possession (01:30 - 04:30) - Primary ENG Block
    t1_start = tomorrow.replace(hour=1, minute=30, second=0, microsecond=0)
    t1_end = tomorrow.replace(hour=4, minute=30, second=0, microsecond=0)

    # Block 1: Sanctioned ENG Track Tamping
    b1, _ = Block.objects.update_or_create(
        block_code='BLK-DEMO-ENG-001',
        defaults={
            'corridor': corridor_map['NDLS-GZB-UP'],
            'line_type': LineType.UP,
            'department_code': DepartmentCode.ENG,
            'work_type': WorkType.TRACK_TAMPING,
            'requested_by': staff_map['eng_track_pway'],
            'gang_id': 'GANG-ENG-PWAY-04',
            'equipment_required': 'CSM-NR-092 Track Tamper',
            'start_km': Decimal('12.000'),
            'end_km': Decimal('16.000'),
            'scheduled_start_time': t1_start,
            'scheduled_end_time': t1_end,
            'traction_power_cutoff_required': False,
            'status': BlockStatus.SANCTIONED,
            'sanctioned_by': staff_map['coa_delhi_chief'],
            'sanctioned_at': now,
            'work_description': 'CSM mechanized track packing and longitudinal level adjustment.',
        }
    )

    # Block 2: TRD Shadow Block co-possession on same line & window
    t2_start = t1_start + datetime.timedelta(minutes=15)
    t2_end = t1_end - datetime.timedelta(minutes=15)
    b2, _ = Block.objects.update_or_create(
        block_code='BLK-DEMO-TRD-001',
        defaults={
            'corridor': corridor_map['NDLS-GZB-UP'],
            'line_type': LineType.UP,
            'department_code': DepartmentCode.TRD,
            'work_type': WorkType.CATENARY_MAINTENANCE,
            'requested_by': staff_map['trd_ohe_power'],
            'gang_id': 'GANG-TRD-OHE-02',
            'equipment_required': 'TW-NR-8812 Tower Wagon',
            'start_km': Decimal('13.000'),
            'end_km': Decimal('15.500'),
            'scheduled_start_time': t2_start,
            'scheduled_end_time': t2_end,
            'traction_power_cutoff_required': True,
            'status': BlockStatus.COORDINATED,
            'work_description': 'Shadow-Block possession for OHE contact wire height measurement and dropper adjustment.',
        }
    )

    # Block 3: Active Live Possession with Caution Order
    t3_start = now - datetime.timedelta(hours=1)
    t3_end = now + datetime.timedelta(hours=2)
    b3, _ = Block.objects.update_or_create(
        block_code='BLK-DEMO-ENG-002',
        defaults={
            'corridor': corridor_map['NDLS-GZB-DN'],
            'line_type': LineType.DOWN,
            'department_code': DepartmentCode.ENG,
            'work_type': WorkType.BALLAST_CLEANING,
            'requested_by': staff_map['eng_track_pway'],
            'gang_id': 'GANG-ENG-PWAY-04',
            'equipment_required': 'BCM-NR-104 Ballast Cleaner',
            'start_km': Decimal('5.000'),
            'end_km': Decimal('7.500'),
            'scheduled_start_time': t3_start,
            'scheduled_end_time': t3_end,
            'actual_start_time': t3_start,
            'caution_order_id': 'CO-NDLS-2026-089',
            'status': BlockStatus.ACTIVE,
            'sanctioned_by': staff_map['coa_delhi_chief'],
            'sanctioned_at': now - datetime.timedelta(hours=2),
            'work_description': 'Deep screening of ballast bed with RM-80 machine. Caution order 30 km/h in effect.',
        }
    )

    # Block 4: Pending Approval SNT Block
    t4_start = tomorrow.replace(hour=11, minute=0, second=0, microsecond=0)
    t4_end = tomorrow.replace(hour=13, minute=0, second=0, microsecond=0)
    b4, _ = Block.objects.update_or_create(
        block_code='BLK-DEMO-SNT-001',
        defaults={
            'corridor': corridor_map['NDLS-GZB-UP'],
            'line_type': LineType.UP,
            'department_code': DepartmentCode.SNT,
            'work_type': WorkType.SIGNAL_INTERLOCKING_TEST,
            'requested_by': staff_map['snt_signal_telecom'],
            'gang_id': 'GANG-SNT-SIG-01',
            'equipment_required': 'Point Machine Testing Rig',
            'start_km': Decimal('28.000'),
            'end_km': Decimal('28.500'),
            'scheduled_start_time': t4_start,
            'scheduled_end_time': t4_end,
            'status': BlockStatus.PENDING_APPROVAL,
            'work_description': 'GZB East Cabin Point 104 Electronic Interlocking testing.',
        }
    )

    # Run sweep-line detector on all blocks
    for blk in [b1, b2, b3, b4]:
        detector = ConflictDetector(blk)
        res = detector.run_sweep()
        print(f"  [OK] Block {blk.block_code} evaluated: status={blk.status}, "
              f"conflicts={res.get('total_conflicts', 0)}, shadow_opps={res.get('shadow_opportunities', 0)}")

    # ------------------------------------------------------------------------
    # 7. Seed Departmental Work Orders (SVC-DEPT)
    # ------------------------------------------------------------------------
    print("\n[7/7] Generating departmental work orders and gang reservations...")
    today_str = now.strftime('%Y%m%d')

    wo1, _ = WorkOrder.objects.update_or_create(
        order_number=f"WO-{today_str}-ENG-001",
        defaults={
            'block': b1,
            'department': dept_map[DepartmentCode.ENG],
            'gang': gang_map['GANG-ENG-PWAY-04'],
            'equipment': equipment_map['CSM-NR-092'],
            'planned_work_scope': 'Tamping of 4.0 km Up line track between KM 12.0 and 16.0',
            'target_metric_units': Decimal('4000.00'),
            'status': WorkOrderStatus.PENDING,
        }
    )

    wo2, _ = WorkOrder.objects.update_or_create(
        order_number=f"WO-{today_str}-TRD-001",
        defaults={
            'block': b2,
            'department': dept_map[DepartmentCode.TRD],
            'gang': gang_map['GANG-TRD-OHE-02'],
            'equipment': equipment_map['TW-NR-8812'],
            'planned_work_scope': 'Shadow-block OHE contact wire examination and dropper replacement',
            'target_metric_units': Decimal('2500.00'),
            'status': WorkOrderStatus.MOBILIZING,
        }
    )

    wo3, _ = WorkOrder.objects.update_or_create(
        order_number=f"WO-{today_str}-ENG-002",
        defaults={
            'block': b3,
            'department': dept_map[DepartmentCode.ENG],
            'gang': gang_map['GANG-ENG-PWAY-04'],
            'equipment': equipment_map['BCM-NR-104'],
            'planned_work_scope': 'Deep ballast screening KM 5.0 to 7.5 under 30 km/h Caution Order',
            'target_metric_units': Decimal('2500.00'),
            'status': WorkOrderStatus.ON_SITE,
        }
    )
    print(f"  [OK] Work Order issued: {wo1.order_number} ({wo1.status})")
    print(f"  [OK] Work Order issued: {wo2.order_number} ({wo2.status})")
    print(f"  [OK] Work Order issued: {wo3.order_number} ({wo3.status})")

    # ------------------------------------------------------------------------
    # 8. Seed Asset Inventory & Health (SVC-AST)
    # ------------------------------------------------------------------------
    print("\n[8/10] Seeding physical track assets & ultrasonic defect logs...")
    from apps.assets.models import TrackAsset, AssetDefectLog, AssetCategory, DefectSeverity, DefectType

    assets_data = [
        ('TRK-NDLS-GZB-01', 'Continuous Welded Rail (60kg UIC)', AssetCategory.PERMANENT_WAY, '60kg_90UTS_RAIL', Decimal('12.400'), Decimal('88.5'), Decimal('22.4')),
        ('PNT-GZB-E104', 'High-Speed Thick Web Turnout 1:12', AssetCategory.PERMANENT_WAY, 'TURNOUT_1_IN_12', Decimal('28.200'), Decimal('92.0'), Decimal('18.0')),
        ('OHE-CAN-NDLS-14', '25kV AC Cantilever Assembly Mast 14', AssetCategory.OHE_TRACTION, 'OHE_CANTILEVER', Decimal('14.200'), Decimal('95.0'), Decimal('12.0')),
        ('SIG-TC-NDLS-09', 'High-Frequency Digital Track Circuit', AssetCategory.SIGNAL_INTERLOCKING, 'TRACK_CIRCUIT_AF', Decimal('15.500'), Decimal('78.0'), Decimal('32.0')),
    ]

    target_corridor = corridor_map.get('NDLS-GZB-UP') or Corridor.objects.first()
    for tag, name, cat, subtype, loc_km, health, tqi in assets_data:
        asset, created = TrackAsset.objects.update_or_create(
            asset_tag=tag,
            defaults={
                'name': name,
                'corridor': target_corridor,
                'asset_category': cat,
                'sub_type': subtype,
                'line_type': LineType.UP,
                'location_km': loc_km,
                'current_health_score': health,
                'tqi_index': tqi,
                'is_operational': True,
            }
        )
        act = "Created" if created else "Updated"
        print(f"  [OK] {act} Track Asset: {tag} ({cat} - Health: {health})")

    # ------------------------------------------------------------------------
    # 9. Seed Historical Analytics Mart (SVC-ANA)
    # ------------------------------------------------------------------------
    print("\n[9/10] Seeding 14-day historical OLAP KPI mart & block efficiency logs...")
    from apps.analytics.models import CorridorDailyKPI, BlockEfficiencyRecord

    corridors_to_seed = ['NDLS-CNB', 'NDLS-AGC']
    for c_code in corridors_to_seed:
        for i in range(14):
            day_date = (now - datetime.timedelta(days=i)).date()
            base_punctuality = Decimal('96.20') - Decimal(str(i % 3 * 0.8))
            blocks_sanctioned = 8 + (i % 4)
            actual_mins = blocks_sanctioned * 180 + (i * 12)
            sanctioned_mins = blocks_sanctioned * 190
            co_possessions = 2 + (i % 3)

            CorridorDailyKPI.objects.update_or_create(
                metric_date=day_date,
                division_code='DLI',
                corridor_code=c_code,
                defaults={
                    'total_blocks_requested': blocks_sanctioned + 2,
                    'total_blocks_sanctioned': blocks_sanctioned,
                    'total_blocks_executed': blocks_sanctioned - (1 if i % 5 == 0 else 0),
                    'total_sanctioned_duration_minutes': sanctioned_mins,
                    'total_actual_duration_minutes': actual_mins,
                    'total_possession_hours': Decimal(str(round(actual_mins / 60.0, 2))),
                    'co_possession_blocks_count': co_possessions,
                    'total_train_delay_minutes_incurred': 25 + (i * 8),
                    'corridor_punctuality_percentage': base_punctuality,
                    'conflict_mitigation_rate_pct': Decimal('91.50') + Decimal(str((i % 5) * 0.5)),
                    'shadow_blocks_count': co_possessions,
                }
            )

    # Seed Block Efficiency Audit Records
    for blk_code, p_hrs, a_hrs, burst in [('26027-BLK-01', 4.0, 4.0, 0.0), ('26027-BLK-02', 3.5, 3.5, 0.0), ('26027-BLK-03', 4.0, 4.4, 0.4)]:
        BlockEfficiencyRecord.objects.update_or_create(
            block_id=blk_code,
            defaults={
                'corridor_code': 'NDLS-CNB',
                'planned_hours': Decimal(str(p_hrs)),
                'actual_hours': Decimal(str(a_hrs)),
                'burst_hours': Decimal(str(burst)),
                'gang_utilization_score': Decimal('95.00') if burst == 0 else Decimal('82.50'),
                'trains_delayed_count': 1 if burst > 0 else 0,
                'total_delay_minutes': int(burst * 60),
            }
        )
    print("  [OK] 14-day CorridorDailyKPI mart and BlockEfficiencyRecords seeded.")

    # ------------------------------------------------------------------------
    # 10. Seed Operational Notifications (SVC-NOTIF)
    # ------------------------------------------------------------------------
    print("\n[10/10] Seeding operational dispatch notifications & alerts...")
    from apps.notifications.services.dispatcher import NotificationDispatcher
    from apps.notifications.models import NotificationPriority, NotificationCategory

    dispatcher = NotificationDispatcher()
    dispatcher.dispatch(
        title="Block Sanctioned: Up Line Tamping",
        message_body="Block 26027-BLK-01 sanctioned KM 12.0 - 16.0. Caution Order 45 km/h enforced.",
        recipient_user=staff_map.get('coa_delhi_chief'),
        recipient_role='CHIEF_CONTROLLER',
        priority=NotificationPriority.URGENT_ACTION,
        category=NotificationCategory.BLOCK_SANCTIONED,
        corridor_code='NDLS-CNB',
    )
    dispatcher.dispatch(
        title="Integrated Shadow Block Coordinated",
        message_body="TRD OHE inspection block 26027-BLK-02 successfully bundled inside ENG window.",
        recipient_user=staff_map.get('trd_ohe_power'),
        recipient_role='DEPT_ENGINEER',
        priority=NotificationPriority.ROUTINE_INFO,
        category=NotificationCategory.GENERAL_INFO,
        corridor_code='NDLS-CNB',
    )
    print("  [OK] Operational notifications and WebSocket events initialized.")

    print("\n" + "=" * 70)
    print("[DONE] MASTER SEEDING COMPLETE! RailBlock AI Platform is fully primed.")
    print("   Credentials: username='coa_delhi_chief' | password='railway@123'")
    print("   Credentials: username='eng_track_pway'  | password='railway@123'")
    print("   Credentials: username='trd_ohe_power'   | password='railway@123'")
    print("   Credentials: username='snt_signal_telecom' | password='railway@123'")
    print("=" * 70)


if __name__ == '__main__':
    run_seeder()

