import datetime
from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework import permissions, status

from apps.accounts.api_envelope import ApiResponse
from apps.accounts.permissions import IsSectionController, IsChiefController
from apps.trains.models import (
    Train,
    TrainSchedule,
    TrainLiveStatus,
    TrainType,
    TractionType,
    TrainLiveRunStatus,
    Station,
)
from apps.trains.serializers import (
    TrainMasterSerializer,
    TrainScheduleSerializer,
    TrainLiveStatusSerializer,
    DelaySimulationRequestSerializer,
)
from apps.trains.delay_engine import DelayCascadeEngine
from apps.trains.tasks import ingest_coa_feed


# ============================================================================
# REST API Controllers (SVC-TRN)
# ============================================================================

class TrainMasterListAPIView(APIView):
    """
    FUNC-TRN-001: Query Train Master Timetable
    GET /api/v1/trains/
    Authoritative reference: docs/04-function-maps/05-trains-function-map.md
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        search_query = request.GET.get('search', '').strip()
        train_type = request.GET.get('type', '').strip()
        corridor = request.GET.get('corridor', '').strip()
        priority_max = request.GET.get('priority_max', '').strip()

        trains = Train.objects.prefetch_related('schedules', 'live_status_records').all()

        if search_query:
            trains = trains.filter(
                Q(train_number__icontains=search_query) |
                Q(train_name__icontains=search_query)
            )

        if train_type:
            trains = trains.filter(train_type=train_type)

        if corridor:
            # e.g. NDLS-CNB
            stations = corridor.split('-')
            if len(stations) == 2:
                trains = trains.filter(
                    source_station__icontains=stations[0],
                    destination_station__icontains=stations[1]
                )

        if priority_max and priority_max.isdigit():
            trains = trains.filter(priority_rank__lte=int(priority_max))

        serializer = TrainMasterSerializer(trains, many=True)
        return ApiResponse.success(
            data={
                'count': trains.count(),
                'trains': serializer.data
            },
            message="Master train timetable catalog retrieved successfully"
        )


class TrainScheduleDetailAPIView(APIView):
    """
    GET /api/v1/trains/{number}/schedule/
    Retrieves full station stoppage sequences and milestones for a given train.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, train_number):
        train = get_object_or_404(Train, train_number=train_number)
        schedules = train.schedules.all().order_by('station_sequence')
        serializer = TrainScheduleSerializer(schedules, many=True)
        return ApiResponse.success(
            data={
                'train_number': train.train_number,
                'train_name': train.train_name,
                'train_type': train.train_type,
                'schedules': serializer.data
            },
            message=f"Schedule for train {train.train_number} retrieved"
        )


class TrainLiveStatusListAPIView(APIView):
    """
    FUNC-TRN-002: Get Live Train Running Positions
    GET /api/v1/trains/live/
    Authoritative reference: docs/04-function-maps/05-trains-function-map.md
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        delay_min = request.GET.get('delay_greater_than', '')
        status_filter = request.GET.get('status', '').strip()

        live_qs = TrainLiveStatus.objects.select_related('train').all()

        if delay_min and (delay_min.isdigit() or (delay_min.startswith('-') and delay_min[1:].isdigit())):
            live_qs = live_qs.filter(delay_minutes__gte=int(delay_min))

        if status_filter:
            live_qs = live_qs.filter(status=status_filter)

        serializer = TrainLiveStatusSerializer(live_qs, many=True)
        return ApiResponse.success(
            data={
                'count': live_qs.count(),
                'active_live_trains': serializer.data
            },
            message="Live running train positions retrieved"
        )


class DelayCascadeSimulationAPIView(APIView):
    """
    FUNC-TRN-004: Simulate Train Delay Cascade
    POST /api/v1/trains/simulate-delay/
    Authoritative reference: docs/04-function-maps/05-trains-function-map.md
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DelaySimulationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='TRN-400',
                message="Invalid delay simulation parameters",
                errors=serializer.errors,
                http_status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        engine = DelayCascadeEngine(
            corridor_length_km=data['corridor_length_km'],
            imposed_speed_restriction_kmh=data['imposed_speed_restriction_kmh'],
            affected_train_ids=data.get('affected_train_ids', []),
            block_id=data.get('block_id')
        )
        result = engine.simulate()

        return ApiResponse.success(
            data=result,
            message="Delay cascade propagation simulation calculated"
        )


class IngestCOAFeedAPIView(APIView):
    """
    FUNC-TRN-003: Ingest COA Timetable Feed
    POST /api/v1/trains/ingest/
    Authoritative reference: docs/04-function-maps/05-trains-function-map.md
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        custom_feed = request.data.get('feed_data')
        summary = ingest_coa_feed(feed_data=custom_feed)
        return ApiResponse.success(
            data=summary,
            message="COA timetable feed successfully ingested"
        )


# ============================================================================
# SSR Django Template & HTMX Views
# ============================================================================

def train_operations_dashboard_view(request):
    """
    Live Train Operations, GIS Corridor Tracking, and Delay Dashboard.
    SSR + Alpine.js + HTMX + Leaflet.js
    """
    # Ensure baseline data exists
    if Train.objects.count() == 0:
        ingest_coa_feed()

    search_query = request.GET.get('q', '').strip()
    train_type = request.GET.get('type', '')

    trains = Train.objects.prefetch_related('schedules', 'live_status_records').all()

    if search_query:
        trains = trains.filter(
            Q(train_number__icontains=search_query) |
            Q(train_name__icontains=search_query)
        )

    if train_type:
        trains = trains.filter(train_type=train_type)

    live_records = TrainLiveStatus.objects.select_related('train').order_by('delay_minutes')

    # Calculate operational metrics
    total_trains = trains.count()
    on_time_count = live_records.filter(delay_minutes__lte=5).count()
    delayed_count = live_records.filter(delay_minutes__gt=5).count()
    punctuality_rate = round((on_time_count / total_trains * 100), 1) if total_trains else 100.0

    stations = Station.objects.all()

    return render(request, 'trains/live_status.html', {
        'trains': trains,
        'live_records': live_records,
        'total_trains': total_trains,
        'on_time_count': on_time_count,
        'delayed_count': delayed_count,
        'punctuality_rate': punctuality_rate,
        'search_query': search_query,
        'selected_type': train_type,
        'stations': stations,
        'train_types': TrainType.choices,
    })


def train_detail_view(request, train_number):
    """Detailed view for a single train timetable and composition."""
    train = get_object_or_404(
        Train.objects.prefetch_related('schedules', 'coaches', 'live_status_records'),
        train_number=train_number
    )
    schedules = train.schedules.all().order_by('station_sequence')
    live = train.current_live_status
    coaches = train.coaches.all()

    return render(request, 'trains/train_detail.html', {
        'train': train,
        'schedules': schedules,
        'live': live,
        'coaches': coaches,
    })


def htmx_simulate_delay_view(request):
    """
    HTMX partial view returning calculated delay cascade cards.
    """
    speed = float(request.POST.get('speed_restriction', 30.0))
    length = float(request.POST.get('corridor_length', 3.7))
    block_id = request.POST.get('block_id', '')

    engine = DelayCascadeEngine(
        corridor_length_km=length,
        imposed_speed_restriction_kmh=speed,
        block_id=block_id
    )
    simulation = engine.simulate()

    return render(request, 'trains/partials/delay_simulation_result.html', {
        'simulation': simulation
    })
