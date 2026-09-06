import logging
import uuid
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet
from django.core.cache import cache
from django.conf import settings

from apps.accounts.api_envelope import ApiResponse
from apps.blocks.models import Block
from apps.ontology.models import OntologyGraph, SemanticViolation
from apps.ontology.serializers import (
    ReasoningTriggerSerializer,
    SemanticViolationSerializer,
    OntologyGraphSerializer,
)
from apps.ontology.services import DigitalTwinService
from apps.ontology.tasks import run_hermit_reasoner

logger = logging.getLogger(__name__)


class OntologyReasoningTriggerView(APIView):
    """
    FUNC-ONTO-001: Trigger HermiT Description Logic Inference Job.
    Dispatches asynchronous reasoning sweep to dedicated 'ontology' Celery worker.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ReasoningTriggerSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='ONTO-400',
                message='Invalid reasoning request payload',
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        block_input = serializer.validated_data['block_id']

        # Verify block exists
        block = None
        try:
            if len(block_input) == 36 and '-' in block_input:
                block = Block.objects.get(id=block_input)
            else:
                block = Block.objects.get(block_code=block_input)
        except Block.DoesNotExist:
            return ApiResponse.error(
                code='BLK-001',
                message=f'Block not found: {block_input}',
                status_code=status.HTTP_404_NOT_FOUND
            )

        job_id = str(uuid.uuid4())
        cache_key = f"ontology:job:{job_id}"
        cache.set(cache_key, {
            "status": "QUEUED",
            "progress": 0,
            "job_id": job_id,
            "block_id": str(block.id),
        }, timeout=3600)

        # Dispatch Celery task, falling back to direct run if eager or broker unavailable
        try:
            if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                run_hermit_reasoner(job_id, str(block.id))
            else:
                run_hermit_reasoner.apply_async(args=[job_id, str(block.id)], queue='ontology')
        except Exception as exc:
            logger.warning(f"Celery async dispatch failed ({exc}). Executing synchronously.")
            run_hermit_reasoner(job_id, str(block.id))

        status_url = f"/api/v1/ontology/jobs/{job_id}/"
        return ApiResponse.success(
            data={
                "job_id": job_id,
                "status_check_url": status_url,
            },
            extra={
                "job_id": job_id,
                "status_check_url": status_url,
            },
            status_code=status.HTTP_202_ACCEPTED
        )


class OntologyJobStatusView(APIView):
    """
    FUNC-ONTO-002: Fetch Reasoning Job Status & Results.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id, *args, **kwargs):
        cache_key = f"ontology:job:{job_id}"
        job_data = cache.get(cache_key)

        if not job_data:
            return ApiResponse.error(
                code='ONTO-404',
                message=f"Reasoning job '{job_id}' not found or expired",
                status_code=status.HTTP_404_NOT_FOUND
            )

        return ApiResponse.success(data=job_data)


class SemanticViolationListView(APIView):
    """
    FUNC-ONTO-003: Query Semantic Violations with Formal Proof Narratives.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        block_id = request.query_params.get('block_id')
        queryset = SemanticViolation.objects.all()

        if block_id:
            # Match either UUID id or block_code from Block table
            block_uuids = [block_id]
            try:
                b = Block.objects.filter(block_code=block_id).first()
                if b:
                    block_uuids.append(str(b.id))
            except Exception:
                pass
            queryset = queryset.filter(block_id__in=block_uuids)

        serializer = SemanticViolationSerializer(queryset, many=True)
        return ApiResponse.success(data=serializer.data)


class OntologyGraphSummaryView(APIView):
    """
    FUNC-ONTO-004: Query Digital Twin Active Graph Summary & Metrics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            summary = DigitalTwinService.get_graph_summary()
            return ApiResponse.success(data=summary)
        except Exception as exc:
            logger.exception(f"Failed to generate ontology graph summary: {exc}")
            return ApiResponse.error(
                code='ONTO-500',
                message=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SemanticViolationViewSet(ReadOnlyModelViewSet):
    """
    REST ReadOnly ViewSet for browsing semantic violations.
    """
    queryset = SemanticViolation.objects.all()
    serializer_class = SemanticViolationSerializer
    permission_classes = [permissions.IsAuthenticated]
