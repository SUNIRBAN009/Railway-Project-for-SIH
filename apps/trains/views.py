from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from .models import Train, Station, TrainSchedule, CoachComposition, PlatformAllocation

def train_list_view(request):
    query = request.GET.get('q', '').strip()
    source_query = request.GET.get('source', '').strip()
    dest_query = request.GET.get('dest', '').strip()
    train_type = request.GET.get('type', '')

    trains = Train.objects.select_related('source_station', 'destination_station', 'current_station', 'next_station').all()

    if query:
        trains = trains.filter(
            Q(train_number__icontains=query) |
            Q(name__icontains=query)
        )
    if source_query:
        trains = trains.filter(
            Q(source_station__code__iexact=source_query) |
            Q(source_station__name__icontains=source_query)
        )
    if dest_query:
        trains = trains.filter(
            Q(destination_station__code__iexact=dest_query) |
            Q(destination_station__name__icontains=dest_query)
        )
    if train_type:
        trains = trains.filter(train_type=train_type)

    stations = Station.objects.all()

    return render(request, 'trains/train_list.html', {
        'trains': trains,
        'stations': stations,
        'query': query,
        'source_query': source_query,
        'dest_query': dest_query,
        'selected_type': train_type,
    })

def train_detail_view(request, train_number):
    train = get_object_or_404(
        Train.objects.select_related('source_station', 'destination_station', 'current_station', 'next_station'),
        train_number=train_number
    )
    schedules = train.schedules.select_related('station').order_by('stop_number')
    coaches = train.coaches.all()
    
    # Calculate occupancy stats
    total_capacity = sum(c.capacity for c in coaches) if coaches else 1
    total_occupancy = sum(c.current_occupancy for c in coaches) if coaches else 0
    overall_occupancy_pct = int((total_occupancy / total_capacity) * 100) if total_capacity else 0

    return render(request, 'trains/train_detail.html', {
        'train': train,
        'schedules': schedules,
        'coaches': coaches,
        'overall_occupancy_pct': overall_occupancy_pct,
    })

def live_status_view(request):
    train_number = request.GET.get('train_number', '').strip()
    train = None
    schedules = []
    if train_number:
        train = Train.objects.filter(
            Q(train_number__iexact=train_number) |
            Q(name__icontains=train_number)
        ).first()
        if train:
            schedules = train.schedules.select_related('station').order_by('stop_number')
            
    recent_trains = Train.objects.select_related('source_station', 'destination_station')[:6]
    return render(request, 'trains/live_status.html', {
        'train': train,
        'schedules': schedules,
        'train_number': train_number,
        'recent_trains': recent_trains
    })

def station_board_view(request):
    station_code = request.GET.get('station', 'NDLS').strip().upper()
    station = Station.objects.filter(code=station_code).first() or Station.objects.first()
    
    all_stations = Station.objects.all()
    allocations = []
    scheduled_arrivals = []
    scheduled_departures = []

    if station:
        allocations = PlatformAllocation.objects.filter(station=station).select_related('train').order_by('expected_arrival')
        schedules = TrainSchedule.objects.filter(station=station).select_related('train', 'train__source_station', 'train__destination_station').order_by('arrival_time')
        scheduled_arrivals = [s for s in schedules if s.arrival_time]
        scheduled_departures = [s for s in schedules if s.departure_time]

    return render(request, 'trains/station_board.html', {
        'station': station,
        'all_stations': all_stations,
        'allocations': allocations,
        'scheduled_arrivals': scheduled_arrivals,
        'scheduled_departures': scheduled_departures,
    })
