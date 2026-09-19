import os
import sys
sys.path.insert(0, '/app')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
django.setup()

from apps.blocks.models import Corridor, BlockSection, LineType
from apps.trains.models import Station

corridor = Corridor.objects.filter(code='NDLS-CNB-MAIN').first()
if not corridor:
    corridor = Corridor.objects.first()

print(f"Using Corridor: {corridor.code} ({corridor.name})")

stations = list(Station.objects.order_by('km_from_source'))
print(f"Total Stations available: {len(stations)}")

created_count = 0
for i in range(len(stations) - 1):
    stn_a = stations[i]
    stn_b = stations[i + 1]
    
    sec_code = f"SEC-{stn_a.code}-{stn_b.code}-DN"
    sec, created = BlockSection.objects.get_or_create(
        section_code=sec_code,
        defaults={
            'corridor': corridor,
            'from_station': stn_a.code,
            'to_station': stn_b.code,
            'start_km': stn_a.km_from_source,
            'end_km': stn_b.km_from_source,
            'line_type': LineType.DOWN,
            'is_electrified': True,
            'max_speed_kmh': 130
        }
    )
    if created:
        created_count += 1
    print(f"  [{'NEW' if created else 'EXIST'}] {sec.section_code:22} | KM {sec.start_km:7.3f} -> {sec.end_km:7.3f} | {stn_a.name} -> {stn_b.name}")

print(f"Total BlockSections created/verified: {BlockSection.objects.count()} (New: {created_count})")
