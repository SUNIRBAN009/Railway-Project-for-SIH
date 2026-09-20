import logging
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.accounts.api_envelope import ApiResponse
from apps.assets.models import TrackAsset, AssetDefectLog
from apps.assets.serializers import (
    TrackAssetListSerializer,
    TrackAssetDetailSerializer,
    AssetDefectLogSerializer,
    DefectRegistrationSerializer,
    TQICalculationSerializer,
)
from apps.assets.services import AssetHealthService

logger = logging.getLogger(__name__)


class TrackAssetListView(APIView):
    """
    FUNC-AST-001: Query Asset Inventory & Health.
    Query parameters:
      - corridor: Corridor UUID or corridor code
      - category: AssetCategory enum
      - health_below: Upper bound filter for current_health_score
      - line_type: LineType enum
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        queryset = TrackAsset.objects.select_related('corridor').prefetch_related('defects')

        corridor_param = request.query_params.get('corridor')
        if corridor_param:
            if len(corridor_param) == 36 and '-' in corridor_param:
                queryset = queryset.filter(corridor__id=corridor_param)
            else:
                queryset = queryset.filter(corridor__code=corridor_param)

        category_param = request.query_params.get('category')
        if category_param:
            queryset = queryset.filter(asset_category=category_param)

        health_below = request.query_params.get('health_below')
        if health_below:
            try:
                queryset = queryset.filter(current_health_score__lte=float(health_below))
            except ValueError:
                pass

        line_type_param = request.query_params.get('line_type')
        if line_type_param:
            queryset = queryset.filter(line_type=line_type_param)

        serializer = TrackAssetListSerializer(queryset, many=True)
        return ApiResponse.success(data=serializer.data)


class TrackAssetDetailView(APIView):
    """
    Query full asset detail including inspection defect history.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, asset_tag_or_id, *args, **kwargs):
        try:
            if len(asset_tag_or_id) == 36 and '-' in asset_tag_or_id:
                asset = TrackAsset.objects.select_related('corridor').prefetch_related('defects').get(id=asset_tag_or_id)
            else:
                asset = TrackAsset.objects.select_related('corridor').prefetch_related('defects').get(asset_tag=asset_tag_or_id)
        except TrackAsset.DoesNotExist:
            return ApiResponse.error(
                code='AST-001',
                message=f"Track asset not found: '{asset_tag_or_id}'",
                status_code=status.HTTP_404_NOT_FOUND
            )

        serializer = TrackAssetDetailSerializer(asset)
        return ApiResponse.success(data=serializer.data)


class AssetDefectCreateView(APIView):
    """
    FUNC-AST-002: Register Defect & Flaw Reading.
    Recalibrates asset degradation score and automatically provisions
    an Emergency Block in SVC-BLK if defect is CRITICAL_IMMEDIATE_STOP or USFD depth > 12mm.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = DefectRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='AST-400',
                message='Invalid defect registration payload',
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        asset_input = serializer.validated_data['asset_id']
        try:
            if len(asset_input) == 36 and '-' in asset_input:
                asset = TrackAsset.objects.get(id=asset_input)
            else:
                asset = TrackAsset.objects.get(asset_tag=asset_input)
        except TrackAsset.DoesNotExist:
            return ApiResponse.error(
                code='AST-001',
                message=f"Target asset not found: '{asset_input}'",
                status_code=status.HTTP_404_NOT_FOUND
            )

        defect, emergency_block = AssetHealthService.register_defect(asset, serializer.validated_data)
        defect_serializer = AssetDefectLogSerializer(defect)

        response_data = {
            'defect': defect_serializer.data,
            'asset_health_score': float(asset.current_health_score),
            'emergency_block_created': emergency_block is not None,
        }
        if emergency_block:
            response_data['emergency_block'] = {
                'id': str(emergency_block.id),
                'block_code': emergency_block.block_code,
                'start_km': float(emergency_block.start_km),
                'end_km': float(emergency_block.end_km),
                'status': emergency_block.status,
                'caution_order_id': emergency_block.caution_order_id,
            }

        return ApiResponse.success(
            data=response_data,
            message="Defect registered and health score updated successfully.",
            status_code=status.HTTP_201_CREATED
        )


class MaintenanceRecommendationsView(APIView):
    """
    FUNC-AST-003: Get Predictive Block Recommendations.
    Returns prioritized track segments needing blocks based on health degradation and TQI.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        corridor_id = request.query_params.get('corridor')
        recommendations = AssetHealthService.get_maintenance_recommendations(corridor_id=corridor_id)
        return ApiResponse.success(data=recommendations)


class TQICalculateView(APIView):
    """
    Calculates Track Quality Index (TQI) from TRC measurements and optionally updates target asset.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = TQICalculationSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='AST-400',
                message='Invalid TQI calculation input parameters',
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        result = AssetHealthService.calculate_tqi(
            unevenness_sd=data['unevenness_sd'],
            alignment_sd=data['alignment_sd'],
            twist_sd=data['twist_sd'],
            gauge_sd=data['gauge_sd'],
        )

        asset_id = data.get('asset_id')
        if asset_id:
            try:
                if len(asset_id) == 36 and '-' in asset_id:
                    asset = TrackAsset.objects.get(id=asset_id)
                else:
                    asset = TrackAsset.objects.get(asset_tag=asset_id)
                asset.tqi_index = result['tqi_value']
                # Recalculate health score with new TQI
                asset.current_health_score = AssetHealthService.calculate_health_score(asset, inspection_tqi=result['tqi_value'])
                asset.save(update_fields=['tqi_index', 'current_health_score'])
                result['asset_tag'] = asset.asset_tag
                result['updated_health_score'] = float(asset.current_health_score)
            except TrackAsset.DoesNotExist:
                pass

        return ApiResponse.success(data=result)


class AssetDefectLogViewSet(ReadOnlyModelViewSet):
    """
    REST ReadOnly ViewSet for browsing defect logs.
    """
    queryset = AssetDefectLog.objects.select_related('asset', 'asset__corridor').all()
    serializer_class = AssetDefectLogSerializer
    permission_classes = [permissions.IsAuthenticated]


class RiskMatrixScoringView(APIView):
    """
    FUNC-AST-008: CoF × LoF Risk Matrix Priority Scoring (Feature #92, #93, #94).
    Calculates 5x5 heatmap grid, ranked defect prioritizations, and 'Why #1?' AI rationale.
    Query parameters:
      - corridor: Corridor UUID or corridor code (e.g. NDLS-CNB-MAIN)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        corridor_param = request.query_params.get('corridor')
        queryset = AssetDefectLog.objects.filter(is_rectified=False).select_related('asset', 'asset__corridor')

        if corridor_param:
            if len(corridor_param) == 36 and '-' in corridor_param:
                queryset = queryset.filter(asset__corridor__id=corridor_param)
            else:
                queryset = queryset.filter(asset__corridor__code=corridor_param)

        defects = list(queryset)

        # 1. Build 5x5 Matrix Grid (CoF 1-5 x LoF 1-5)
        grid = {}
        for cof in range(1, 6):
            for lof in range(1, 6):
                risk_info = AssetHealthService.calculate_risk_matrix_score(cof, lof, corridor_is_critical=True)
                cell_key = f"{cof}x{lof}"
                grid[cell_key] = {
                    "cof": cof,
                    "lof": lof,
                    "base_risk": risk_info["base_risk"],
                    "final_risk_score": risk_info["final_risk_score"],
                    "category": risk_info["category"],
                    "recommended_action": risk_info["recommended_action"],
                    "defect_count": 0,
                    "defects": [],
                }

        # 2. Populate defects into grid and prepare ranked defect data
        ranked_defects = []
        summary = {
            "total_active_defects": len(defects),
            "extreme_risk_count": 0,
            "high_risk_count": 0,
            "medium_risk_count": 0,
            "low_risk_count": 0,
        }

        for d in defects:
            cof = d.cof_score
            lof = d.lof_score
            is_critical = getattr(d.asset.corridor, 'is_critical', True)
            risk_info = AssetHealthService.calculate_risk_matrix_score(cof, lof, is_critical)
            aging = d.aging_score
            why_exp = AssetHealthService.generate_why_explanation(d, risk_info, aging)

            defect_entry = {
                "id": str(d.id),
                "defect_code": d.defect_code,
                "asset_tag": d.asset.asset_tag,
                "corridor_code": d.asset.corridor.code,
                "location_km": float(d.asset.location_km),
                "defect_type": d.defect_type,
                "defect_type_display": d.get_defect_type_display(),
                "severity": d.severity,
                "severity_display": d.get_severity_display(),
                "cof_score": cof,
                "lof_score": lof,
                "overdue_days": d.overdue_days,
                "final_risk_score": risk_info["final_risk_score"],
                "category": risk_info["category"],
                "recommended_action": risk_info["recommended_action"],
                "aging_score": aging,
                "flaw_depth_mm": float(d.flaw_depth_mm) if d.flaw_depth_mm else None,
                "emergency_block_id": d.emergency_block_id,
                "why_explanation": why_exp,
            }

            cell_key = f"{cof}x{lof}"
            if cell_key in grid:
                grid[cell_key]["defect_count"] += 1
                grid[cell_key]["defects"].append({
                    "defect_code": d.defect_code,
                    "asset_tag": d.asset.asset_tag,
                    "location_km": float(d.asset.location_km),
                    "severity": d.severity,
                })

            cat = risk_info["category"]
            if cat == "EXTREME_RISK":
                summary["extreme_risk_count"] += 1
            elif cat == "HIGH_RISK":
                summary["high_risk_count"] += 1
            elif cat == "MEDIUM_RISK":
                summary["medium_risk_count"] += 1
            else:
                summary["low_risk_count"] += 1

            ranked_defects.append(defect_entry)

        # 3. Sort ranked defects by (final_risk_score DESC, aging_score DESC, overdue_days DESC)
        ranked_defects.sort(
            key=lambda x: (x["final_risk_score"], x["aging_score"], x["overdue_days"]),
            reverse=True
        )

        # 4. Generate Top Priority #1 Explanation Card
        why_number_one = None
        if ranked_defects:
            top = ranked_defects[0]
            why_number_one = {
                "rank": 1,
                "defect_code": top["defect_code"],
                "asset_tag": top["asset_tag"],
                "location_km": top["location_km"],
                "corridor_code": top["corridor_code"],
                "final_risk_score": top["final_risk_score"],
                "category": top["category"],
                "aging_score": top["aging_score"],
                "overdue_days": top["overdue_days"],
                "recommended_action": top["recommended_action"],
                "rationale": top["why_explanation"],
            }

        response_payload = {
            "summary": summary,
            "grid_cells": list(grid.values()),
            "why_number_one": why_number_one,
            "ranked_defects": ranked_defects,
        }

        return ApiResponse.success(data=response_payload)
