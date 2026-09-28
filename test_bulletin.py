import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
django.setup()

from apps.analytics.services.pdf_report_service import BlockSanctionOrderPDFGenerator

try:
    pdf_bytes = BlockSanctionOrderPDFGenerator.generate_corridor_sanction_bulletin_pdf(
        corridor_code='NDLS-CNB',
        division_code='DLI'
    )
    with open('test_bulletin.pdf', 'wb') as f:
        f.write(pdf_bytes)
    print(f"Corridor Sanction Bulletin generated successfully. Size: {len(pdf_bytes)} bytes.")
except Exception as e:
    import traceback
    traceback.print_exc()
