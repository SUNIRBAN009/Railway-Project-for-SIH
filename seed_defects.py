import os, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.assets.models import TrackAsset, AssetDefectLog, DefectType, DefectSeverity, AssetCategory
from apps.blocks.models import Corridor, LineType

corridor = Corridor.objects.filter(code='NDLS-CNB-MAIN').first() or Corridor.objects.first()

# Ensure physical assets exist along the Delhi-Ghaziabad section
assets_info = [
    ('AST-NDLS-007', '25kV Catenary Contact Wire', AssetCategory.OHE_TRACTION, 'OHE_CONTACT_WIRE', Decimal('7.500'), LineType.DOWN),
    ('AST-NDLS-GZB-014', '60kg UIC Continuous Welded Rail', AssetCategory.PERMANENT_WAY, '60kg_90UTS_RAIL', Decimal('14.800'), LineType.DOWN),
    ('AST-GZB-ALJN-082', 'Thick Web Turnout 1:12', AssetCategory.PERMANENT_WAY, 'TURNOUT_1_IN_12', Decimal('20.200'), LineType.UP),
    ('AST-SBB-GZB-031', 'Point Machine 143', AssetCategory.SIGNAL_INTERLOCKING, 'POINT_MACHINE_143', Decimal('28.200'), LineType.DOWN),
]

for tag, name, cat, subtype, km, linetype in assets_info:
    asset, created = TrackAsset.objects.update_or_create(
        asset_tag=tag,
        defaults={
            'name': name,
            'corridor': corridor,
            'asset_category': cat,
            'sub_type': subtype,
            'location_km': km,
            'line_type': linetype,
            'current_health_score': Decimal('55.0'),
            'tqi_index': Decimal('28.0'),
            'is_operational': True,
        }
    )
    print(f"{'Created' if created else 'Updated'} Asset {tag} at KM {km}")

defects_info = [
    {
        'defect_code': 'DEF-USFD-014',
        'asset_tag': 'AST-NDLS-GZB-014',
        'defect_type': DefectType.INTERNAL_RAIL_FRACTURE,
        'severity': DefectSeverity.CRITICAL_IMMEDIATE_STOP,
        'detected_by_source': 'USFD_ULTRASONIC_CAR_02',
        'flaw_depth_mm': Decimal('14.20'),
        'recommended_speed_restriction_kmh': 30,
        'block_recommended': True,
        'cof_score': 5,
        'lof_score': 5,
        'overdue_days': 28,
        'description': 'Internal Rail Fatigue / Transverse Fissure detected during USFD B-Scan.'
    },
    {
        'defect_code': 'DEF-WHEEL-020',
        'asset_tag': 'AST-GZB-ALJN-082',
        'defect_type': DefectType.WHEEL_BURN,
        'severity': DefectSeverity.IMPAIRMENT_SPEED_RESTRICTION,
        'detected_by_source': 'TRACK_RECORDING_CAR',
        'flaw_depth_mm': Decimal('8.50'),
        'recommended_speed_restriction_kmh': 50,
        'block_recommended': True,
        'cof_score': 4,
        'lof_score': 3,
        'overdue_days': 14,
        'description': 'Wheel Burn / Scabbing on outer rail table requiring rail grinding block.'
    },
    {
        'defect_code': 'DEF-OHE-007',
        'asset_tag': 'AST-NDLS-007',
        'defect_type': DefectType.OHE_SAG_EXCESSIVE,
        'severity': DefectSeverity.IMPAIRMENT_SPEED_RESTRICTION,
        'detected_by_source': 'OHE_INSPECTION_CAR',
        'flaw_depth_mm': None,
        'recommended_speed_restriction_kmh': 75,
        'block_recommended': True,
        'cof_score': 2,
        'lof_score': 3,
        'overdue_days': 5,
        'description': 'Excessive Catenary / Contact Wire Sag exceeding RDSO limits.'
    },
    {
        'defect_code': 'DEF-TRK-031',
        'asset_tag': 'AST-SBB-GZB-031',
        'defect_type': DefectType.POINT_SLACK_TIMEOUT,
        'severity': DefectSeverity.MONITORING_REQUIRED,
        'detected_by_source': 'DATA_LOGGER_DIAGNOSTICS',
        'flaw_depth_mm': None,
        'recommended_speed_restriction_kmh': None,
        'block_recommended': False,
        'cof_score': 3,
        'lof_score': 2,
        'overdue_days': 2,
        'description': 'Points Machine Slack / Detection Timeout during route locking.'
    },
]

for d in defects_info:
    asset = TrackAsset.objects.get(asset_tag=d['asset_tag'])
    defect, created = AssetDefectLog.objects.update_or_create(
        defect_code=d['defect_code'],
        defaults={
            'asset': asset,
            'defect_type': d['defect_type'],
            'severity': d['severity'],
            'detected_by_source': d['detected_by_source'],
            'flaw_depth_mm': d['flaw_depth_mm'],
            'recommended_speed_restriction_kmh': d['recommended_speed_restriction_kmh'],
            'block_recommended': d['block_recommended'],
            'cof_score': d['cof_score'],
            'lof_score': d['lof_score'],
            'overdue_days': d['overdue_days'],
            'description': d['description'],
            'is_rectified': False,
        }
    )
    print(f"{'Created' if created else 'Updated'} Defect {d['defect_code']} ({d['severity']})")

print(f"\nTotal Active Unrectified Defects in DB: {AssetDefectLog.objects.filter(is_rectified=False).count()}")
