"""
Serializers for Operations Analytics & KPI Service (SVC-ANA).
Authoritative reference: docs/03-service-blueprints/07-analytics.md
"""
from rest_framework import serializers
from .models import CorridorDailyKPI, BlockEfficiencyRecord


class CorridorDailyKPISerializer(serializers.ModelSerializer):
    """Serializer for daily corridor KPI aggregation records."""
    possession_utilization_rate = serializers.SerializerMethodField()

    class Meta:
        model = CorridorDailyKPI
        fields = [
            'id',
            'metric_date',
            'division_code',
            'corridor_code',
            'total_blocks_requested',
            'total_blocks_sanctioned',
            'total_blocks_executed',
            'total_sanctioned_duration_minutes',
            'total_actual_duration_minutes',
            'total_possession_hours',
            'possession_utilization_rate',
            'co_possession_blocks_count',
            'total_train_delay_minutes_incurred',
            'corridor_punctuality_percentage',
            'conflict_mitigation_rate_pct',
            'shadow_blocks_count',
            'computed_at',
        ]
        read_only_fields = fields

    def get_possession_utilization_rate(self, obj):
        if obj.total_sanctioned_duration_minutes > 0:
            rate = (obj.total_actual_duration_minutes / obj.total_sanctioned_duration_minutes) * 100.0
            return round(rate, 2)
        return 100.0


class BlockEfficiencyRecordSerializer(serializers.ModelSerializer):
    """Serializer for individual block efficiency and burst duration audits."""
    class Meta:
        model = BlockEfficiencyRecord
        fields = [
            'id',
            'block_id',
            'corridor_code',
            'planned_hours',
            'actual_hours',
            'burst_hours',
            'gang_utilization_score',
            'trains_delayed_count',
            'total_delay_minutes',
            'created_at',
        ]
        read_only_fields = fields
