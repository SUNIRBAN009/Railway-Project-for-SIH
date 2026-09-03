from rest_framework import serializers
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile
from apps.trains.models import Station, Train, TrainSchedule, CoachComposition, PlatformAllocation
from apps.grievances.models import Grievance, GrievanceComment
from apps.maintenance.models import DefectReport, WorkOrder
from apps.emergency.models import SOSAlert, RPFUnit

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'role', 'role_display', 'phone_number', 'badge_number', 'assigned_station']

class StationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Station
        fields = '__all__'

class TrainScheduleSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source='station.name', read_only=True)
    station_code = serializers.CharField(source='station.code', read_only=True)

    class Meta:
        model = TrainSchedule
        fields = '__all__'

class CoachCompositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachComposition
        fields = '__all__'

class TrainSerializer(serializers.ModelSerializer):
    source_station_name = serializers.CharField(source='source_station.name', read_only=True)
    source_station_code = serializers.CharField(source='source_station.code', read_only=True)
    destination_station_name = serializers.CharField(source='destination_station.name', read_only=True)
    destination_station_code = serializers.CharField(source='destination_station.code', read_only=True)
    schedules = TrainScheduleSerializer(many=True, read_only=True)
    coaches = CoachCompositionSerializer(many=True, read_only=True)

    class Meta:
        model = Train
        fields = '__all__'

class GrievanceCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrievanceComment
        fields = '__all__'

class GrievanceSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    comments = GrievanceCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Grievance
        fields = '__all__'

class DefectReportSerializer(serializers.ModelSerializer):
    defect_type_display = serializers.CharField(source='get_defect_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = DefectReport
        fields = '__all__'

class WorkOrderSerializer(serializers.ModelSerializer):
    defect_ref = serializers.CharField(source='defect.report_id', read_only=True)

    class Meta:
        model = WorkOrder
        fields = '__all__'

class SOSAlertSerializer(serializers.ModelSerializer):
    emergency_type_display = serializers.CharField(source='get_emergency_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SOSAlert
        fields = '__all__'

class RPFUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = RPFUnit
        fields = '__all__'
