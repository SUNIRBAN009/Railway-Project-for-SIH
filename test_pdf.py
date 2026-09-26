import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
django.setup()

from apps.analytics.services.pdf_report_service import ExecutivePDFReportGenerator

try:
    pdf_bytes = ExecutivePDFReportGenerator.generate_executive_report(
        division_code='DLI',
        corridor_code='NDLS-CNB',
        days_range=7
    )
    with open('test_report.pdf', 'wb') as f:
        f.write(pdf_bytes)
    print("PDF generated successfully.")
except Exception as e:
    import traceback
    traceback.print_exc()
