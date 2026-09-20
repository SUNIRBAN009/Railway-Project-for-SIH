"""
Views for Operations Analytics & KPI Intelligence Service (SVC-ANA).
Authoritative reference: docs/03-service-blueprints/07-analytics.md
"""
import logging
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, permissions, viewsets
from rest_framework.views import APIView

from apps.accounts.api_envelope import ApiResponse
from apps.analytics.models import CorridorDailyKPI, BlockEfficiencyRecord
from apps.analytics.serializers import (
    CorridorDailyKPISerializer,
    BlockEfficiencyRecordSerializer,
)
from apps.analytics.services.kpi_aggregation_service import KPIAggregationService
from apps.analytics.services.pdf_report_service import ExecutivePDFReportGenerator

logger = logging.getLogger(__name__)


class CorridorDailyKPIViewSet(viewsets.ReadOnlyModelViewSet):
    """
    CRUD/Listing endpoint for historical CorridorDailyKPI records.
    GET /api/v1/analytics/kpi/
    """
    queryset = CorridorDailyKPI.objects.all()
    serializer_class = CorridorDailyKPISerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['division_code', 'corridor_code', 'metric_date']


class DashboardSummaryView(APIView):
    """
    FUNC-ANA-001: Operations Dashboard Executive Summary.
    GET /api/v1/analytics/dashboard/summary/
    Query parameters:
      - division: Division code (default: 'DLI')
      - corridor: Corridor code (default: 'NDLS-CNB', or 'ALL')
      - range: Days range ('7d', '14d', '30d')
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        division = request.query_params.get('division', 'DLI')
        corridor = request.query_params.get('corridor', 'NDLS-CNB')
        range_param = request.query_params.get('range', '7d')

        days_range = 7
        if range_param.endswith('d'):
            try:
                days_range = int(range_param[:-1])
            except ValueError:
                days_range = 7

        summary = KPIAggregationService.get_dashboard_summary(
            division_code=division,
            corridor_code=corridor,
            days_range=days_range
        )
        return ApiResponse.success(data=summary)


class CorridorDailyKPIOLAPRecalculateView(APIView):
    """
    POST /api/v1/analytics/kpi/recalculate/
    Triggers an immediate OLAP recalculation for a corridor or all corridors.
    Request body (optional):
      - corridor: Corridor code (e.g. 'NDLS-CNB-MAIN', or 'ALL')
      - date: Target date 'YYYY-MM-DD' (defaults to today)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        corridor = request.data.get('corridor')
        date_str = request.data.get('date')
        target_date = None
        if date_str:
            try:
                target_date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return ApiResponse.error(
                    message="Invalid date format. Expected YYYY-MM-DD.",
                    code="INVALID_DATE_FORMAT",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
        else:
            target_date = timezone.now().date()

        if corridor and corridor != 'ALL':
            kpi = KPIAggregationService.compute_corridor_kpi(corridor_code=corridor, target_date=target_date)
            serializer = CorridorDailyKPISerializer(kpi)
            return ApiResponse.success(
                data={
                    "corridor": corridor,
                    "target_date": str(target_date),
                    "kpi": serializer.data,
                    "recalculated": True
                },
                message=f"OLAP KPI recalculated successfully for corridor {corridor}."
            )
        else:
            kpi_list = KPIAggregationService.recalculate_all_corridors_olap(target_date=target_date)
            serializer = CorridorDailyKPISerializer(kpi_list, many=True)
            return ApiResponse.success(
                data={
                    "total_corridors": len(kpi_list),
                    "target_date": str(target_date),
                    "kpis": serializer.data,
                    "recalculated": True
                },
                message=f"OLAP KPIs recalculated successfully for {len(kpi_list)} corridors."
            )


class CorridorComparisonView(APIView):
    """
    GET /api/v1/analytics/corridors/comparison/
    Compares operational efficiency metrics across different corridors.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        comparison = KPIAggregationService.get_corridor_comparison()
        return ApiResponse.success(data=comparison)


class BlockEfficiencyListView(APIView):
    """
    GET /api/v1/analytics/block-efficiency/
    Returns granular block execution audits and burst overtime tracking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        corridor = request.query_params.get('corridor', 'NDLS-CNB')
        limit = int(request.query_params.get('limit', 20))
        records = KPIAggregationService.get_block_efficiency_records(corridor_code=corridor, limit=limit)
        return ApiResponse.success(data=records)


class ReportExportView(APIView):
    """
    GET /api/v1/analytics/reports/export/
    Query parameters:
      - type: 'PDF' or 'MONTHLY_PDF'
      - division: Division code (default: 'DLI')
      - corridor: Corridor code (default: 'NDLS-CNB')
      - range: '7d' or '30d'
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        report_type = request.query_params.get('type', 'PDF').upper()
        division = request.query_params.get('division', 'DLI')
        corridor = request.query_params.get('corridor', 'NDLS-CNB')
        range_str = request.query_params.get('range', '7d')

        days_range = 30 if 'MONTHLY' in report_type or range_str == '30d' else 7

        try:
            pdf_bytes = ExecutivePDFReportGenerator.generate_executive_report(
                division_code=division,
                corridor_code=corridor,
                days_range=days_range
            )
            filename = f"IR_Executive_Audit_{corridor}_{timezone.now().strftime('%Y%m%d')}.pdf"
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as exc:
            logger.error("Failed to generate PDF report: %s", exc)
            return ApiResponse.error(
                message=f"PDF generation failure: {exc}",
                code="PDF_GENERATION_FAILED",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
