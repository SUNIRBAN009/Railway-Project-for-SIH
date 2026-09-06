import datetime
from rest_framework import serializers
from django.utils import timezone
from apps.blocks.models import Corridor, Block, BlockConflict, BlockStatus, LineType, WorkType
from apps.accounts.models import DepartmentCode


class CorridorSerializer(serializers.ModelSerializer):
    total_length_km = serializers.FloatField(read_only=True)

    class Meta:
        model = Corridor
        fields = [
            'id',
            'code',
            'name',
            'zone',
            'division',
            'source_station',
            'destination_station',
            'start_km',
            'end_km',
            'total_length_km',
            'is_electrified',
            'max_permissible_speed_kmh',
        ]


class BlockConflictSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockConflict
        fields = [
            'id',
            'conflict_type',
            'severity',
            'conflicting_entity_id',
            'conflicting_entity_label',
            'overlap_start_km',
            'overlap_end_km',
            'conflict_start_time',
            'conflict_end_time',
            'resolution_status',
            'resolution_notes',
            'created_at',
        ]


class BlockDetailSerializer(serializers.ModelSerializer):
    corridor_code = serializers.CharField(source='corridor.code', read_only=True)
    corridor_name = serializers.CharField(source='corridor.name', read_only=True)
    conflicts = BlockConflictSerializer(many=True, read_only=True)
    duration_hours = serializers.FloatField(read_only=True)
    span_km = serializers.FloatField(read_only=True)
    requester_name = serializers.CharField(source='requested_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    department_display = serializers.CharField(source='get_department_code_display', read_only=True)
    work_type_display = serializers.CharField(source='get_work_type_display', read_only=True)

    class Meta:
        model = Block
        fields = [
            'id',
            'block_code',
            'corridor',
            'corridor_code',
            'corridor_name',
            'line_type',
            'department_code',
            'department_display',
            'work_type',
            'work_type_display',
            'requested_by',
            'requester_name',
            'gang_id',
            'equipment_required',
            'start_km',
            'end_km',
            'span_km',
            'scheduled_start_time',
            'scheduled_end_time',
            'duration_hours',
            'actual_start_time',
            'actual_end_time',
            'traction_power_cutoff_required',
            'status',
            'status_display',
            'rejection_reason',
            'caution_order_id',
            'track_fit_certified',
            'is_shadow',
            'parent_block',
            'version',
            'work_description',
            'conflicts',
            'created_at',
            'updated_at',
        ]


class BlockProposalCreateSerializer(serializers.ModelSerializer):
    """
    Validates input schema for FUNC-BLK-001 (Block Proposal Submission).
    """
    class Meta:
        model = Block
        fields = [
            'corridor',
            'line_type',
            'department_code',
            'work_type',
            'start_km',
            'end_km',
            'scheduled_start_time',
            'scheduled_end_time',
            'traction_power_cutoff_required',
            'gang_id',
            'equipment_required',
            'work_description',
        ]

    def validate(self, data):
        start_km = data['start_km']
        end_km = data['end_km']
        corridor = data['corridor']

        if start_km >= end_km:
            raise serializers.ValidationError({"end_km": "End kilometer must be greater than start kilometer."})

        if start_km < corridor.start_km or end_km > corridor.end_km:
            raise serializers.ValidationError({
                "corridor": f"Kilometer range [{start_km}, {end_km}] exceeds corridor boundaries [{corridor.start_km}, {corridor.end_km}]."
            })

        t_start = data['scheduled_start_time']
        t_end = data['scheduled_end_time']

        if t_start >= t_end:
            raise serializers.ValidationError({"scheduled_end_time": "Scheduled end time must be after start time."})

        duration = (t_end - t_start).total_seconds() / 3600.0
        if duration > 8.0:
            raise serializers.ValidationError({"scheduled_end_time": f"Requested duration ({duration:.1f} hrs) exceeds maximum 8-hour block limit."})

        return data


class BlockSanctionSerializer(serializers.Serializer):
    """
    Input schema for Chief Controller sanction (FUNC-BLK-005) with optimistic concurrency locking.
    """
    action = serializers.ChoiceField(choices=['SANCTION', 'REJECT'])
    remarks = serializers.CharField(required=False, allow_blank=True, default='')
    version = serializers.IntegerField(required=True, help_text="Current entity version for optimistic locking")


class BlockActivationSerializer(serializers.Serializer):
    caution_order_id = serializers.CharField(required=True, max_length=50)


class BlockCompletionSerializer(serializers.Serializer):
    track_fit_certified = serializers.BooleanField(required=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default='Track handed back fit for traffic.')
