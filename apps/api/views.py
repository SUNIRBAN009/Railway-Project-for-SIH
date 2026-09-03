from rest_framework import viewsets, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import render
from apps.accounts.models import UserProfile
from apps.trains.models import Station, Train, PlatformAllocation
from apps.grievances.models import Grievance, GrievanceComment
from apps.maintenance.models import DefectReport, WorkOrder
from apps.emergency.models import SOSAlert, RPFUnit
from .serializers import (
    StationSerializer, TrainSerializer, GrievanceSerializer,
    DefectReportSerializer, WorkOrderSerializer, SOSAlertSerializer,
    RPFUnitSerializer, UserProfileSerializer
)

class StationViewSet(viewsets.ModelViewSet):
    queryset = Station.objects.all()
    serializer_class = StationSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code', 'zone', 'division']

class TrainViewSet(viewsets.ModelViewSet):
    queryset = Train.objects.select_related('source_station', 'destination_station', 'current_station', 'next_station').prefetch_related('schedules', 'coaches').all()
    serializer_class = TrainSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['train_number', 'name', 'source_station__code', 'destination_station__code']

class GrievanceViewSet(viewsets.ModelViewSet):
    queryset = Grievance.objects.prefetch_related('comments').all()
    serializer_class = GrievanceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['tracking_id', 'pnr_number', 'subject', 'description', 'train_number']

class DefectReportViewSet(viewsets.ModelViewSet):
    queryset = DefectReport.objects.prefetch_related('work_orders').all()
    serializer_class = DefectReportSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['report_id', 'section_name', 'track_km_marker', 'train_number']

class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.select_related('defect').all()
    serializer_class = WorkOrderSerializer

class SOSAlertViewSet(viewsets.ModelViewSet):
    queryset = SOSAlert.objects.all()
    serializer_class = SOSAlertSerializer

class RPFUnitViewSet(viewsets.ModelViewSet):
    queryset = RPFUnit.objects.all()
    serializer_class = RPFUnitSerializer

class AnalyticsSummaryAPIView(APIView):
    """
    Central API endpoint returning operational statistics for dashboards and external clients.
    """
    def get(self, request, format=None):
        return Response({
            'trains': {
                'total': Train.objects.count(),
                'on_time': Train.objects.filter(delay_minutes=0).count(),
                'delayed': Train.objects.filter(delay_minutes__gt=0).count(),
            },
            'grievances': {
                'total': Grievance.objects.count(),
                'open': Grievance.objects.filter(status='OPEN').count(),
                'in_progress': Grievance.objects.filter(status='IN_PROGRESS').count(),
                'resolved': Grievance.objects.filter(status='RESOLVED').count(),
                'critical_ai_alerts': Grievance.objects.filter(priority='CRITICAL').count(),
            },
            'maintenance': {
                'total_defects': DefectReport.objects.count(),
                'critical_track_faults': DefectReport.objects.filter(severity='CRITICAL').count(),
                'active_work_orders': WorkOrder.objects.filter(status__in=['Assigned', 'Dispatched']).count(),
            },
            'emergency': {
                'active_sos': SOSAlert.objects.filter(status__in=['ACTIVE', 'RESPONDING']).count(),
                'rpf_units_ready': RPFUnit.objects.filter(status='Available').count(),
            }
        })

def api_docs_view(request):
    """
    Interactive API Explorer & Documentation web page
    """
    endpoints = [
        {'method': 'GET, POST', 'path': '/api/trains/', 'desc': 'List all trains, schedules, coaches, and search by route'},
        {'method': 'GET, POST', 'path': '/api/stations/', 'desc': 'List all railway stations, coordinates, and platform counts'},
        {'method': 'GET, POST', 'path': '/api/grievances/', 'desc': 'Lodge, retrieve, and filter passenger grievances with AI priority score'},
        {'method': 'GET, POST', 'path': '/api/defects/', 'desc': 'Log track/coach defects, AI confidence metrics, and GPS coords'},
        {'method': 'GET, POST', 'path': '/api/work-orders/', 'desc': 'Manage maintenance crew work orders and repairs'},
        {'method': 'GET, POST', 'path': '/api/sos/', 'desc': 'Trigger rapid emergency SOS beacon and retrieve active alerts'},
        {'method': 'GET, POST', 'path': '/api/rpf-units/', 'desc': 'Live RPF unit patrols and dispatch availability'},
        {'method': 'GET', 'path': '/api/analytics/summary/', 'desc': 'Real-time JSON metrics summary across all railway subsystems'},
    ]
    return render(request, 'api/docs.html', {'endpoints': endpoints})
