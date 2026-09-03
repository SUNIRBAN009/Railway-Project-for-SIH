from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from .models import DefectReport, WorkOrder, DefectSeverity, DefectStatus, DefectType
from .forms import DefectReportForm, WorkOrderCreateForm

def maintenance_dashboard_view(request):
    defects = DefectReport.objects.select_related('reported_by').all()
    work_orders = WorkOrder.objects.select_related('defect', 'assigned_engineer').all()[:10]

    stats = {
        'total_defects': defects.count(),
        'critical_defects': defects.filter(severity=DefectSeverity.CRITICAL).count(),
        'in_repair': defects.filter(status=DefectStatus.IN_REPAIR).count(),
        'resolved': defects.filter(status__in=[DefectStatus.RESOLVED, DefectStatus.VERIFIED]).count(),
        'active_work_orders': work_orders.filter(status__in=['Assigned', 'Dispatched']).count(),
    }

    recent_defects = defects[:8]

    return render(request, 'maintenance/dashboard.html', {
        'stats': stats,
        'recent_defects': recent_defects,
        'work_orders': work_orders,
        'severities': DefectSeverity.choices,
        'defect_types': DefectType.choices,
    })

def log_defect_view(request):
    if request.method == 'POST':
        form = DefectReportForm(request.POST, request.FILES)
        if form.is_valid():
            defect = form.save(commit=False)
            if request.user.is_authenticated:
                defect.reported_by = request.user
            defect.save()
            messages.success(request, f"Defect logged successfully with Ref #{defect.report_id}. Maintenance dispatch notified.")
            return redirect('maintenance:detail', report_id=defect.report_id)
    else:
        form = DefectReportForm(initial={
            'latitude': 28.6139,
            'longitude': 77.2090,
            'section_name': 'Delhi - Mathura Main Line',
            'track_km_marker': 'KM 142/08',
        })

    return render(request, 'maintenance/log_defect.html', {'form': form})

def defect_detail_view(request, report_id):
    defect = get_object_or_404(DefectReport, report_id=report_id)
    work_orders = defect.work_orders.all()
    
    if request.method == 'POST' and 'create_work_order' in request.POST:
        wo_form = WorkOrderCreateForm(request.POST)
        if wo_form.is_valid():
            wo = wo_form.save(commit=False)
            wo.defect = defect
            wo.save()
            
            defect.status = DefectStatus.ASSIGNED
            defect.save()
            
            messages.success(request, f"Work Order #{wo.order_id} created and dispatched.")
            return redirect('maintenance:detail', report_id=report_id)
    else:
        wo_form = WorkOrderCreateForm()

    if request.method == 'POST' and 'resolve_defect' in request.POST:
        defect.status = DefectStatus.RESOLVED
        defect.resolved_at = timezone.now()
        defect.save()
        messages.success(request, f"Defect #{report_id} marked as resolved & safety cleared.")
        return redirect('maintenance:detail', report_id=report_id)

    return render(request, 'maintenance/detail.html', {
        'defect': defect,
        'work_orders': work_orders,
        'wo_form': wo_form,
    })

def work_order_list_view(request):
    orders = WorkOrder.objects.select_related('defect', 'assigned_engineer').all()
    return render(request, 'maintenance/work_orders.html', {'orders': orders})
