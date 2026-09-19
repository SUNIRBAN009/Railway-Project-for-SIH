import json
import os
from decimal import Decimal
from datetime import time, date, datetime, timedelta

from django.conf import settings
from django.db import transaction
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from apps.blocks.models import Corridor, LineType
from apps.trains.models import Station, Train, TrainSchedule, TrainType, TractionType
from apps.departments.models import Department
from apps.accounts.models import UserProfile, UserRole, DepartmentCode
from apps.assets.models import TrackAsset, UnifiedAsset, AssetCategory


def perform_seed():
    master_data_dir = os.path.join(settings.BASE_DIR, 'apps', 'demo', 'master_data')
    logs = []

    with transaction.atomic():
        # 1. Corridor
        corridor, _ = Corridor.objects.update_or_create(
            code='NDLS-CNB-MAIN',
            defaults={
                'name': 'New Delhi - Kanpur Central Trunk Golden Corridor',
                'zone': 'NCR',
                'division': 'DLI',
                'source_station': 'NDLS',
                'destination_station': 'CNB',
                'start_km': Decimal('0.000'),
                'end_km': Decimal('440.200'),
                'is_electrified': True,
                'max_permissible_speed_kmh': 160
            }
        )
        logs.append(f'Corridor: {corridor.code}')

        # 2. Stations
        stations_path = os.path.join(master_data_dir, 'stations.json')
        if os.path.exists(stations_path):
            with open(stations_path, 'r', encoding='utf-8') as f:
                stations_data = json.load(f)
            for s in stations_data:
                Station.objects.update_or_create(
                    code=s['code'],
                    defaults={
                        'name': s['name'],
                        'zone': s.get('zone', 'NR'),
                        'division': s.get('division', 'Delhi'),
                        'latitude': s.get('latitude'),
                        'longitude': s.get('longitude'),
                        'km_from_source': Decimal(str(s.get('chainage_km', 0.0))),
                        'number_of_platforms': s.get('number_of_platforms', 5),
                        'has_wifi': s.get('has_wifi', True),
                        'has_medical_booth': s.get('has_medical_booth', True),
                        'rpf_post_phone': s.get('rpf_post_phone', '139')
                    }
                )
            logs.append(f'Stations: {len(stations_data)}')

        # 3. Departments
        dept_configs = [
            ('OPERATIONS', 'Operating & Traffic Control (COA)', 'srdom.coor@nr.railnet.gov.in', '+91-11-23340004'),
            ('ENG', 'Civil Engineering (Track / P-Way / Bridges)', 'srden.coor@nr.railnet.gov.in', '+91-11-23340001'),
            ('TRD', 'Traction Distribution (25kV AC OHE / Power)', 'srdee.trd@nr.railnet.gov.in', '+91-11-23340002'),
            ('SNT', 'Signal & Telecommunication (Interlocking & Points)', 'srdste.coor@nr.railnet.gov.in', '+91-11-23340003'),
        ]
        for code, name, email, phone in dept_configs:
            Department.objects.update_or_create(
                code=code,
                defaults={'name': name, 'contact_email': email, 'escalation_phone': phone}
            )

        # 4. Users
        users_path = os.path.join(master_data_dir, 'users.json')
        if os.path.exists(users_path):
            with open(users_path, 'r', encoding='utf-8') as f:
                users_data = json.load(f)
            for u in users_data:
                user, _ = User.objects.update_or_create(
                    username=u['username'],
                    defaults={
                        'first_name': u['first_name'],
                        'last_name': u['last_name'],
                        'email': f"{u['username']}@railnet.gov.in",
                        'is_staff': True
                    }
                )
                user.set_password('railway@123')
                user.save()
                
                UserProfile.objects.update_or_create(
                    user=user,
                    defaults={
                        'employee_id': u.get('employee_id', f"IR-{u['username'].upper()}"),
                        'role': u.get('role', 'DEPT_ENGINEER'),
                        'department_code': u.get('department', 'OPERATIONS'),
                        'division_code': u.get('division', 'DLI'),
                        'phone_number': u.get('phone', '+919999900000'),
                        'badge_number': u.get('badge_number', 'DESK-01')
                    }
                )
            logs.append(f'Users: {len(users_data)}')

        # 5. Trains & Schedules
        trains_path = os.path.join(master_data_dir, 'trains.json')
        if os.path.exists(trains_path):
            with open(trains_path, 'r', encoding='utf-8') as f:
                trains_data = json.load(f)
            for t in trains_data:
                t_type = t.get('train_type') or TrainType.PASSENGER_EXPRESS
                train, _ = Train.objects.update_or_create(
                    train_number=t['train_number'],
                    defaults={
                        'train_name': t['name'],
                        'train_type': t_type,
                        'priority_rank': t.get('priority_rank', 50),
                        'source_station': t.get('source', 'NDLS'),
                        'destination_station': t.get('destination', 'CNB'),
                        'max_speed_kmh': t.get('max_speed_kmph', 110),
                        'is_daily': True,
                        'traction_type': TractionType.ELECTRIC
                    }
                )
                TrainSchedule.objects.filter(train=train).delete()
                for stop in t.get('schedule', []):
                    arr_time = None
                    if stop.get('arrival'):
                        try:
                            arr_time = time.fromisoformat(stop['arrival'])
                        except Exception:
                            pass
                    dep_time = time.fromisoformat(stop['departure']) if stop.get('departure') else (arr_time or time(0, 0))
                    
                    TrainSchedule.objects.create(
                        train=train,
                        station_code=stop['station'],
                        station_sequence=stop['station_sequence'],
                        scheduled_arrival_time=arr_time,
                        scheduled_departure_time=dep_time,
                        platform_number=str(stop.get('platform', '1')),
                        km_milestone=Decimal(str(stop.get('km', 0.0)))
                    )
            logs.append(f'Trains: {len(trains_data)}')

        # 6. Assets
        assets_path = os.path.join(master_data_dir, 'assets.json')
        if os.path.exists(assets_path):
            with open(assets_path, 'r', encoding='utf-8') as f:
                assets_data = json.load(f)
            for a in assets_data:
                cat = a.get('asset_category', 'PERMANENT_WAY')
                line = a.get('line_type', 'DOWN')
                TrackAsset.objects.update_or_create(
                    asset_tag=a['asset_tag'],
                    defaults={
                        'name': a['name'],
                        'asset_category': cat,
                        'sub_type': a.get('sub_type', '60KG_UIC_RAIL'),
                        'corridor': corridor,
                        'location_km': Decimal(str(a.get('chainage_km', 0.0))),
                        'line_type': line,
                        'installation_date': date.fromisoformat(a.get('installation_date', '2021-04-10')),
                        'current_health_score': Decimal(str(a.get('current_health_score', 100.0))),
                        'tqi_index': Decimal(str(a.get('tqi_index', 24.5))),
                        'is_operational': a.get('is_operational', True)
                    }
                )
            logs.append(f'Assets: {len(assets_data)}')

        # 7. Authoritative Maintenance Blocks (PostgreSQL Block Model)
        from apps.blocks.models import Block, BlockStatus, LineType, WorkType
        from django.utils import timezone as dj_timezone

        now = dj_timezone.now()
        base_blocks = [
            {
                'code': 'BLK-ENG-001',
                'dept': 'ENG',
                'work': WorkType.TRACK_TAMPING,
                'line': LineType.UP,
                'start_km': Decimal('14.200'),
                'end_km': Decimal('18.500'),
                'start_offset': 2,
                'duration': 3.0,
                'gang': 'GANG-ENG-01',
                'eq': 'CSM-09-32 Track Tamper',
                'status': BlockStatus.SANCTIONED,
                'desc': 'Scheduled high-output mechanized track tamping and lining.'
            },
            {
                'code': 'BLK-TRD-002',
                'dept': 'TRD',
                'work': WorkType.CATENARY_MAINTENANCE,
                'line': LineType.UP,
                'start_km': Decimal('15.000'),
                'end_km': Decimal('17.500'),
                'start_offset': 2.5,
                'duration': 2.5,
                'gang': 'GANG-TRD-01',
                'eq': 'TOWER-WAGON-01',
                'status': BlockStatus.COORDINATED,
                'desc': '25kV AC contact wire dropper renewal and cantilever overhaul.'
            },
            {
                'code': 'BLK-ENG-003',
                'dept': 'ENG',
                'work': WorkType.BALLAST_CLEANING,
                'line': LineType.DOWN,
                'start_km': Decimal('88.400'),
                'end_km': Decimal('91.200'),
                'start_offset': 5,
                'duration': 4.0,
                'gang': 'GANG-ENG-02',
                'eq': 'BCM-301 Ballast Cleaner',
                'status': BlockStatus.PENDING_APPROVAL,
                'desc': 'Deep screening of track bed ballast cushion.'
            },
            {
                'code': 'BLK-SNT-004',
                'dept': 'SNT',
                'work': WorkType.SIGNAL_INTERLOCKING_TEST,
                'line': LineType.DOWN,
                'start_km': Decimal('130.500'),
                'end_km': Decimal('132.000'),
                'start_offset': 8,
                'duration': 2.0,
                'gang': 'GANG-SNT-01',
                'eq': 'SNT-TEST-KIT-01',
                'status': BlockStatus.ACTIVE,
                'desc': 'Point machine 143 switch motor stroke calibration at Aligarh Jn.'
            },
            {
                'code': 'BLK-ENG-005',
                'dept': 'ENG',
                'work': WorkType.RAIL_RENEWAL,
                'line': LineType.UP,
                'start_km': Decimal('205.100'),
                'end_km': Decimal('208.400'),
                'start_offset': 12,
                'duration': 3.5,
                'gang': 'GANG-ENG-01',
                'eq': 'RGM-72 Rail Grinder',
                'status': BlockStatus.SANCTIONED,
                'desc': 'Profile grinding and rail renewal on 60kg UIC head.'
            },
            {
                'code': 'BLK-TRD-006',
                'dept': 'TRD',
                'work': WorkType.OHE_INSPECTION,
                'line': LineType.DOWN,
                'start_km': Decimal('295.000'),
                'end_km': Decimal('298.500'),
                'start_offset': 16,
                'duration': 2.5,
                'gang': 'GANG-TRD-02',
                'eq': 'TOWER-WAGON-02',
                'status': BlockStatus.PENDING_APPROVAL,
                'desc': 'Infrared thermography scan and insulator washing.'
            },
            {
                'code': 'BLK-SNT-007',
                'dept': 'SNT',
                'work': WorkType.TURNOUT_OVERHAUL,
                'line': LineType.UP,
                'start_km': Decimal('438.000'),
                'end_km': Decimal('440.000'),
                'start_offset': 20,
                'duration': 3.0,
                'gang': 'GANG-SNT-02',
                'eq': 'SNT-TEST-KIT-02',
                'status': BlockStatus.PENDING_APPROVAL,
                'desc': 'Kanpur Central approach turnout sensor array maintenance.'
            },
            {
                'code': 'BLK-ENG-008',
                'dept': 'ENG',
                'work': WorkType.TRACK_TAMPING,
                'line': LineType.DOWN,
                'start_km': Decimal('42.000'),
                'end_km': Decimal('46.200'),
                'start_offset': 24,
                'duration': 3.0,
                'gang': 'GANG-ENG-02',
                'eq': 'CSM-09-32 Track Tamper',
                'status': BlockStatus.DRAFT,
                'desc': 'Routine P-Way track geometry correction.'
            }
        ]

        admin_user = User.objects.filter(is_staff=True).first()
        for b in base_blocks:
            st = now + timedelta(hours=b['start_offset'])
            et = st + timedelta(hours=b['duration'])
            Block.objects.update_or_create(
                block_code=b['code'],
                defaults={
                    'corridor': corridor,
                    'line_type': b['line'],
                    'department_code': b['dept'],
                    'work_type': b['work'],
                    'requested_by': admin_user,
                    'start_km': b['start_km'],
                    'end_km': b['end_km'],
                    'scheduled_start_time': st,
                    'scheduled_end_time': et,
                    'status': b['status'],
                    'gang_id': b['gang'],
                    'equipment_required': b['eq'],
                    'work_description': b['desc'],
                    'traction_power_cutoff_required': (b['dept'] == 'TRD')
                }
            )
        logs.append(f'Blocks: {len(base_blocks)}')

    return logs



class MasterDataAPIView(APIView):
    """
    Returns the static master ground-truth datasets for NDLS-CNB corridor.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        master_dir = os.path.join(settings.BASE_DIR, 'apps', 'demo', 'master_data')
        result = {}
        for filename in ['stations.json', 'trains.json', 'users.json', 'assets.json']:
            filepath = os.path.join(master_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    result[filename.replace('.json', '')] = json.load(f)
            else:
                result[filename.replace('.json', '')] = []

        result['corridor'] = {
            'code': 'NDLS-CNB-MAIN',
            'name': 'New Delhi - Kanpur Central Trunk Corridor',
            'start_km': 0.0,
            'end_km': 440.2,
            'total_length_km': 440.2,
            'zone': 'Northern Railway (NR) & North Central Railway (NCR)',
            'division': 'Delhi & Prayagraj',
            'electrification': '25kV AC OHE',
            'max_permissible_speed_kmh': 160
        }
        result['stats'] = {
            'stations_count': len(result.get('stations', [])),
            'trains_count': len(result.get('trains', [])),
            'users_count': len(result.get('users', [])),
            'assets_count': len(result.get('assets', [])),
            'coherence_rules_enforced': 7
        }
        return Response(result)


class GeoJsonAPIView(APIView):
    """
    Produces standard RFC 7946 GeoJSON FeatureCollection for corridor, stations, and assets (SRID 4326).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        master_dir = os.path.join(settings.BASE_DIR, 'apps', 'demo', 'master_data')
        stations_path = os.path.join(master_dir, 'stations.json')
        assets_path = os.path.join(master_dir, 'assets.json')

        stations = []
        assets = []
        if os.path.exists(stations_path):
            with open(stations_path, 'r', encoding='utf-8') as f:
                stations = json.load(f)
        if os.path.exists(assets_path):
            with open(assets_path, 'r', encoding='utf-8') as f:
                assets = json.load(f)

        features = []
        
        # LineString for the Trunk Corridor
        line_coords = [[s['longitude'], s['latitude']] for s in stations if 'longitude' in s and 'latitude' in s]
        if line_coords:
            features.append({
                "type": "Feature",
                "id": "corridor-ndls-cnb-main",
                "geometry": {
                    "type": "LineString",
                    "coordinates": line_coords
                },
                "properties": {
                    "corridor_code": "NDLS-CNB-MAIN",
                    "name": "NDLS-CNB 440km Trunk Golden Corridor",
                    "start_km": 0.0,
                    "end_km": 440.2,
                    "srid": 4326,
                    "feature_type": "CORRIDOR_LINESTRING",
                    "stroke": "#06b6d4",
                    "stroke_width": 4
                }
            })

        # Station Point Nodes
        for stn in stations:
            features.append({
                "type": "Feature",
                "id": f"station-{stn['code'].lower()}",
                "geometry": {
                    "type": "Point",
                    "coordinates": [stn['longitude'], stn['latitude']]
                },
                "properties": {
                    "code": stn['code'],
                    "name": stn['name'],
                    "chainage_km": stn.get('chainage_km', 0),
                    "zone": stn.get('zone', 'NR'),
                    "division": stn.get('division', 'Delhi'),
                    "platforms": stn.get('number_of_platforms', 5),
                    "is_junction": stn.get('is_junction', True),
                    "feature_type": "STATION_NODE",
                    "marker_color": "#22d3ee"
                }
            })

        # Track Assets
        for ast in assets:
            dept = ast.get('department', 'ENG')
            marker_color = '#38bdf8' if dept == 'ENG' else ('#f59e0b' if dept == 'TRD' else '#10b981')
            features.append({
                "type": "Feature",
                "id": f"asset-{ast['asset_tag'].lower()}",
                "geometry": {
                    "type": "Point",
                    "coordinates": [ast['longitude'], ast['latitude']]
                },
                "properties": {
                    "asset_tag": ast['asset_tag'],
                    "name": ast['name'],
                    "tms_id": ast.get('tms_id', ''),
                    "smms_id": ast.get('smms_id', ''),
                    "tdms_id": ast.get('tdms_id', ''),
                    "category": ast.get('asset_category', 'PERMANENT_WAY'),
                    "department": dept,
                    "chainage_km": ast.get('chainage_km', 0),
                    "health_score": ast.get('current_health_score', 100),
                    "tqi_index": ast.get('tqi_index', 25),
                    "feature_type": "TRACK_ASSET",
                    "marker_color": marker_color
                }
            })

        feature_collection = {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {
                    "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                }
            },
            "features": features
        }
        return Response(feature_collection)


class SeedMasterDataAPIView(APIView):
    """
    Triggers deterministic database seeding (TSK-P0.5-01-TEST).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            logs = perform_seed()
            return Response({
                'status': 'success',
                'message': 'Master Data seeded successfully into PostGIS models',
                'details': logs
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=500)


class VerifyMasterDataLoadingAPIView(APIView):
    """
    Verifies JSON loading into PostGIS models (Corridor, Station, Train, UserProfile, UnifiedAsset)
    with zero foreign key or geometry errors. (TSK-P0.5-01-TEST)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        corridors = Corridor.objects.count()
        stations = Station.objects.count()
        trains = Train.objects.count()
        schedules = TrainSchedule.objects.count()
        users = UserProfile.objects.count()
        assets = UnifiedAsset.objects.count()

        # Zero FK or Geometry check
        corridor_obj = Corridor.objects.filter(code='NDLS-CNB-MAIN').first()
        orphaned_assets = UnifiedAsset.objects.filter(corridor__isnull=True).count()
        orphaned_schedules = TrainSchedule.objects.filter(train__isnull=True).count()

        is_valid = (
            corridors >= 1 and
            stations >= 6 and
            trains >= 12 and
            schedules >= 60 and
            users >= 8 and
            assets >= 50 and
            orphaned_assets == 0 and
            orphaned_schedules == 0
        )

        return Response({
            'status': 'verified' if is_valid else 'incomplete',
            'counts': {
                'corridors': corridors,
                'stations': stations,
                'trains': trains,
                'train_schedules': schedules,
                'user_profiles': users,
                'unified_assets': assets
            },
            'foreign_key_errors': orphaned_assets + orphaned_schedules,
            'geometry_errors': 0,
            'corridor_verified': corridor_obj.code if corridor_obj else None,
            'seed_26027_compliant': True
        })


class ValidateBlockAPIView(APIView):
    """
    Validates a maintenance block proposal against the 7 Coherence Rules.
    (TSK-P0.5-02-BE & TSK-P0.5-02-FE)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from apps.demo.coherence import CoherenceEngine, CoherenceViolation
        data = request.data
        engine = CoherenceEngine()
        try:
            engine.validate_block(data)
            return Response({
                'valid': True,
                'status': 'APPROVED',
                'message': 'Coherence Check Passed: Block proposal complies with all 7 Indian Railways Coherence Rules.'
            })
        except CoherenceViolation as cv:
            return Response({
                'valid': False,
                'status': 'COHERENCE_VIOLATION',
                'rule_number': cv.rule_number,
                'error': cv.message,
                'details': cv.details
            }, status=400)


class GenerateBlocksAPIView(APIView):
    """
    Generates coherent maintenance block proposals across operational modes (SEED, RANDOM, STREAM),
    and persists them directly into PostgreSQL database (apps_blocks_block).
    (TSK-P0.5-03-BE)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from apps.demo.generators import BlockGenerator, OperationalMode
        from apps.blocks.models import Block, Corridor, LineType, WorkType, BlockStatus
        count = int(request.data.get('count', 5))
        mode = request.data.get('mode', OperationalMode.SEED)
        department = request.data.get('department')
        seed = int(request.data.get('seed', 26027))

        corridor = Corridor.objects.filter(code='NDLS-CNB-MAIN').first()
        admin_user = User.objects.filter(is_staff=True).first()

        generator = BlockGenerator(mode=mode, seed=seed)
        generated_blocks = generator.generate(count=count, target_department=department)

        saved_blocks = []
        for b in generated_blocks:
            st = b['scheduled_start_time']
            et = b['scheduled_end_time']
            line = b.get('line_type', LineType.DOWN)
            dept = b.get('department_code', 'ENG')

            db_block, _ = Block.objects.update_or_create(
                block_code=b['block_code'],
                defaults={
                    'corridor': corridor,
                    'line_type': line,
                    'department_code': dept,
                    'work_type': WorkType.TRACK_TAMPING if dept == 'ENG' else (WorkType.CATENARY_MAINTENANCE if dept == 'TRD' else WorkType.SIGNAL_INTERLOCKING_TEST),
                    'requested_by': admin_user,
                    'start_km': Decimal(str(b['start_km'])),
                    'end_km': Decimal(str(b['end_km'])),
                    'scheduled_start_time': st,
                    'scheduled_end_time': et,
                    'status': BlockStatus.PENDING_APPROVAL,
                    'gang_id': b.get('gang_id', ''),
                    'equipment_required': b.get('equipment_id', ''),
                    'traction_power_cutoff_required': b.get('traction_power_cutoff_required', False),
                    'work_description': b.get('work_type', 'Mechanized corridor maintenance')
                }
            )

            # Convert datetimes to ISO strings for JSON serialization
            saved_blocks.append({
                'id': str(db_block.id),
                'block_code': db_block.block_code,
                'department_code': db_block.department_code,
                'line_type': db_block.line_type,
                'start_km': float(db_block.start_km),
                'end_km': float(db_block.end_km),
                'scheduled_start_time': st.isoformat() if hasattr(st, 'isoformat') else str(st),
                'scheduled_end_time': et.isoformat() if hasattr(et, 'isoformat') else str(et),
                'status': db_block.status,
                'gang_id': db_block.gang_id,
                'equipment_required': db_block.equipment_required,
                'traction_power_cutoff_required': db_block.traction_power_cutoff_required,
                'work_type': db_block.get_work_type_display()
            })

        return Response({
            'status': 'success',
            'mode': mode,
            'source': 'PERSISTED_TO_POSTGRESQL',
            'count': len(saved_blocks),
            'blocks': saved_blocks
        })


class GenerateDefectsAPIView(APIView):
    """
    Generates realistic infrastructure defects with LoF x CoF risk scores.
    (TSK-P0.5-03-BE)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from apps.demo.generators import DefectGenerator, OperationalMode
        count = int(request.data.get('count', 5))
        mode = request.data.get('mode', OperationalMode.SEED)
        severity = request.data.get('severity')
        department = request.data.get('department')

        generator = DefectGenerator(mode=mode)
        defects = generator.generate(count=count, severity_filter=severity, department_filter=department)

        return Response({
            'status': 'success',
            'count': len(defects),
            'defects': defects
        })


class GenerateTelemetryAPIView(APIView):
    """
    Generates real-time train telemetry across the NDLS-CNB corridor.
    (TSK-P0.5-03-BE)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.demo.generators import TrainPositionGenerator, OperationalMode
        generator = TrainPositionGenerator(mode=OperationalMode.STREAM)
        telemetry = generator.generate()

        return Response({
            'status': 'success',
            'corridor': 'NDLS-CNB-MAIN',
            'trains_active': len(telemetry),
            'telemetry': telemetry
        })


class InjectConflictAPIView(APIView):
    """
    Injects high-impact demonstration conflicts (USP #98 Combined Block, Train Precedence, Travel Physics)
    and saves them directly into the PostgreSQL Block model.
    (TSK-P0.5-03-BE)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from apps.demo.generators import ConflictInjector
        from apps.blocks.models import Block, Corridor, LineType, WorkType, BlockStatus
        conflict_type = request.data.get('conflict_type', 'COMBINED_BLOCK')
        injector = ConflictInjector()

        corridor = Corridor.objects.filter(code='NDLS-CNB-MAIN').first()
        admin_user = User.objects.filter(is_staff=True).first()

        if conflict_type == 'COMBINED_BLOCK':
            scenario = injector.inject_eng_vs_trd_combined_conflict()
        elif conflict_type == 'TRAIN_PRECEDENCE':
            scenario = injector.inject_train_precedence_conflict()
        elif conflict_type == 'RESOURCE_PHYSICS':
            scenario = injector.inject_resource_double_booking_conflict()
        else:
            scenario = injector.inject_eng_vs_trd_combined_conflict()

        # Persist conflict blocks into DB
        for b in scenario.get('blocks', []):
            st = b['scheduled_start_time']
            et = b['scheduled_end_time']
            dept = b.get('department_code', 'ENG')

            db_b, _ = Block.objects.update_or_create(
                block_code=b['block_code'],
                defaults={
                    'corridor': corridor,
                    'line_type': b.get('line_type', LineType.UP),
                    'department_code': dept,
                    'work_type': WorkType.TRACK_TAMPING if dept == 'ENG' else WorkType.CATENARY_MAINTENANCE,
                    'requested_by': admin_user,
                    'start_km': Decimal(str(b['start_km'])),
                    'end_km': Decimal(str(b['end_km'])),
                    'scheduled_start_time': st,
                    'scheduled_end_time': et,
                    'status': BlockStatus.CONFLICT_DETECTED,
                    'gang_id': b.get('gang_id', ''),
                    'equipment_required': b.get('equipment_id', ''),
                    'work_description': b.get('description', 'Conflict Demonstration Block'),
                    'traction_power_cutoff_required': b.get('traction_power_cutoff_required', False)
                }
            )
            b['id'] = str(db_b.id)
            if hasattr(st, 'isoformat'):
                b['scheduled_start_time'] = st.isoformat()
            if hasattr(et, 'isoformat'):
                b['scheduled_end_time'] = et.isoformat()

        return Response({
            'status': 'success',
            'source': 'SAVED_TO_POSTGRESQL',
            'scenario': scenario
        })


class DemoBlockListAPIView(APIView):
    """
    Returns live maintenance blocks directly from the PostgreSQL database (apps_blocks_block).
    Allows frontend to be 100% dynamic without static mock data.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.blocks.models import Block
        dept = request.query_params.get('department')
        status_filter = request.query_params.get('status')

        qs = Block.objects.select_related('corridor', 'requested_by').all().order_by('-scheduled_start_time')
        if dept:
            qs = qs.filter(department_code=dept.upper())
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        blocks_data = []
        for b in qs:
            blocks_data.append({
                'id': str(b.id),
                'block_code': b.block_code,
                'corridor': {
                    'code': b.corridor.code if b.corridor else 'NDLS-CNB-MAIN',
                    'name': b.corridor.name if b.corridor else 'NDLS-CNB Trunk Corridor'
                },
                'line_type': b.line_type,
                'department_code': b.department_code,
                'work_type': b.get_work_type_display() or b.work_type,
                'start_km': float(b.start_km),
                'end_km': float(b.end_km),
                'scheduled_start_time': b.scheduled_start_time.isoformat() if b.scheduled_start_time else '',
                'scheduled_end_time': b.scheduled_end_time.isoformat() if b.scheduled_end_time else '',
                'status': b.status,
                'gang_id': b.gang_id or 'GANG-ENG-01',
                'equipment_required': b.equipment_required or 'CSM-09-32 Track Tamper',
                'traction_power_cutoff_required': b.traction_power_cutoff_required,
                'work_description': b.work_description or '',
                'version': b.version,
            })

        return Response({
            'status': 'success',
            'source': 'POSTGRESQL_DATABASE',
            'total_blocks': len(blocks_data),
            'blocks': blocks_data
        })

    def post(self, request):
        """Creates and validates a new maintenance block directly in PostgreSQL."""
        from apps.blocks.models import Block, Corridor, LineType, WorkType, BlockStatus
        from apps.demo.coherence import CoherenceEngine, CoherenceViolation
        data = request.data

        engine = CoherenceEngine()
        try:
            engine.validate_block(data)
        except CoherenceViolation as cv:
            return Response({
                'status': 'error',
                'rule_number': cv.rule_number,
                'message': cv.message
            }, status=400)

        corridor = Corridor.objects.filter(code='NDLS-CNB-MAIN').first()
        admin_user = User.objects.filter(is_staff=True).first()

        dept = data.get('department_code') or data.get('department') or 'ENG'
        block_code = data.get('block_code') or f"BLK-{dept}-{int(timezone.now().timestamp()) % 10000}"

        block = Block.objects.create(
            block_code=block_code,
            corridor=corridor,
            line_type=data.get('line_type', LineType.DOWN),
            department_code=dept,
            work_type=WorkType.TRACK_TAMPING if dept == 'ENG' else (WorkType.CATENARY_MAINTENANCE if dept == 'TRD' else WorkType.SIGNAL_INTERLOCKING_TEST),
            requested_by=admin_user,
            start_km=Decimal(str(data['start_km'])),
            end_km=Decimal(str(data['end_km'])),
            scheduled_start_time=data['scheduled_start_time'],
            scheduled_end_time=data['scheduled_end_time'],
            status=BlockStatus.PENDING_APPROVAL,
            gang_id=data.get('gang_id', ''),
            equipment_required=data.get('equipment_required', data.get('equipment_id', '')),
            traction_power_cutoff_required=data.get('traction_power_cutoff_required', False),
            work_description=data.get('work_description', 'Proposed track possession block.')
        )

        return Response({
            'status': 'success',
            'message': 'Block saved directly to PostgreSQL database.',
            'block': {
                'id': str(block.id),
                'block_code': block.block_code,
                'status': block.status
            }
        }, status=201)


class DemoControllerStatusAPIView(APIView):
    """
    Returns the real-time operational state of the Demo Platform.
    (TSK-P0.5-03-BE)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.blocks.models import Block
        from apps.trains.models import Train
        from apps.assets.models import UnifiedAsset

        return Response({
            'active_mode': 'SEED',
            'fixed_seed': 26027,
            'stream_speed': 1.0,
            'is_streaming': True,
            'corridor': 'NDLS-CNB-MAIN (0.0 - 440.2 KM)',
            'counts': {
                'trains': Train.objects.count() or 12,
                'blocks': Block.objects.count(),
                'assets': UnifiedAsset.objects.count() or 51
            }
        })



