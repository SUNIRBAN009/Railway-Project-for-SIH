import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Q
from .models import Grievance, GrievanceComment, GrievanceAuditLog, GrievanceStatus, GrievancePriority, GrievanceCategory
from .forms import GrievanceLodgeForm, GrievanceStatusUpdateForm, GrievanceCommentForm
from .ai_classifier import analyze_grievance_text

def lodge_grievance_view(request):
    if request.method == 'POST':
        form = GrievanceLodgeForm(request.POST, request.FILES)
        if form.is_valid():
            grievance = form.save(commit=False)
            if request.user.is_authenticated:
                grievance.passenger = request.user
            grievance.save()

            # Record Initial Audit Log
            GrievanceAuditLog.objects.create(
                grievance=grievance,
                performed_by=request.user if request.user.is_authenticated else None,
                old_status="New",
                new_status=grievance.get_status_display(),
                remarks="Grievance lodged via RailConnect AI portal"
            )

            messages.success(request, f"Grievance lodged successfully! Your Tracking ID is {grievance.tracking_id}. Our team has been notified.")
            return redirect('grievances:detail', tracking_id=grievance.tracking_id)
    else:
        initial = {}
        if request.user.is_authenticated:
            initial['passenger_name'] = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            if hasattr(request.user, 'profile'):
                initial['passenger_phone'] = request.user.profile.phone_number
        form = GrievanceLodgeForm(initial=initial)

    return render(request, 'grievances/lodge.html', {'form': form})

def grievance_list_view(request):
    query = request.GET.get('q', '').strip()
    category = request.GET.get('category', '')
    priority = request.GET.get('priority', '')
    status = request.GET.get('status', '')

    grievances = Grievance.objects.all()

    # If passenger, show only their grievances unless filtering all
    if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'PASSENGER':
        # Passenger can view their own
        grievances = grievances.filter(passenger=request.user)

    if query:
        grievances = grievances.filter(
            Q(tracking_id__icontains=query) |
            Q(pnr_number__icontains=query) |
            Q(subject__icontains=query) |
            Q(train_number__icontains=query) |
            Q(passenger_name__icontains=query)
        )
    if category:
        grievances = grievances.filter(category=category)
    if priority:
        grievances = grievances.filter(priority=priority)
    if status:
        grievances = grievances.filter(status=status)

    stats = {
        'total': Grievance.objects.count(),
        'open': Grievance.objects.filter(status=GrievanceStatus.OPEN).count(),
        'in_progress': Grievance.objects.filter(status=GrievanceStatus.IN_PROGRESS).count(),
        'resolved': Grievance.objects.filter(status=GrievanceStatus.RESOLVED).count(),
        'critical': Grievance.objects.filter(priority=GrievancePriority.CRITICAL).count(),
    }

    return render(request, 'grievances/list.html', {
        'grievances': grievances,
        'categories': GrievanceCategory.choices,
        'priorities': GrievancePriority.choices,
        'statuses': GrievanceStatus.choices,
        'stats': stats,
        'query': query,
        'selected_category': category,
        'selected_priority': priority,
        'selected_status': status,
    })

def grievance_detail_view(request, tracking_id):
    grievance = get_object_or_404(Grievance, tracking_id=tracking_id)
    comments = grievance.comments.all()
    audit_logs = grievance.audit_logs.all()

    comment_form = GrievanceCommentForm()
    status_form = None

    is_staff = request.user.is_authenticated and (
        request.user.is_staff or 
        (hasattr(request.user, 'profile') and request.user.profile.is_official)
    )

    if is_staff:
        if request.method == 'POST' and 'update_status' in request.POST:
            old_status = grievance.get_status_display()
            status_form = GrievanceStatusUpdateForm(request.POST, instance=grievance)
            if status_form.is_valid():
                updated_grievance = status_form.save(commit=False)
                if updated_grievance.status in [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED] and not updated_grievance.resolved_at:
                    updated_grievance.resolved_at = timezone.now()
                updated_grievance.save()

                remarks = status_form.cleaned_data.get('remarks', 'Status updated by official')
                GrievanceAuditLog.objects.create(
                    grievance=updated_grievance,
                    performed_by=request.user,
                    old_status=old_status,
                    new_status=updated_grievance.get_status_display(),
                    remarks=remarks
                )
                messages.success(request, f"Grievance {tracking_id} updated successfully.")
                return redirect('grievances:detail', tracking_id=tracking_id)
        else:
            status_form = GrievanceStatusUpdateForm(instance=grievance)

    if request.method == 'POST' and 'add_comment' in request.POST:
        comment_form = GrievanceCommentForm(request.POST)
        if comment_form.is_valid():
            comm = comment_form.save(commit=False)
            comm.grievance = grievance
            if request.user.is_authenticated:
                comm.author = request.user
                comm.author_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
                comm.is_official_update = is_staff
            else:
                comm.author_name = "Passenger / Guest"
            comm.save()
            messages.success(request, "Comment added.")
            return redirect('grievances:detail', tracking_id=tracking_id)

    return render(request, 'grievances/detail.html', {
        'grievance': grievance,
        'comments': comments,
        'audit_logs': audit_logs,
        'comment_form': comment_form,
        'status_form': status_form,
        'is_staff': is_staff,
    })

def track_grievance_view(request):
    search_id = request.GET.get('tracking_id', '').strip()
    grievance = None
    if search_id:
        grievance = Grievance.objects.filter(
            Q(tracking_id__iexact=search_id) |
            Q(pnr_number__iexact=search_id)
        ).first()
        if not grievance:
            messages.warning(request, f"No record found matching '{search_id}'. Please verify your Tracking ID or 10-digit PNR.")

    return render(request, 'grievances/track.html', {
        'grievance': grievance,
        'search_id': search_id,
    })

def ai_preview_api(request):
    """
    Live AI Sentiment & Urgency prediction endpoint for dynamic frontend feedback.
    """
    text = request.GET.get('text', '')
    category = request.GET.get('category', '')
    analysis = analyze_grievance_text(text, category)
    return JsonResponse(analysis)
