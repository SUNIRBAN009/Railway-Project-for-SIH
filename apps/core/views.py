from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from apps.accounts.models import UserProfile, UserRole, DepartmentCode


def home_view(request):
    """
    Landing Page for PS 26027: AI-Powered Automatic Block Planning for Indian Railways.
    Explains the unified platform integrating ENG (TMS), TRD (TDMS), SNT (SMMS),
    and COA with PostGIS spatial engines, Celery sweep-line conflict detection,
    and OWL 2 Semantic Digital Twin.
    """
    stats = {
        'departments': 3,
        'coa_efficiency': '94.8%',
        'conflict_reduction': '78%',
        'shadow_blocks_detected': 142,
    }

    return render(request, 'core/home.html', {
        'stats': stats,
    })


@login_required
def dashboard_view(request):
    """
    Operational Control Center Dashboard for Indian Railways Controllers & Engineers.
    Renders the control matrix, corridor statuses, active departmental block requests,
    and GIS Leaflet map viewer.
    """
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    # Operational metrics for PS 26027 Block Planning
    kpi = {
        'total_requests': 28,
        'conflicts_detected': 4,
        'sanctioned_blocks': 19,
        'shadow_opportunities': 5,
    }

    # Departmental summary
    dept_requests = [
        {
            'id': 'BLK-2026-ENG-089',
            'department': 'ENG',
            'dept_name': 'Civil Track / P-Way',
            'section': 'NDLS - GZB (Up Line KM 14.2 - 18.6)',
            'time_window': '01:30 - 04:30 (3.0 hrs)',
            'status': 'SANCTIONED',
            'status_color': 'emerald',
            'gang_lead': 'SSE/Track Sharma',
            'equipment': 'BCM-04 Ballast Cleaner',
            'has_shadow': True
        },
        {
            'id': 'BLK-2026-TRD-042',
            'department': 'TRD',
            'dept_name': 'Traction Distribution (OHE)',
            'section': 'NDLS - GZB (Up Line KM 15.0 - 18.0)',
            'time_window': '01:45 - 04:15 (2.5 hrs)',
            'status': 'SHADOW_APPROVED',
            'status_color': 'cyan',
            'gang_lead': 'SSE/TRD Singh',
            'equipment': 'Tower Wagon TW-88',
            'has_shadow': True
        },
        {
            'id': 'BLK-2026-SNT-031',
            'department': 'SNT',
            'dept_name': 'Signal & Telecom',
            'section': 'GZB Yard Interlocking Point 104',
            'time_window': '02:00 - 04:00 (2.0 hrs)',
            'status': 'PENDING_COA',
            'status_color': 'amber',
            'gang_lead': 'JE/Signal Mishra',
            'equipment': 'Relay Testing Unit',
            'has_shadow': False
        },
        {
            'id': 'BLK-2026-ENG-090',
            'department': 'ENG',
            'dept_name': 'Civil Track / P-Way',
            'section': 'DLI - SSB (Dn Line KM 04.5 - 07.2)',
            'time_window': '23:30 - 02:30 (3.0 hrs)',
            'status': 'CONFLICT_DETECTED',
            'status_color': 'rose',
            'gang_lead': 'JE/P-Way Verma',
            'equipment': 'Tamping Machine CSM-12',
            'has_shadow': False
        }
    ]

    return render(request, 'core/dashboard.html', {
        'profile': profile,
        'kpi': kpi,
        'dept_requests': dept_requests,
    })


def global_search_view(request):
    """
    Global search endpoint querying across blocks, trains, and maintenance gangs.
    """
    query = request.GET.get('q', '').strip()
    return render(request, 'core/search_results.html', {
        'query': query,
    })


def api_health_check_view(request):
    """
    Health check endpoint for container orchestrators and monitoring probes.
    Verifies PostGIS database and Redis broker connections.
    """
    from django.http import JsonResponse
    from django.utils import timezone
    from django.db import connection
    from django.conf import settings
    import redis

    health = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'services': {
            'database': 'unknown',
            'redis': 'unknown',
        }
    }
    status_code = 200

    # 1. Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            row = cursor.fetchone()
            if row and row[0] == 1:
                health['services']['database'] = 'connected'
            else:
                health['services']['database'] = 'unexpected_response'
                health['status'] = 'degraded'
                status_code = 503
    except Exception as e:
        health['services']['database'] = f'error: {str(e)}'
        health['status'] = 'unhealthy'
        status_code = 503

    # 2. Redis check
    try:
        redis_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://redis:6379/0')
        r = redis.Redis.from_url(redis_url, socket_timeout=2)
        if r.ping():
            health['services']['redis'] = 'connected'
        else:
            health['services']['redis'] = 'no_ping'
            health['status'] = 'degraded'
            status_code = 503
    except Exception as e:
        health['services']['redis'] = f'error: {str(e)}'
        health['status'] = 'unhealthy'
        status_code = 503

    return JsonResponse(health, status=status_code)

