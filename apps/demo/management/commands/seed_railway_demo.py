import json
import os
import random
from decimal import Decimal
from datetime import time, date
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from django.contrib.auth.models import User

from apps.blocks.models import Corridor, LineType
from apps.trains.models import Station, Train, TrainSchedule, TrainType, TractionType
from apps.departments.models import Department
from apps.accounts.models import UserProfile, UserRole, DepartmentCode
from apps.assets.models import TrackAsset, UnifiedAsset, AssetCategory

class Command(BaseCommand):
    help = 'Seeds the database with deterministic demo data for SIH PS 26027'

    def add_arguments(self, parser):
        parser.add_argument('--seed', type=int, default=26027, help='Random seed for deterministic generation')

    def handle(self, *args, **options):
        seed = options['seed']
        random.seed(seed)
        self.stdout.write(self.style.SUCCESS(f'Starting Demo Data Seeding with seed {seed}...'))
        
        master_data_dir = os.path.join(settings.BASE_DIR, 'apps', 'demo', 'master_data')

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
            self.stdout.write(f'  [OK] Corridor: {corridor.code} (0.0 to 440.2 km)')

            # 2. Stations
            stations_path = os.path.join(master_data_dir, 'stations.json')
            stations_count = 0
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
                    stations_count += 1
            self.stdout.write(f'  [OK] Loaded {stations_count} Stations with PostGIS coordinates')

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

            # 4. Staff Personas & UserProfiles
            users_path = os.path.join(master_data_dir, 'users.json')
            users_count = 0
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
                    users_count += 1
            self.stdout.write(f'  [OK] Loaded {users_count} Staff Personas with Argon2id & UserProfiles')

            # 5. Trains & Schedules
            trains_path = os.path.join(master_data_dir, 'trains.json')
            trains_count = 0
            schedules_count = 0
            if os.path.exists(trains_path):
                with open(trains_path, 'r', encoding='utf-8') as f:
                    trains_data = json.load(f)
                for t in trains_data:
                    train_type = t.get('train_type')
                    if not train_type:
                        t_type_raw = t.get('type', 'EXPRESS')
                        if t_type_raw == 'PRESTIGE':
                            train_type = TrainType.PRESTIGE_SUPERFAST
                        elif t_type_raw == 'FREIGHT':
                            train_type = TrainType.BULK_FREIGHT
                        else:
                            train_type = TrainType.PASSENGER_EXPRESS

                    train, _ = Train.objects.update_or_create(
                        train_number=t['train_number'],
                        defaults={
                            'train_name': t['name'],
                            'train_type': train_type,
                            'priority_rank': t.get('priority_rank', 50),
                            'source_station': t.get('source', 'NDLS'),
                            'destination_station': t.get('destination', 'CNB'),
                            'max_speed_kmh': t.get('max_speed_kmph', 110),
                            'is_daily': True,
                            'traction_type': TractionType.ELECTRIC
                        }
                    )
                    trains_count += 1

                    # Re-create schedules for this train
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
                        schedules_count += 1
            self.stdout.write(f'  [OK] Loaded {trains_count} Trains & {schedules_count} Train Schedule stops')

            # 6. Track Assets / Unified Assets
            assets_path = os.path.join(master_data_dir, 'assets.json')
            assets_count = 0
            if os.path.exists(assets_path):
                with open(assets_path, 'r', encoding='utf-8') as f:
                    assets_data = json.load(f)
                for a in assets_data:
                    cat = a.get('asset_category', AssetCategory.PERMANENT_WAY)
                    line = a.get('line_type', LineType.DOWN)
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
                    assets_count += 1
            self.stdout.write(f'  [OK] Loaded {assets_count} TrackAssets (UnifiedAsset) with Rule 6 Triplet IDs')

        self.stdout.write(self.style.SUCCESS('Successfully seeded and verified PostGIS Master Data universe!'))
