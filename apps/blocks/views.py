import datetime
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework import permissions, status

from apps.accounts.api_envelope import ApiResponse
from apps.accounts.permissions import (
    IsChiefController,
    IsSectionController,
    IsDepartmentalEngineer,
    controller_required,
    engineer_required,
)
from apps.blocks.models import Corridor, Block, BlockConflict, BlockStatus, LineType, WorkType
from apps.accounts.models import DepartmentCode
from apps.blocks.serializers import (
    CorridorSerializer,
    BlockDetailSerializer,
    BlockProposalCreateSerializer,
    BlockSanctionSerializer,
    BlockActivationSerializer,
    BlockCompletionSerializer,
)
from apps.blocks.conflict_engine import ConflictDetector


# ============================================================================
# REST API Controllers (SVC-BLK)
# ============================================================================

class BlockProposalCreateAPIView(APIView):
    """
    FUNC-BLK-001: Submit Block Proposal
    POST /api/v1/blocks/proposals/
    """
    permission_classes = [permissions.IsAuthenticated, IsDepartmentalEngineer]

    def post(self, request):
        serializer = BlockProposalCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='BLK-400',
                message='Block proposal validation failed.',
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        dept = data['department_code']
        today_str = timezone.now().strftime('%Y%m%d')
        seq = Block.objects.filter(block_code__startswith=f"BLK-{today_str}").count() + 1
        block_code = f"BLK-{today_str}-{dept}-{seq:03d}"

        block = Block.objects.create(
            block_code=block_code,
            corridor=data['corridor'],
            line_type=data.get('line_type', LineType.DOWN),
            department_code=dept,
            work_type=data.get('work_type', WorkType.TRACK_TAMPING),
            requested_by=request.user,
            start_km=data['start_km'],
            end_km=data['end_km'],
            scheduled_start_time=data['scheduled_start_time'],
            scheduled_end_time=data['scheduled_end_time'],
            traction_power_cutoff_required=data.get('traction_power_cutoff_required', False),
            gang_id=data.get('gang_id', ''),
            equipment_required=data.get('equipment_required', ''),
            work_description=data.get('work_description', ''),
            status=BlockStatus.PENDING_APPROVAL,
        )

        # Execute automatic spatial-temporal sweep-line conflict detection
        detector = ConflictDetector(block)
        sweep_report = detector.run_sweep()

        detail_serializer = BlockDetailSerializer(block)
        return ApiResponse.success(
            data={
                **detail_serializer.data,
                'sweep_report': sweep_report,
            },
            message=f"Block proposal {block.block_code} created and conflict sweep evaluated.",
            status_code=status.HTTP_201_CREATED
        )


class BlockListAPIView(APIView):
    """
    FUNC-BLK-002: List & Filter Block Schedule
    GET /api/v1/blocks/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Block.objects.select_related('corridor', 'requested_by').prefetch_related('conflicts').all()

        dept = request.query_params.get('department')
        corridor_code = request.query_params.get('corridor')
        status_filter = request.query_params.get('status')
        date_str = request.query_params.get('date')

        if dept:
            qs = qs.filter(department_code=dept.upper())
        if corridor_code:
            qs = qs.filter(corridor__code=corridor_code)
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        if date_str:
            try:
                target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
                qs = qs.filter(scheduled_start_time__date=target_date)
            except ValueError:
                pass

        serializer = BlockDetailSerializer(qs[:100], many=True)
        return ApiResponse.success(data=serializer.data, extra={'total_records': qs.count()})


class BlockDetailAPIView(APIView):
    """
    FUNC-BLK-003: Retrieve Block Detailed Profile with Conflicts
    GET /api/v1/blocks/<id>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        block = get_object_or_404(Block.objects.select_related('corridor', 'requested_by').prefetch_related('conflicts'), id=pk)
        serializer = BlockDetailSerializer(block)
        return ApiResponse.success(data=serializer.data)


class BlockValidateAPIView(APIView):
    """
    FUNC-BLK-004: Synchronous Spatial-Temporal Conflict Sweep
    POST /api/v1/blocks/<id>/validate/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        block = get_object_or_404(Block, id=pk)
        detector = ConflictDetector(block)
        results = detector.run_sweep()
        return ApiResponse.success(data=results, message='Conflict sweep completed.')


class BlockSanctionAPIView(APIView):
    """
    FUNC-BLK-005: Sanction Block Possession with Optimistic Concurrency Control
    POST /api/v1/blocks/<id>/sanction/
    """
    permission_classes = [permissions.IsAuthenticated, IsChiefController]

    def post(self, request, pk):
        block = get_object_or_404(Block, id=pk)
        serializer = BlockSanctionSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(code='BLK-400', message='Sanction input invalid.', details=serializer.errors)

        submitted_version = serializer.validated_data['version']
        action = serializer.validated_data['action']
        remarks = serializer.validated_data.get('remarks', '')

        # Optimistic Locking Check (TSK-P2-006)
        if block.version != submitted_version:
            return ApiResponse.error(
                code='BLK-409',
                message=f'Concurrency Conflict: Block was modified by another controller. (Current version: {block.version}, Submitted: {submitted_version})',
                status_code=status.HTTP_409_CONFLICT
            )

        if action == 'SANCTION':
            if not block.can_transition_to(BlockStatus.SANCTIONED):
                return ApiResponse.error(
                    code='BLK-400',
                    message=f"Cannot transition from {block.status} to SANCTIONED."
                )
            block.status = BlockStatus.SANCTIONED
            block.sanctioned_by = request.user
            block.sanctioned_at = timezone.now()
            block.version += 1
            block.save()
            msg = f"Block {block.block_code} sanctioned by Chief Controller {request.user.username}."
        else: # REJECT
            block.status = BlockStatus.REJECTED
            block.rejection_reason = remarks
            block.version += 1
            block.save()
            msg = f"Block {block.block_code} rejected by Chief Controller."

        return ApiResponse.success(data=BlockDetailSerializer(block).data, message=msg)


class BlockActivateAPIView(APIView):
    """
    FUNC-BLK-006: Activate Track Possession (Caution Order validation)
    POST /api/v1/blocks/<id>/activate/
    """
    permission_classes = [permissions.IsAuthenticated, IsSectionController]

    def post(self, request, pk):
        block = get_object_or_404(Block, id=pk)
        serializer = BlockActivationSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(code='BLK-400', message='Caution order required.', details=serializer.errors)

        if not block.can_transition_to(BlockStatus.ACTIVE):
            return ApiResponse.error(code='BLK-400', message=f"Block cannot be activated from status {block.status}.")

        block.caution_order_id = serializer.validated_data['caution_order_id']
        block.status = BlockStatus.ACTIVE
        block.actual_start_time = timezone.now()
        block.version += 1
        block.save()

        return ApiResponse.success(
            data=BlockDetailSerializer(block).data,
            message=f"Caution Order {block.caution_order_id} enforced. Track possession {block.block_code} ACTIVE."
        )


class BlockCompleteAPIView(APIView):
    """
    FUNC-BLK-007: Clear & Complete Track Block (Safety Sign-off)
    POST /api/v1/blocks/<id>/complete/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        block = get_object_or_404(Block, id=pk)
        serializer = BlockCompletionSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(code='BLK-400', message='Safety certificate required.', details=serializer.errors)

        if not serializer.validated_data['track_fit_certified']:
            return ApiResponse.error(code='BLK-400', message='Track fit certification must be explicitly affirmed.')

        block.status = BlockStatus.COMPLETED
        block.track_fit_certified = True
        block.actual_end_time = timezone.now()
        block.version += 1
        block.save()

        return ApiResponse.success(
            data=BlockDetailSerializer(block).data,
            message=f"Block {block.block_code} completed. Safety handback verified."
        )


class BlockCancelAPIView(APIView):
    """
    FUNC-BLK-008: Cancel Proposed Block
    POST /api/v1/blocks/<id>/cancel/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        block = get_object_or_404(Block, id=pk)
        block.status = BlockStatus.CANCELLED
        block.version += 1
        block.save()
        return ApiResponse.success(data=BlockDetailSerializer(block).data, message=f"Block {block.block_code} cancelled.")


# ============================================================================
# Server-Side Rendered Views (HTMX + Alpine.js + Leaflet.js)
# ============================================================================

@login_required
def corridor_map_view(request):
    """
    TSK-P2-022: Interactive Corridor GIS Map View (Leaflet.js + OSM).
    Displays real-time track geometry, station waypoints, and block possession overlays.
    """
    corridors = Corridor.objects.all()
    active_blocks = Block.objects.filter(status__in=[BlockStatus.SANCTIONED, BlockStatus.ACTIVE, BlockStatus.PENDING_APPROVAL, BlockStatus.CONFLICT_DETECTED])
    
    return render(request, 'blocks/corridor_map.html', {
        'corridors': corridors,
        'active_blocks': active_blocks,
    })


@login_required
def timeline_gantt_view(request):
    """
    TSK-P2-023: 24-Hour Gantt / Timeline View of Maintenance Blocks.
    Visualizes parallel department windows and shadow-block co-possessions.
    """
    blocks = Block.objects.select_related('corridor').order_by('scheduled_start_time')[:30]
    return render(request, 'blocks/timeline_gantt.html', {
        'blocks': blocks,
    })


@login_required
@controller_required
def sanction_dashboard_view(request):
    """
    TSK-P2-024: Chief Controller Block Sanction Console.
    Allows 1-click HTMX approval, conflict review, and shadow optimization.
    """
    pending_blocks = Block.objects.filter(status__in=[
        BlockStatus.PENDING_APPROVAL,
        BlockStatus.COORDINATED,
        BlockStatus.CONFLICT_DETECTED
    ]).select_related('corridor').prefetch_related('conflicts')

    sanctioned_blocks = Block.objects.filter(status=BlockStatus.SANCTIONED).select_related('corridor')[:10]

    return render(request, 'blocks/sanction_dashboard.html', {
        'pending_blocks': pending_blocks,
        'sanctioned_blocks': sanctioned_blocks,
    })


@login_required
@engineer_required
def proposal_form_view(request):
    """
    Departmental Block Proposal Submission Form with HTMX live pre-check.
    """
    corridors = Corridor.objects.all()
    
    if request.method == 'POST':
        corridor_id = request.POST.get('corridor')
        corridor = get_object_or_404(Corridor, id=corridor_id)
        
        dept = request.POST.get('department_code', DepartmentCode.ENG)
        start_km = float(request.POST.get('start_km', 0.0))
        end_km = float(request.POST.get('end_km', 5.0))
        start_time_str = request.POST.get('start_time')
        end_time_str = request.POST.get('end_time')
        work_type = request.POST.get('work_type', WorkType.TRACK_TAMPING)
        traction_cut = bool(request.POST.get('traction_cutoff'))
        description = request.POST.get('description', '')

        t_start = timezone.datetime.fromisoformat(start_time_str)
        t_end = timezone.datetime.fromisoformat(end_time_str)

        today_str = timezone.now().strftime('%Y%m%d')
        seq = Block.objects.filter(block_code__startswith=f"BLK-{today_str}").count() + 1
        block_code = f"BLK-{today_str}-{dept}-{seq:03d}"

        block = Block.objects.create(
            block_code=block_code,
            corridor=corridor,
            line_type=LineType.DOWN,
            department_code=dept,
            work_type=work_type,
            requested_by=request.user,
            start_km=start_km,
            end_km=end_km,
            scheduled_start_time=t_start,
            scheduled_end_time=t_end,
            traction_power_cutoff_required=traction_cut,
            work_description=description,
            status=BlockStatus.PENDING_APPROVAL,
        )

        # Run sweep
        detector = ConflictDetector(block)
        detector.run_sweep()

        messages.success(request, f"Block proposal {block.block_code} submitted. Conflict sweep completed.")
        return redirect('blocks:timeline')

    return render(request, 'blocks/proposal_form.html', {
        'corridors': corridors,
        'departments': DepartmentCode.choices,
        'work_types': WorkType.choices,
    })


@login_required
def block_precheck_htmx(request):
    """
    HTMX Live Conflict Pre-Check Partial View.
    Evaluates potential overlaps as the user types coordinates into the proposal form.
    """
    start_km = float(request.POST.get('start_km', 0.0) or 0.0)
    end_km = float(request.POST.get('end_km', 0.0) or 0.0)
    corridor_id = request.POST.get('corridor')
    dept = request.POST.get('department_code', 'ENG')

    conflicts = []
    if corridor_id and end_km > start_km:
        # Check against existing blocks
        overlapping = Block.objects.filter(
            corridor_id=corridor_id,
            status__in=[BlockStatus.SANCTIONED, BlockStatus.PENDING_APPROVAL, BlockStatus.ACTIVE]
        ).exclude(end_km__lt=start_km).exclude(start_km__gt=end_km)

        for b in overlapping:
            is_shadow = (dept == 'ENG' and b.department_code == 'TRD') or (dept == 'TRD' and b.department_code == 'ENG')
            conflicts.append({
                'entity': f"Block {b.block_code} ({b.get_department_code_display()})",
                'is_shadow': is_shadow,
                'msg': "Shadow-Block Opportunity: Can coordinate joint possession!" if is_shadow else "Temporal/Spatial overlap requires COA review."
            })

    return render(request, 'blocks/conflict_preview_partial.html', {
        'conflicts': conflicts,
    })
