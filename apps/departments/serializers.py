from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from apps.departments.models import (
    Department,
    Gang,
    MaintenanceEquipment,
    WorkOrder,
    EquipmentType,
    EquipmentStatus,
    WorkOrderStatus,
)
from apps.accounts.models import DepartmentCode
from apps.blocks.models import Block, BlockStatus


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = [
            'id',
            'code',
            'name',
            'headquarters_division',
            'contact_email',
            'escalation_phone',
        ]


class GangListSerializer(serializers.ModelSerializer):
    department_code = serializers.CharField(source='department.code', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    supervisor_name = serializers.SerializerMethodField()

    class Meta:
        model = Gang
        fields = [
            'id',
            'gang_number',
            'department_id',
            'department_code',
            'department_name',
            'supervisor_id',
            'supervisor_name',
            'headquarters_station',
            'crew_strength',
            'assigned_section_start_km',
            'assigned_section_end_km',
            'is_active',
            'created_at',
        ]

    def get_supervisor_name(self, obj):
        if obj.supervisor:
            return f"{obj.supervisor.first_name} {obj.supervisor.last_name}".strip() or obj.supervisor.username
        return "Unassigned"


class GangCreateSerializer(serializers.ModelSerializer):
    department_code = serializers.ChoiceField(choices=DepartmentCode.choices, write_only=True)

    class Meta:
        model = Gang
        fields = [
            'gang_number',
            'department_code',
            'supervisor',
            'headquarters_station',
            'crew_strength',
            'assigned_section_start_km',
            'assigned_section_end_km',
            'is_active',
        ]

    def create(self, validated_data):
        dept_code = validated_data.pop('department_code')
        department, _ = Department.objects.get_or_create(
            code=dept_code,
            defaults={
                'name': f"{dept_code} Department",
                'headquarters_division': 'DLI',
                'contact_email': f'{dept_code.lower()}.division@railnet.gov.in',
                'escalation_phone': '011-23340000',
            }
        )
        return Gang.objects.create(department=department, **validated_data)


class MaintenanceEquipmentSerializer(serializers.ModelSerializer):
    department_code = serializers.CharField(source='department.code', read_only=True)
    equipment_type_display = serializers.CharField(source='get_equipment_type_display', read_only=True)
    is_fit = serializers.BooleanField(read_only=True)
    is_fitness_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = MaintenanceEquipment
        fields = [
            'id',
            'equipment_code',
            'equipment_name',
            'equipment_type',
            'equipment_type_display',
            'department_id',
            'department_code',
            'home_depot',
            'current_location_km',
            'operational_status',
            'fitness_expiry_date',
            'is_fit',
            'is_fitness_expired',
            'created_at',
        ]


class WorkOrderDetailSerializer(serializers.ModelSerializer):
    department_code = serializers.CharField(source='department.code', read_only=True)
    block_code = serializers.CharField(source='block.block_code', read_only=True)
    corridor_name = serializers.CharField(source='block.corridor.name', read_only=True)
    gang_number = serializers.CharField(source='gang.gang_number', read_only=True)
    equipment_code = serializers.CharField(source='equipment.equipment_code', read_only=True, default=None)
    equipment_name = serializers.CharField(source='equipment.equipment_name', read_only=True, default=None)
    certified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkOrder
        fields = [
            'id',
            'order_number',
            'block_id',
            'block_code',
            'corridor_name',
            'department_id',
            'department_code',
            'gang_id',
            'gang_number',
            'equipment_id',
            'equipment_code',
            'equipment_name',
            'planned_work_scope',
            'target_metric_units',
            'actual_metric_units',
            'status',
            'ballast_profile_verified',
            'track_gauge_checked',
            'certified_by_name',
            'safety_clearance_timestamp',
            'safety_remarks',
            'created_at',
            'updated_at',
        ]

    def get_certified_by_name(self, obj):
        if obj.safety_certified_by:
            return f"{obj.safety_certified_by.first_name} {obj.safety_certified_by.last_name}".strip() or obj.safety_certified_by.username
        return None


class WorkOrderCreateSerializer(serializers.Serializer):
    block_id = serializers.UUIDField()
    gang_id = serializers.UUIDField()
    equipment_id = serializers.UUIDField(required=False, allow_null=True)
    planned_work_scope = serializers.CharField(max_length=2000)
    target_metric_units = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate_block_id(self, value):
        try:
            block = Block.objects.get(id=value)
        except Block.DoesNotExist:
            raise serializers.ValidationError("Referenced block does not exist.")
        # Work order can be issued when block is coordinated or sanctioned
        if block.status not in [BlockStatus.SANCTIONED, BlockStatus.COORDINATED, BlockStatus.ACTIVE]:
            raise serializers.ValidationError(
                f"Cannot issue work order for block in status '{block.status}'. Block must be SANCTIONED or COORDINATED."
            )
        return value

    def validate_gang_id(self, value):
        try:
            gang = Gang.objects.get(id=value)
        except Gang.DoesNotExist:
            raise serializers.ValidationError("Referenced maintenance gang does not exist.")
        if not gang.is_active:
            raise serializers.ValidationError("Assigned gang is currently inactive.")
        return value

    def validate_equipment_id(self, value):
        if not value:
            return None
        try:
            eq = MaintenanceEquipment.objects.get(id=value)
        except MaintenanceEquipment.DoesNotExist:
            raise serializers.ValidationError("Referenced maintenance equipment does not exist.")
        if eq.operational_status != EquipmentStatus.AVAILABLE:
            raise serializers.ValidationError(
                f"Equipment {eq.equipment_code} is not available (Status: {eq.operational_status})."
            )
        if eq.is_fitness_expired:
            raise serializers.ValidationError(
                f"Equipment {eq.equipment_code} fitness expired on {eq.fitness_expiry_date}. Safety certificate invalid."
            )
        return value


class SafetyClearanceRequestSerializer(serializers.Serializer):
    safety_certified = serializers.BooleanField(default=True)
    actual_metric_units = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    ballast_profile_verified = serializers.BooleanField(default=True)
    track_gauge_checked = serializers.BooleanField(default=True)
    remarks = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')

    def validate_safety_certified(self, value):
        if not value:
            raise serializers.ValidationError("Track safety clearance requires explicit certification (safety_certified=true).")
        return value
