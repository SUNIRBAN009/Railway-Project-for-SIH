from rest_framework import serializers
from apps.trains.models import Train, TrainSchedule, TrainLiveStatus, Station


class TrainScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainSchedule
        fields = [
            'id',
            'station_code',
            'station_sequence',
            'scheduled_arrival_time',
            'scheduled_departure_time',
            'platform_number',
            'corridor_section_id',
            'km_milestone',
        ]


class TrainLiveStatusSerializer(serializers.ModelSerializer):
    train_number = serializers.CharField(source='train.train_number', read_only=True)
    train_name = serializers.CharField(source='train.train_name', read_only=True)
    train_type = serializers.CharField(source='train.train_type', read_only=True)
    priority_rank = serializers.IntegerField(source='train.priority_rank', read_only=True)
    is_punctual = serializers.BooleanField(read_only=True)

    class Meta:
        model = TrainLiveStatus
        fields = [
            'id',
            'train_id',
            'train_number',
            'train_name',
            'train_type',
            'priority_rank',
            'journey_date',
            'current_station_code',
            'current_km',
            'delay_minutes',
            'speed_kmh',
            'status',
            'is_punctual',
            'active_caution_orders',
            'last_reported_at',
        ]


class TrainMasterSerializer(serializers.ModelSerializer):
    schedules = TrainScheduleSerializer(many=True, read_only=True)
    current_status = serializers.SerializerMethodField()
    is_prestige = serializers.BooleanField(read_only=True)
    is_freight = serializers.BooleanField(read_only=True)

    class Meta:
        model = Train
        fields = [
            'id',
            'train_number',
            'train_name',
            'train_type',
            'priority_rank',
            'source_station',
            'destination_station',
            'is_daily',
            'operating_days_mask',
            'traction_type',
            'max_speed_kmh',
            'length_meters',
            'is_prestige',
            'is_freight',
            'current_status',
            'schedules',
            'created_at',
        ]

    def get_current_status(self, obj):
        latest = obj.current_live_status
        if latest:
            return TrainLiveStatusSerializer(latest).data
        return None


class DelaySimulationRequestSerializer(serializers.Serializer):
    block_id = serializers.CharField(required=False, allow_blank=True, default='')
    affected_train_ids = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    imposed_speed_restriction_kmh = serializers.FloatField(default=30.0, min_value=5.0, max_value=160.0)
    corridor_length_km = serializers.FloatField(default=3.700, min_value=0.1, max_value=500.0)
