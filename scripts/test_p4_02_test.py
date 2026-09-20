"""
E2E Verification Script for TSK-P4-02-TEST:
Click Download & Verify Official Block Sanction Order and Corridor Report PDFs with Tabular Data.
Authoritative reference: docs/03-service-blueprints/07-analytics.md & docs/04-function-maps/07-analytics-function-map.md
"""
import os
import sys
import zlib
import base64
import hashlib
import django
import datetime
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.test import Client
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.blocks.models import Corridor, Block, BlockStatus, LineType, WorkType
from apps.analytics.models import CorridorDailyKPI
from apps.analytics.services.pdf_report_service import (
    BlockSanctionOrderPDFGenerator,
    ExecutivePDFReportGenerator,
)

User = get_user_model()


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """
    Decompresses and extracts readable text and operators from a ReportLab PDF stream.
    """
    text_chunks = []
    idx = 0
    while True:
        s_start = pdf_bytes.find(b'stream', idx)
        if s_start == -1:
            break
        # Advance past 'stream\r\n' or 'stream\n'
        if pdf_bytes[s_start:s_start + 8].startswith(b'stream\r\n'):
            s_start += 8
        elif pdf_bytes[s_start:s_start + 7].startswith(b'stream\n'):
            s_start += 7
        else:
            s_start += 6

        s_end = pdf_bytes.find(b'endstream', s_start)
        if s_end == -1:
            break

        raw_chunk = pdf_bytes[s_start:s_end].strip()
        idx = s_end + len(b'endstream')

        # Attempt decompression (FlateDecode / zlib)
        try:
            decomp = zlib.decompress(raw_chunk)
            text_chunks.append(decomp.decode('latin1', errors='ignore'))
        except Exception:
            try:
                flate_data = base64.a85decode(raw_chunk, adobe=True)
                decomp = zlib.decompress(flate_data)
                text_chunks.append(decomp.decode('latin1', errors='ignore'))
            except Exception:
                text_chunks.append(raw_chunk.decode('latin1', errors='ignore'))

    # Also append the raw bytes text representation for uncompressed dictionary/metadata tokens
    text_chunks.append(pdf_bytes.decode('latin1', errors='ignore'))

    full_text = ' '.join(text_chunks)
    full_text = full_text.replace(r'\(', '(').replace(r'\)', ')')
    return full_text


def run_verification():
    print("=" * 80)
    print("INDIAN RAILWAYS AI PLATFORM -- PHASE 4 FEATURE 2 (TSK-P4-02-TEST) E2E VERIFICATION")
    print("Testing End-to-End PDF Generation & Tabular Data Verification in Downloaded Documents")
    print("=" * 80)

    # 1. Setup Auth, Corridor & Realistic Tabular Blocks
    print("\n[STEP 1] Setting Up Test Auth, Corridor & Production Tabular Blocks...")
    admin_user, _ = User.objects.get_or_create(
        username='coa_delhi_chief',
        defaults={'is_staff': True, 'is_superuser': True, 'first_name': 'Chief', 'last_name': 'Controller'}
    )
    admin_user.set_password('railway@123')
    admin_user.save()

    corridor, _ = Corridor.objects.get_or_create(
        code='NDLS-CNB',
        defaults={
            'name': 'New Delhi - Kanpur Central High Speed Corridor',
            'zone': 'NR',
            'division': 'DLI',
            'start_km': Decimal('0.000'),
            'end_km': Decimal('440.200'),
            'is_electrified': True,
            'max_permissible_speed_kmh': 160,
        }
    )

    now = timezone.now()
    today = now.date()

    # Block 1: Sanctioned Track Tamping Block with 25kV OHE Cut
    block_1, _ = Block.objects.get_or_create(
        block_code='BLK-E2E-TAB-01',
        defaults={
            'corridor': corridor,
            'line_type': LineType.DOWN,
            'department_code': 'ENG',
            'work_type': WorkType.TRACK_TAMPING,
            'requested_by': admin_user,
            'sanctioned_by': admin_user,
            'gang_id': 'GANG-DLI-PWAY-07',
            'equipment_required': 'CSM 09-32 Tamping Machine & DTS',
            'start_km': Decimal('32.400'),
            'end_km': Decimal('37.900'),
            'scheduled_start_time': now,
            'scheduled_end_time': now + datetime.timedelta(hours=4),
            'status': BlockStatus.SANCTIONED,
            'traction_power_cutoff_required': True,
            'caution_order_id': 'CO-NR-DLI-SR-30K-01',
            'work_description': 'Deep ballast tamping and curve alignment restoration.',
            'sanctioned_at': now,
        }
    )

    # Block 2: Bundled Shadow Block for OHE Maintenance
    block_2, _ = Block.objects.get_or_create(
        block_code='BLK-E2E-TAB-02-SHD',
        defaults={
            'corridor': corridor,
            'line_type': LineType.DOWN,
            'department_code': 'TRD',
            'work_type': WorkType.CATENARY_MAINTENANCE,
            'requested_by': admin_user,
            'sanctioned_by': admin_user,
            'gang_id': 'GANG-DLI-OHE-TW-02',
            'equipment_required': '4-Wheeler OHE Tower Wagon 4W-TW-204',
            'start_km': Decimal('33.000'),
            'end_km': Decimal('37.000'),
            'scheduled_start_time': now,
            'scheduled_end_time': now + datetime.timedelta(hours=3, minutes=30),
            'status': BlockStatus.SANCTIONED,
            'traction_power_cutoff_required': True,
            'parent_block': block_1,
            'is_shadow': True,
            'caution_order_id': 'CO-NR-DLI-SR-30K-01',
            'work_description': 'Catenary wire height & stagger adjustment under joint possession.',
            'sanctioned_at': now,
        }
    )

    # Seed OLAP KPI data for corridor report
    CorridorDailyKPI.objects.update_or_create(
        metric_date=today,
        division_code='DLI',
        corridor_code='NDLS-CNB',
        defaults={
            'total_blocks_requested': 12,
            'total_blocks_sanctioned': 10,
            'total_blocks_executed': 8,
            'total_sanctioned_duration_minutes': 1800,
            'total_actual_duration_minutes': 1750,
            'total_possession_hours': Decimal('29.17'),
            'co_possession_blocks_count': 3,
            'shadow_blocks_count': 3,
            'shadow_bundling_ratio_pct': Decimal('30.00'),
            'average_tqi_score': Decimal('23.40'),
            'tqi_status': 'GOOD',
            'total_train_delay_minutes_incurred': 45,
            'corridor_punctuality_percentage': Decimal('97.20'),
            'conflict_mitigation_rate_pct': Decimal('94.00'),
        }
    )

    print(f"  [OK] Corridor: {corridor.code} ({corridor.name})")
    print(f"  [OK] Master Block: {block_1.block_code} (KM {block_1.start_km}-{block_1.end_km})")
    print(f"  [OK] Shadow Block: {block_2.block_code} (Bundled with {block_1.block_code})")

    # 2. Simulate User One-Click Download: Block Sanction Order PDF
    print("\n[STEP 2] Simulating User Download: Block Sanction Order PDF...")
    client = Client()
    client.force_login(admin_user)

    resp_sanction = client.get(f'/api/v1/analytics/reports/sanction-order/{block_1.id}/')
    assert resp_sanction.status_code == 200, f"Download failed with HTTP {resp_sanction.status_code}"
    assert resp_sanction['Content-Type'] == 'application/pdf', "Invalid Content-Type"
    assert len(resp_sanction.content) > 3000, "Downloaded PDF too small"
    print(f"  [OK] Downloaded Block Sanction Order PDF: {len(resp_sanction.content)} bytes")

    # 3. Tabular Data Verification in Sanction Order PDF
    print("\n[STEP 3] Verifying Current Tabular Data Inside Sanction Order PDF...")
    extracted_text_1 = extract_pdf_text(resp_sanction.content)

    # Verification checklist
    assertions_1 = [
        ("MINISTRY OF RAILWAYS", "Official Railway Board Header"),
        ("NORTHERN RAILWAY", "Zone Name"),
        ("DELHI DIVISION", "Division Code"),
        ("OFFICIAL TRAFFIC & POWER BLOCK SANCTION ORDER", "Document Title"),
        (block_1.block_code, "Primary Block Code BLK-E2E-TAB-01"),
        ("NDLS-CNB", "Corridor Identifier"),
        ("DOWN", "Line Type"),
        ("32.400", "Start KM 32.400"),
        ("37.900", "End KM 37.900"),
        ("GANG-DLI-PWAY-07", "Gang ID"),
        ("CSM 09-32", "Equipment Plant"),
        ("25kV OHE", "25kV OHE Power Cut directive"),
        ("CO-NR-DLI-SR-30K-01", "Caution Order ID"),
        ("GR 15.09", "Statutory Track Protection Rule"),
        ("Senior Divisional Operations Manager", "Sr. DOM Sign-off"),
    ]

    for expected_str, label in assertions_1:
        assert expected_str in extracted_text_1, f"Missing '{expected_str}' ({label}) in PDF text"
        print(f"  [PASS] Found: '{expected_str}' ({label})")

    # Verify SHA-256 Digital Verification Hash is present
    raw_token = (
        f"{block_1.id}|{block_1.block_code}|{block_1.corridor.code}|{block_1.line_type}|"
        f"{block_1.start_km}-{block_1.end_km}|{block_1.scheduled_start_time.isoformat()}|"
        f"{block_1.scheduled_end_time.isoformat()}|{block_1.status}|"
        f"{block_1.sanctioned_by_id or 'COA_OFFICIAL'}|SIL4_IR_2026"
    )
    expected_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest().upper()
    # Check if at least first 16 characters of the hash are embedded
    assert expected_hash[:16] in extracted_text_1, f"SHA-256 integrity token prefix '{expected_hash[:16]}' missing in PDF"
    print(f"  [PASS] Verified Cryptographic Token: {expected_hash[:24]}... (SHA-256)")

    # 4. Simulate User One-Click Download: Corridor Sanction Bulletin PDF
    print("\n[STEP 4] Simulating User Download: Daily Corridor Sanction Bulletin PDF...")
    resp_bulletin = client.get('/api/v1/analytics/reports/export/?type=SANCTION_BULLETIN&corridor=NDLS-CNB')
    assert resp_bulletin.status_code == 200, f"Bulletin download failed: HTTP {resp_bulletin.status_code}"
    assert resp_bulletin['Content-Type'] == 'application/pdf'
    assert len(resp_bulletin.content) > 3000
    print(f"  [OK] Downloaded Corridor Sanction Bulletin: {len(resp_bulletin.content)} bytes")

    extracted_bulletin = extract_pdf_text(resp_bulletin.content)
    assertions_bulletin = [
        ("DAILY CORRIDOR TRAFFIC & POWER BLOCK SANCTION BULLETIN", "Bulletin Title"),
        ("NDLS-CNB", "Corridor Code"),
        (block_1.block_code, "Table row with Block 1"),
        (block_2.block_code, "Table row with Block 2 (Shadow)"),
        ("GANG-DLI-PWAY", "Gang allocation in table"),
        ("GANG-DLI-OHE", "Shadow gang in table"),
    ]
    for expected_str, label in assertions_bulletin:
        assert expected_str in extracted_bulletin, f"Missing '{expected_str}' ({label}) in Bulletin PDF"
        print(f"  [PASS] Found: '{expected_str}' ({label})")

    # 5. Simulate User One-Click Download: Executive Corridor Audit Report PDF
    print("\n[STEP 5] Simulating User Download: Executive Corridor Audit Report PDF...")
    resp_exec = client.get('/api/v1/analytics/reports/export/?type=PDF&corridor=NDLS-CNB&range=7d')
    assert resp_exec.status_code == 200, f"Executive report download failed: HTTP {resp_exec.status_code}"
    assert resp_exec['Content-Type'] == 'application/pdf'
    assert len(resp_exec.content) > 3000
    print(f"  [OK] Downloaded Executive Operations Audit PDF: {len(resp_exec.content)} bytes")

    from apps.analytics.services.kpi_aggregation_service import KPIAggregationService
    summary = KPIAggregationService.get_dashboard_summary(corridor_code='NDLS-CNB', days_range=7)
    cards = summary.get('executive_cards', {})
    bundling_str = f"{cards.get('shadow_bundling_ratio_pct', 0.0):.1f}%"
    tqi_score_str = f"{cards.get('average_tqi_score', 24.5):.2f}"
    tqi_status_str = cards.get('tqi_status', 'GOOD')
    punctuality_str = f"{cards.get('average_corridor_punctuality_pct', 0.0)}%"

    extracted_exec = extract_pdf_text(resp_exec.content)
    assertions_exec = [
        ("EXECUTIVE OPERATIONS & PUNCTUALITY AUDIT REPORT", "Executive Report Title"),
        ("NDLS-CNB", "Corridor Code"),
        ("Track Possession Utilization Rate", "Scorecard KPI 1"),
        ("Corridor Train Punctuality Rate", "Scorecard KPI 2"),
        ("Shadow Block Bundling Ratio", "Scorecard KPI 3 (Bundling)"),
        ("Track Quality Index", "Scorecard KPI 4 (TQI)"),
        ("RDSO TRC standard", "RDSO benchmark designation"),
        (punctuality_str, "Punctuality Rate Value"),
        (bundling_str, "Shadow Bundling Value"),
        (tqi_score_str, "TQI Score Value"),
        (tqi_status_str, "TQI Status Classification"),
    ]
    for expected_str, label in assertions_exec:
        assert expected_str in extracted_exec, f"Missing '{expected_str}' ({label}) in Executive Report PDF"
        print(f"  [PASS] Found: '{expected_str}' ({label})")

    # 6. Verify Model Direct Export Endpoint (/blocks/<pk>/sanction-order-pdf/)
    print("\n[STEP 6] Testing Model-Level Direct Sanction PDF Download Endpoint...")
    resp_direct = client.get(f'/api/v1/blocks/{block_1.id}/sanction-order-pdf/')
    assert resp_direct.status_code == 200, f"Model direct PDF download failed: HTTP {resp_direct.status_code}"
    assert resp_direct['Content-Type'] == 'application/pdf'
    assert len(resp_direct.content) > 3000
    print(f"  [OK] Model Direct Download Succeeded: {len(resp_direct.content)} bytes")

    # 7. Verify File Persistence on Disk
    print("\n[STEP 7] Writing Output Artifacts to Verify Openability on Local System...")
    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scratch')
    os.makedirs(out_dir, exist_ok=True)

    sanction_out_path = os.path.join(out_dir, f"Sample_Sanction_Order_{block_1.block_code}.pdf")
    with open(sanction_out_path, 'wb') as f:
        f.write(resp_sanction.content)
    print(f"  [OK] Saved sample to: {sanction_out_path} ({os.path.getsize(sanction_out_path)} bytes)")

    bulletin_out_path = os.path.join(out_dir, f"Sample_Corridor_Bulletin_{corridor.code}.pdf")
    with open(bulletin_out_path, 'wb') as f:
        f.write(resp_bulletin.content)
    print(f"  [OK] Saved sample to: {bulletin_out_path} ({os.path.getsize(bulletin_out_path)} bytes)")

    exec_out_path = os.path.join(out_dir, f"Sample_Executive_Audit_{corridor.code}.pdf")
    with open(exec_out_path, 'wb') as f:
        f.write(resp_exec.content)
    print(f"  [OK] Saved sample to: {exec_out_path} ({os.path.getsize(exec_out_path)} bytes)")

    print("\n" + "=" * 80)
    print("ALL 7 VERIFICATION STAGES PASSED (100% SUCCESS)!")
    print("PDFs Generated Perfectly with 100% Matching Tabular Data & Security Tokens!")
    print("=" * 80)


if __name__ == '__main__':
    run_verification()
