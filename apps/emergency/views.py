from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from .models import SOSAlert, RPFUnit, EmergencyHelpline, SOSStatus, EmergencyType
from .forms import SOSTriggerForm, SOSResponseForm

def trigger_sos_view(request):
    if request.method == 'POST':
        form = SOSTriggerForm(request.POST)
        if form.is_valid():
            sos = form.save(commit=False)
            if request.user.is_authenticated:
                sos.passenger = request.user
            sos.save()
            messages.error(request, f"🚨 EMERGENCY SOS BROADCASTED! Alert ID: {sos.alert_id}. Railway Protection Force (RPF) and Train Guard have been alerted!")
            return redirect('emergency:detail', alert_id=sos.alert_id)
    else:
        initial = {}
        if request.user.is_authenticated:
            initial['passenger_name'] = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            if hasattr(request.user, 'profile'):
                initial['passenger_phone'] = request.user.profile.phone_number
        form = SOSTriggerForm(initial=initial)

    helplines = EmergencyHelpline.objects.all()
    return render(request, 'emergency/sos_trigger.html', {
        'form': form,
        'helplines': helplines,
        'emergency_types': EmergencyType.choices
    })

def rpf_radar_view(request):
    active_alerts = SOSAlert.objects.filter(status__in=[SOSStatus.ACTIVE, SOSStatus.RESPONDING]).order_by('-triggered_at')
    resolved_alerts = SOSAlert.objects.filter(status__in=[SOSStatus.RESOLVED, SOSStatus.FALSE_ALARM]).order_by('-triggered_at')[:10]
    rpf_units = RPFUnit.objects.all()

    stats = {
        'active_count': active_alerts.count(),
        'critical_count': active_alerts.filter(emergency_type__in=[EmergencyType.SECURITY, EmergencyType.FIRE_SMOKE]).count(),
        'available_units': rpf_units.filter(status='Available').count(),
        'dispatched_units': rpf_units.filter(status='Dispatched').count(),
    }

    return render(request, 'emergency/radar.html', {
        'active_alerts': active_alerts,
        'resolved_alerts': resolved_alerts,
        'rpf_units': rpf_units,
        'stats': stats,
    })

def sos_detail_view(request, alert_id):
    alert = get_object_or_404(SOSAlert, alert_id=alert_id)
    rpf_units = RPFUnit.objects.all()
    
    if request.method == 'POST' and 'update_response' in request.POST:
        form = SOSResponseForm(request.POST, instance=alert)
        if form.is_valid():
            updated = form.save(commit=False)
            if not updated.acknowledged_at:
                updated.acknowledged_at = timezone.now()
                updated.acknowledged_by = request.user if request.user.is_authenticated else None
            if updated.status == SOSStatus.RESOLVED and not updated.resolved_at:
                updated.resolved_at = timezone.now()
            updated.save()
            messages.success(request, f"Emergency incident {alert_id} updated.")
            return redirect('emergency:detail', alert_id=alert_id)
    else:
        form = SOSResponseForm(instance=alert)

    return render(request, 'emergency/detail.html', {
        'alert': alert,
        'form': form,
        'rpf_units': rpf_units,
    })

def sos_ajax_poll(request):
    """
    JSON stream for real-time radar screen refreshing without full page reloads.
    """
    active = SOSAlert.objects.filter(status__in=[SOSStatus.ACTIVE, SOSStatus.RESPONDING])
    data = []
    for a in active:
        data.append({
            'alert_id': a.alert_id,
            'type': a.get_emergency_type_display(),
            'name': a.passenger_name,
            'phone': a.passenger_phone,
            'train': a.train_number,
            'coach_seat': f"{a.coach_number}/{a.seat_number}",
            'lat': a.latitude,
            'lng': a.longitude,
            'status': a.status,
            'time': a.triggered_at.strftime("%H:%M:%S"),
            'detail': a.details[:80],
        })
    return JsonResponse({'active_alerts': data, 'count': len(data)})

def helpline_directory_view(request):
    helplines = EmergencyHelpline.objects.all()
    return render(request, 'emergency/helpline_directory.html', {'helplines': helplines})
