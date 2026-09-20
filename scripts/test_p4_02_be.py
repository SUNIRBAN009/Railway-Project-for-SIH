"""
E2E Verification Script for TSK-P4-02-BE:
Official Block Sanction Order & Corridor Bulletin PDF Generation Engine (ReportLab).
Authoritative reference: docs/03-service-blueprints/07-analytics.md & docs/04-function-maps/07-analytics-function-map.md
"""
import os
import sys
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
from apps.analytics.services.pdf_report_service import (
    BlockSanctionOrderPDFGenerator,
    ExecutivePDFReportGenerator,
)

User = get_user_model()

def run_verification():
    print("=" * 70)
    print("INDIAN RAILWAYS AI PLATFORM — PHASE 4 FEATURE 2 (TSK-P4-02-BE) VERIFICATION")
    print("Testing Official Block Sanction Order & Corridor Bulletin PDF Engine")
    print("=" * 70)

    # 1. Setup Test Corridor, Users and Blocks
    admin_user, _ = User.objects.get_or_create(
        username='coa_chief_controller',
        defaults={'is_staff': True, 'is_superuser': True, 'first_name': 'Chief', 'last_name': 'Controller'}
    )
    admin_user.set_password('RailSafety@2026')
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

    # Create Master Block
    master_block, _ = Block.objects.get_or_create(
        block_code='BLK-SANCTION-P4-MASTER',
        defaults={
            'corridor': corridor,
            'line_type': LineType.DOWN,
            'department_code': 'ENG',
            'work_type': WorkType.TRACK_TAMPING,
            'requested_by': admin_user,
            'sanctioned_by': admin_user,
            'gang_id': 'GANG-DLI-HEAVY-01',
            'equipment_required': 'CSM 09-32 Tamping Express & Dynamic Track Stabilizer',
            'start_km': Decimal('24.500'),
            'end_km': Decimal('29.800'),
            'scheduled_start_time': now,
            'scheduled_end_time': now + datetime.timedelta(hours=4),
            'status': BlockStatus.SANCTIONED,
            'traction_power_cutoff_required': True,
            'caution_order_id': 'CO-NR-DLI-SR-30K',
            'work_description': 'Deep track geometric realignment and sleeper ballast packing.',
            'sanctioned_at': now,
        }
    )

    # Create Shadow Block bundled with Master Block
    shadow_block, _ = Block.objects.get_or_create(
        block_code='BLK-SANCTION-P4-SHADOW',
        defaults={
            'corridor': corridor,
            'line_type': LineType.DOWN,
            'department_code': 'TRD',
            'work_type': WorkType.CATENARY_MAINTENANCE,
            'requested_by': admin_user,
            'sanctioned_by': admin_user,
            'gang_id': 'GANG-TRD-OHE-TOWER-04',
            'equipment_required': '4-Wheeler OHE Tower Wagon 4W-TW-108',
            'start_km': Decimal('25.000'),
            'end_km': Decimal('29.000'),
            'scheduled_start_time': now,
            'scheduled_end_time': now + datetime.timedelta(hours=3, minutes=30),
            'status': BlockStatus.SANCTIONED,
            'traction_power_cutoff_required': True,
            'parent_block': master_block,
            'is_shadow': True,
            'caution_order_id': 'CO-NR-DLI-SR-30K',
            'work_description': 'Joint 25kV OHE dropper adjustment during primary track tamping block.',
            'sanctioned_at': now,
        }
    )

    print("\n[STEP 1] Generating Official Sanction Order PDF via ReportLab...")
    sanction_pdf_bytes = BlockSanctionOrderPDFGenerator.generate_sanction_order_pdf(master_block)
    print(f"  ✓ Sanction Order PDF generated. Size: {len(sanction_pdf_bytes)} bytes")
    assert len(sanction_pdf_bytes) > 2000, "PDF size unexpectedly small (<2000 bytes)"
    assert sanction_pdf_bytes.startswith(b'%PDF-'), "Invalid PDF magic header bytes"

    # Verify PDF content for shadow block as well
    shadow_pdf_bytes = BlockSanctionOrderPDFGenerator.generate_sanction_order_pdf(shadow_block)
    print(f"  ✓ Shadow Block Sanction Order PDF generated. Size: {len(shadow_pdf_bytes)} bytes")
    assert len(shadow_pdf_bytes) > 2000, "Shadow PDF size unexpectedly small"

    print("\n[STEP 2] Generating Daily Corridor Sanction Bulletin PDF...")
    bulletin_pdf_bytes = BlockSanctionOrderPDFGenerator.generate_corridor_sanction_bulletin_pdf('NDLS-CNB')
    print(f"  ✓ Corridor Sanction Bulletin PDF generated. Size: {len(bulletin_pdf_bytes)} bytes")
    assert len(bulletin_pdf_bytes) > 2000, "Bulletin PDF size unexpectedly small (<2000 bytes)"
    assert bulletin_pdf_bytes.startswith(b'%PDF-'), "Invalid PDF magic header bytes"

    print("\n[STEP 3] Generating Enhanced Executive Operations Audit PDF...")
    exec_pdf_bytes = ExecutivePDFReportGenerator.generate_executive_report('DLI', 'NDLS-CNB', days_range=7)
    print(f"  ✓ Executive Operations Audit PDF generated. Size: {len(exec_pdf_bytes)} bytes")
    assert len(exec_pdf_bytes) > 2000, "Executive PDF size unexpectedly small"
    assert exec_pdf_bytes.startswith(b'%PDF-'), "Invalid PDF magic header bytes"

    print("\n[STEP 4] Testing REST API Endpoints via Django Client...")
    client = Client()
    client.force_login(admin_user)

    # 4a. GET /api/v1/analytics/reports/sanction-order/<uuid:block_id>/
    resp_get = client.get(f'/api/v1/analytics/reports/sanction-order/{master_block.id}/')
    print(f"  ✓ GET /api/v1/analytics/reports/sanction-order/<uuid>/ -> HTTP {resp_get.status_code}")
    assert resp_get.status_code == 200, f"Expected HTTP 200, got {resp_get.status_code}"
    assert resp_get['Content-Type'] == 'application/pdf', "Expected application/pdf"
    assert 'attachment;' in resp_get['Content-Disposition'], "Expected attachment header"
    assert f"IR_Sanction_Order_{master_block.block_code}.pdf" in resp_get['Content-Disposition']

    # 4b. POST /api/v1/analytics/reports/sanction-order/ (FUNC-ANL-005)
    resp_post = client.post(
        '/api/v1/analytics/reports/sanction-order/',
        data={'block_id': str(master_block.id), 'division_code': 'DLI', 'format': 'PDF'},
        content_type='application/json'
    )
    print(f"  ✓ POST /api/v1/analytics/reports/sanction-order/ -> HTTP {resp_post.status_code}")
    assert resp_post.status_code == 201, f"Expected HTTP 201, got {resp_post.status_code}"
    assert resp_post['Content-Type'] == 'application/pdf', "Expected application/pdf"

    # 4c. GET /api/v1/blocks/<uuid:pk>/sanction-order-pdf/
    resp_block_direct = client.get(f'/api/v1/blocks/{master_block.id}/sanction-order-pdf/')
    print(f"  ✓ GET /api/v1/blocks/<uuid>/sanction-order-pdf/ -> HTTP {resp_block_direct.status_code}")
    assert resp_block_direct.status_code == 200, f"Expected HTTP 200, got {resp_block_direct.status_code}"
    assert resp_block_direct['Content-Type'] == 'application/pdf', "Expected application/pdf"

    # 4d. GET /api/v1/analytics/reports/export/?type=PDF&corridor=NDLS-CNB
    resp_export_exec = client.get('/api/v1/analytics/reports/export/?type=PDF&corridor=NDLS-CNB')
    print(f"  ✓ GET /api/v1/analytics/reports/export/?type=PDF -> HTTP {resp_export_exec.status_code}")
    assert resp_export_exec.status_code == 200, f"Expected HTTP 200, got {resp_export_exec.status_code}"
    assert resp_export_exec['Content-Type'] == 'application/pdf'

    # 4e. GET /api/v1/analytics/reports/export/?type=SANCTION_BULLETIN&corridor=NDLS-CNB
    resp_export_bulletin = client.get('/api/v1/analytics/reports/export/?type=SANCTION_BULLETIN&corridor=NDLS-CNB')
    print(f"  ✓ GET /api/v1/analytics/reports/export/?type=SANCTION_BULLETIN -> HTTP {resp_export_bulletin.status_code}")
    assert resp_export_bulletin.status_code == 200, f"Expected HTTP 200, got {resp_export_bulletin.status_code}"
    assert resp_export_bulletin['Content-Type'] == 'application/pdf'

    # 4f. GET /api/v1/analytics/reports/export/?type=SANCTION_ORDER&block_id=<id>
    resp_export_order = client.get(f'/api/v1/analytics/reports/export/?type=SANCTION_ORDER&block_id={master_block.id}')
    print(f"  ✓ GET /api/v1/analytics/reports/export/?type=SANCTION_ORDER -> HTTP {resp_export_order.status_code}")
    assert resp_export_order.status_code == 200, f"Expected HTTP 200, got {resp_export_order.status_code}"
    assert resp_export_order['Content-Type'] == 'application/pdf'

    print("\n" + "=" * 70)
    print("ALL 8 VERIFICATION CHECKS PASSED SUCCESSFULLY (100% PASS)")
    print("Official Sanction Order & Corridor Bulletin PDF Generation Verified!")
    print("=" * 70)

if __name__ == '__main__':
    run_verification()
