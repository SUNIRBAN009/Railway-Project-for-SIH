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
from apps.analytics.services.pdf_report_service import ExecutivePDFReportGenerator, BlockSanctionOrderPDFGenerator
from apps.blocks.models import Block, BlockStatus

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


class BlockSanctionOrderPDFView(APIView):
    """
    FUNC-ANL-005: Official Sanction Order & Bulletin PDF Generator (Feature #107).
    Authoritative reference: docs/04-function-maps/07-analytics-function-map.md
    GET /api/v1/analytics/reports/sanction-order/<uuid:block_id>/
    GET /api/v1/analytics/reports/sanction-order/?block_id=...&corridor=...
    POST /api/v1/analytics/reports/sanction-order/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, block_id=None, *args, **kwargs):
        target_id = block_id or request.query_params.get('block_id')
        block_code = request.query_params.get('block_code')
        corridor = request.query_params.get('corridor')
        division = request.query_params.get('division', 'DLI')

        try:
            if target_id or block_code:
                if target_id:
                    block = Block.objects.select_related('corridor', 'requested_by', 'sanctioned_by').get(id=target_id)
                else:
                    block = Block.objects.select_related('corridor', 'requested_by', 'sanctioned_by').get(block_code=block_code)

                pdf_bytes = BlockSanctionOrderPDFGenerator.generate_sanction_order_pdf(block, division_code=division)
                filename = f"IR_Sanction_Order_{block.block_code}.pdf"
                response = HttpResponse(pdf_bytes, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            elif corridor:
                pdf_bytes = BlockSanctionOrderPDFGenerator.generate_corridor_sanction_bulletin_pdf(
                    corridor_code=corridor,
                    division_code=division
                )
                filename = f"IR_Sanction_Bulletin_{corridor}_{timezone.now().strftime('%Y%m%d')}.pdf"
                response = HttpResponse(pdf_bytes, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            else:
                # Fallback to most recent sanctioned block if any exists
                recent_block = Block.objects.filter(
                    status__in=[BlockStatus.SANCTIONED, BlockStatus.ACTIVE, BlockStatus.COMPLETED]
                ).first()
                if recent_block:
                    pdf_bytes = BlockSanctionOrderPDFGenerator.generate_sanction_order_pdf(recent_block, division_code=division)
                    filename = f"IR_Sanction_Order_{recent_block.block_code}.pdf"
                    response = HttpResponse(pdf_bytes, content_type='application/pdf')
                    response['Content-Disposition'] = f'attachment; filename="{filename}"'
                    return response

                return ApiResponse.error(
                    message="Missing parameter: Please provide block_id, block_code, or corridor.",
                    code="MISSING_TARGET_BLOCK",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
        except Block.DoesNotExist:
            return ApiResponse.error(
                message="Specified block not found.",
                code="BLOCK_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as exc:
            logger.error("Failed to generate Sanction Order PDF: %s", exc)
            return ApiResponse.error(
                message=f"Sanction Order PDF generation failure: {exc}",
                code="PDF_GENERATION_FAILED",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request, *args, **kwargs):
        block_id = request.data.get('block_id')
        block_code = request.data.get('block_code')
        corridor = request.data.get('corridor_code') or request.data.get('corridor')
        division = request.data.get('division_code', 'DLI')
        req_format = request.data.get('format', 'PDF').upper()

        try:
            if block_id or block_code:
                if block_id:
                    block = Block.objects.select_related('corridor', 'requested_by', 'sanctioned_by').get(id=block_id)
                else:
                    block = Block.objects.select_related('corridor', 'requested_by', 'sanctioned_by').get(block_code=block_code)

                pdf_bytes = BlockSanctionOrderPDFGenerator.generate_sanction_order_pdf(block, division_code=division)
                filename = f"IR_Sanction_Order_{block.block_code}.pdf"
            elif corridor:
                pdf_bytes = BlockSanctionOrderPDFGenerator.generate_corridor_sanction_bulletin_pdf(
                    corridor_code=corridor,
                    division_code=division
                )
                filename = f"IR_Sanction_Bulletin_{corridor}_{timezone.now().strftime('%Y%m%d')}.pdf"
            else:
                return ApiResponse.error(
                    message="Either block_id, block_code, or corridor_code is required in POST payload.",
                    code="MISSING_PARAMETERS",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            if req_format == 'JSON':
                return ApiResponse.success(
                    data={
                        "download_url": f"/api/v1/analytics/reports/sanction-order/{block.id if (block_id or block_code) else ''}",
                        "filename": filename,
                        "bytes_length": len(pdf_bytes),
                        "status": "GENERATED"
                    },
                    message="Sanction Order PDF compiled successfully.",
                    status_code=status.HTTP_201_CREATED
                )

            response = HttpResponse(pdf_bytes, content_type='application/pdf', status=status.HTTP_201_CREATED)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Block.DoesNotExist:
            return ApiResponse.error(
                message="Target block not found.",
                code="BLOCK_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as exc:
            logger.error("POST Sanction Order PDF failed: %s", exc)
            return ApiResponse.error(
                message=f"Sanction Order PDF compilation failure: {exc}",
                code="PDF_GENERATION_FAILED",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReportExportView(APIView):
    """
    GET /api/v1/analytics/reports/export/
    Query parameters:
      - type: 'PDF', 'MONTHLY_PDF', 'SANCTION_ORDER', 'SANCTION_BULLETIN'
      - block_id: Target block UUID (if type=SANCTION_ORDER)
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
        block_id = request.query_params.get('block_id')

        try:
            if report_type == 'SANCTION_ORDER' and block_id:
                block = Block.objects.select_related('corridor', 'requested_by', 'sanctioned_by').get(id=block_id)
                pdf_bytes = BlockSanctionOrderPDFGenerator.generate_sanction_order_pdf(block, division_code=division)
                filename = f"IR_Sanction_Order_{block.block_code}.pdf"
            elif report_type in ['SANCTION_BULLETIN', 'BULLETIN']:
                pdf_bytes = BlockSanctionOrderPDFGenerator.generate_corridor_sanction_bulletin_pdf(
                    corridor_code=corridor,
                    division_code=division
                )
                filename = f"IR_Sanction_Bulletin_{corridor}_{timezone.now().strftime('%Y%m%d')}.pdf"
            else:
                days_range = 30 if 'MONTHLY' in report_type or range_str == '30d' else 7
                pdf_bytes = ExecutivePDFReportGenerator.generate_executive_report(
                    division_code=division,
                    corridor_code=corridor,
                    days_range=days_range
                )
                filename = f"IR_Executive_Audit_{corridor}_{timezone.now().strftime('%Y%m%d')}.pdf"

            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Block.DoesNotExist:
            return ApiResponse.error(
                message=f"Block with ID {block_id} not found.",
                code="BLOCK_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as exc:
            logger.error("Failed to generate PDF report: %s", exc)
            return ApiResponse.error(
                message=f"PDF generation failure: {exc}",
                code="PDF_GENERATION_FAILED",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

