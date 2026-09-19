import datetime
from rest_framework import serializers
from django.utils import timezone
from apps.blocks.models import Corridor, BlockSection, Block, BlockConflict, BlockStatus, LineType, WorkType
from apps.accounts.models import DepartmentCode


class BlockSectionSerializer(serializers.ModelSerializer):
    length_km = serializers.FloatField(read_only=True)

    class Meta:
        model = BlockSection
        fields = [
            'id',
            'section_code',
            'from_station',
            'to_station',
            'start_km',
            'end_km',
            'length_km',
            'line_type',
            'is_electrified',
            'max_speed_kmh',
        ]


class CorridorSerializer(serializers.ModelSerializer):
    total_length_km = serializers.FloatField(read_only=True)
    sections = BlockSectionSerializer(many=True, read_only=True)

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
            'sections',
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
    corridor = CorridorSerializer(read_only=True)
    corridor_code = serializers.CharField(source='corridor.code', read_only=True)
    corridor_name = serializers.CharField(source='corridor.name', read_only=True)
    conflicts = BlockConflictSerializer(many=True, read_only=True)
    duration_hours = serializers.FloatField(read_only=True)
    span_km = serializers.FloatField(read_only=True)
    requester_name = serializers.CharField(source='requested_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    department_display = serializers.CharField(source='get_department_code_display', read_only=True)
    work_type_display = serializers.CharField(source='get_work_type_display', read_only=True)
    combined_recommendation = serializers.SerializerMethodField()

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
            'combined_recommendation',
            'created_at',
            'updated_at',
        ]

    def get_combined_recommendation(self, obj):
        try:
            from apps.blocks.conflict_engine import ConflictDetector
            detector = ConflictDetector(obj)
            return detector.get_combined_recommendation()
        except Exception:
            return None



class FlexibleCorridorRelatedField(serializers.RelatedField):
    """
    Resolves Corridor by code ('NDLS-CNB-MAIN'), UUID primary key, or name.
    """
    def get_queryset(self):
        return Corridor.objects.all()

    def to_internal_value(self, data):
        if isinstance(data, Corridor):
            return data
        data_str = str(data).strip()
        # 1. Match by code (e.g. 'NDLS-CNB-MAIN')
        corridor = Corridor.objects.filter(code__iexact=data_str).first()
        if corridor:
            return corridor
        # 2. Match by UUID primary key
        try:
            corridor = Corridor.objects.filter(id=data_str).first()
            if corridor:
                return corridor
        except Exception:
            pass
        # 3. Match by name
        corridor = Corridor.objects.filter(name__icontains=data_str).first()
        if corridor:
            return corridor
        # 4. Fallback to primary corridor
        fallback = Corridor.objects.filter(code='NDLS-CNB-MAIN').first()
        if fallback:
            return fallback
        raise serializers.ValidationError(f"Corridor '{data_str}' not found.")

    def to_representation(self, value):
        return value.code if value else None


WORK_TYPE_NORMALIZATION = {
    'TRACK_TAMPING': WorkType.TRACK_TAMPING,
    'TRACK TAMPING (CSM)': WorkType.TRACK_TAMPING,
    'TRACK TAMPING (CSM MACHINE)': WorkType.TRACK_TAMPING,
    'BALLAST_CLEANING': WorkType.BALLAST_CLEANING,
    'BALLAST DEEP SCREENING (BCM)': WorkType.BALLAST_CLEANING,
    'RAIL_RENEWAL': WorkType.RAIL_RENEWAL,
    'THROUGH RAIL RENEWAL (TRR)': WorkType.RAIL_RENEWAL,
    'OHE_INSPECTION': WorkType.OHE_INSPECTION,
    '25KV OHE TOWER WAGON INSPECTION': WorkType.OHE_INSPECTION,
    'CATENARY_MAINTENANCE': WorkType.CATENARY_MAINTENANCE,
    'SIGNAL_INTERLOCKING_TEST': WorkType.SIGNAL_INTERLOCKING_TEST,
    'ELECTRONIC INTERLOCKING POINT OVERHAUL': WorkType.SIGNAL_INTERLOCKING_TEST,
    'TURNOUT_OVERHAUL': WorkType.TURNOUT_OVERHAUL,
}


class BlockProposalCreateSerializer(serializers.ModelSerializer):
    """
    Validates input schema for FUNC-BLK-001 (Block Proposal Submission).
    Supports flexible corridor identifiers, field aliases, and Coherence validation.
    """
    corridor = FlexibleCorridorRelatedField(required=False)
    corridor_code = serializers.CharField(required=False, write_only=True)
    department = serializers.CharField(required=False, write_only=True)
    equipment_id = serializers.CharField(required=False, write_only=True)
    duration_minutes = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = Block
        fields = [
            'corridor',
            'corridor_code',
            'line_type',
            'department_code',
            'department',
            'work_type',
            'start_km',
            'end_km',
            'scheduled_start_time',
            'scheduled_end_time',
            'duration_minutes',
            'traction_power_cutoff_required',
            'gang_id',
            'equipment_required',
            'equipment_id',
            'work_description',
        ]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)

        # Map field aliases
        if 'corridor_code' in data and 'corridor' not in data:
            data['corridor'] = data['corridor_code']
        elif 'corridor' not in data:
            data['corridor'] = 'NDLS-CNB-MAIN'

        if 'department' in data and 'department_code' not in data:
            data['department_code'] = str(data['department']).upper()

        if 'equipment_id' in data and 'equipment_required' not in data:
            data['equipment_required'] = data['equipment_id']

        if 'work_type' in data:
            raw_work = str(data['work_type']).strip().upper()
            if raw_work in WORK_TYPE_NORMALIZATION:
                data['work_type'] = WORK_TYPE_NORMALIZATION[raw_work]

        # Auto-compute scheduled_end_time if duration_minutes provided
        if 'scheduled_start_time' in data and 'scheduled_end_time' not in data and 'duration_minutes' in data:
            try:
                start_raw = data['scheduled_start_time']
                if isinstance(start_raw, str):
                    start_dt = datetime.datetime.fromisoformat(start_raw.replace('Z', '+00:00'))
                else:
                    start_dt = start_raw
                dur = int(data['duration_minutes'])
                end_dt = start_dt + datetime.timedelta(minutes=dur)
                data['scheduled_end_time'] = end_dt.isoformat()
            except Exception:
                pass

        return super().to_internal_value(data)

    def validate(self, data):
        start_km = float(data['start_km'])
        end_km = float(data['end_km'])
        corridor = data.get('corridor')
        if not corridor:
            corridor = Corridor.objects.filter(code='NDLS-CNB-MAIN').first()
            data['corridor'] = corridor

        # Rule 1 Coherence: Geography
        if start_km >= end_km:
            raise serializers.ValidationError({
                "end_km": f"Start KM ({start_km}) must be strictly less than End KM ({end_km})."
            })

        corridor_min = float(corridor.start_km)
        corridor_max = float(corridor.end_km)
        if start_km < corridor_min or end_km > corridor_max:
            raise serializers.ValidationError({
                "corridor": f"Kilometer range [{start_km}, {end_km}] exceeds corridor boundaries [{corridor_min}, {corridor_max}]."
            })

        t_start = data['scheduled_start_time']
        t_end = data['scheduled_end_time']

        # Rule 2 Coherence: Time Ordering & Maximum Duration (<= 8h)
        if t_start >= t_end:
            raise serializers.ValidationError({
                "scheduled_end_time": "Scheduled start time must be strictly before end time."
            })

        duration_hours = (t_end - t_start).total_seconds() / 3600.0
        if duration_hours > 8.0:
            raise serializers.ValidationError({
                "scheduled_end_time": f"Requested duration ({duration_hours:.1f} hrs) exceeds maximum 8.0 hours limit."
            })
        if duration_hours <= 0:
            raise serializers.ValidationError({
                "scheduled_end_time": "Duration must be greater than 0 hours."
            })

        return data


class BlockSanctionSerializer(serializers.Serializer):
    """
    Input schema for Chief Controller sanction (FUNC-BLK-005) with optimistic concurrency locking.
    """
    action = serializers.ChoiceField(choices=['SANCTION', 'CONDITIONAL_SANCTION', 'REJECT'])
    remarks = serializers.CharField(required=False, allow_blank=True, default='')
    caution_speed = serializers.IntegerField(required=False, min_value=15, max_value=130)
    version = serializers.IntegerField(required=True, help_text="Current entity version for optimistic locking")



class BlockActivationSerializer(serializers.Serializer):
    caution_order_id = serializers.CharField(required=True, max_length=50)


class BlockCompletionSerializer(serializers.Serializer):
    track_fit_certified = serializers.BooleanField(required=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default='Track handed back fit for traffic.')
