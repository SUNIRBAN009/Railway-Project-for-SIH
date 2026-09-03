from django.shortcuts import render, redirect
from django.db.models import Count, Q
from django.contrib.auth.decorators import login_required
from apps.accounts.models import UserRole
from apps.trains.models import Train, Station, PlatformAllocation
from apps.grievances.models import Grievance, GrievancePriority, GrievanceStatus
from apps.maintenance.models import DefectReport, WorkOrder, DefectSeverity
from apps.emergency.models import SOSAlert, RPFUnit, EmergencyHelpline, SOSStatus

def home_view(request):
    featured_trains = Train.objects.select_related('source_station', 'destination_station')[:6]
    helplines = EmergencyHelpline.objects.all()[:4]
    
    stats = {
        'active_trains': Train.objects.count(),
        'stations': Station.objects.count(),
        'grievances_resolved': Grievance.objects.filter(status__in=[GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED]).count(),
        'response_time_min': '14',
    }

    recent_grievances = Grievance.objects.order_by('-created_at')[:4]

    return render(request, 'core/home.html', {
        'featured_trains': featured_trains,
        'helplines': helplines,
        'stats': stats,
        'recent_grievances': recent_grievances,
    })

@login_required
def dashboard_view(request):
    user = request.user
    role = getattr(user.profile, 'role', UserRole.PASSENGER) if hasattr(user, 'profile') else UserRole.PASSENGER

    # Global KPI Metrics
    total_trains = Train.objects.count()
    delayed_trains = Train.objects.filter(delay_minutes__gt=0).count()
    on_time_pct = int(((total_trains - delayed_trains) / total_trains) * 100) if total_trains else 100

    total_grievances = Grievance.objects.count()
    open_grievances = Grievance.objects.filter(status=GrievanceStatus.OPEN).count()
    critical_grievances = Grievance.objects.filter(priority=GrievancePriority.CRITICAL).count()

    total_defects = DefectReport.objects.count()
    critical_defects = DefectReport.objects.filter(severity=DefectSeverity.CRITICAL).count()
    
    active_sos = SOSAlert.objects.filter(status__in=[SOSStatus.ACTIVE, SOSStatus.RESPONDING]).count()

    # Role-specific collections
    recent_grievances = Grievance.objects.all()[:6]
    if role == UserRole.PASSENGER:
        recent_grievances = Grievance.objects.filter(passenger=user)[:6]

    recent_trains = Train.objects.select_related('source_station', 'destination_station', 'current_station')[:5]
    recent_defects = DefectReport.objects.all()[:5]
    recent_sos = SOSAlert.objects.all()[:4]
    recent_work_orders = WorkOrder.objects.select_related('defect', 'assigned_engineer')[:5]

    # Category counts for Chart.js
    category_counts = list(Grievance.objects.values('category').annotate(count=Count('id')).order_by('-count')[:6])

    return render(request, 'core/dashboard.html', {
        'role': role,
        'role_display': getattr(user.profile, 'get_role_display', lambda: 'Passenger')() if hasattr(user, 'profile') else 'Passenger',
        'kpis': {
            'total_trains': total_trains,
            'on_time_pct': on_time_pct,
            'delayed_trains': delayed_trains,
            'total_grievances': total_grievances,
            'open_grievances': open_grievances,
            'critical_grievances': critical_grievances,
            'total_defects': total_defects,
            'critical_defects': critical_defects,
            'active_sos': active_sos,
        },
        'recent_grievances': recent_grievances,
        'recent_trains': recent_trains,
        'recent_defects': recent_defects,
        'recent_sos': recent_sos,
        'recent_work_orders': recent_work_orders,
        'category_counts': category_counts,
    })

def global_search_view(request):
    query = request.GET.get('q', '').strip()
    train_results = []
    station_results = []
    grievance_results = []
    defect_results = []

    if query:
        train_results = Train.objects.filter(
            Q(train_number__icontains=query) | Q(name__icontains=query)
        )[:5]
        station_results = Station.objects.filter(
            Q(code__icontains=query) | Q(name__icontains=query)
        )[:5]
        grievance_results = Grievance.objects.filter(
            Q(tracking_id__icontains=query) | Q(pnr_number__icontains=query) | Q(subject__icontains=query)
        )[:5]
        defect_results = DefectReport.objects.filter(
            Q(report_id__icontains=query) | Q(section_name__icontains=query)
        )[:5]

    return render(request, 'core/search_results.html', {
        'query': query,
        'train_results': train_results,
        'station_results': station_results,
        'grievance_results': grievance_results,
        'defect_results': defect_results,
    })
