from django.contrib import admin
from .models import CorridorDailyKPI, BlockEfficiencyRecord


@admin.register(CorridorDailyKPI)
class CorridorDailyKPIAdmin(admin.ModelAdmin):
    list_display = (
        'metric_date',
        'division_code',
        'corridor_code',
        'total_blocks_sanctioned',
        'total_blocks_executed',
        'total_possession_hours',
        'co_possession_blocks_count',
        'corridor_punctuality_percentage',
        'computed_at'
    )
    list_filter = ('division_code', 'corridor_code', 'metric_date')
    search_fields = ('corridor_code', 'division_code')
    date_hierarchy = 'metric_date'


@admin.register(BlockEfficiencyRecord)
class BlockEfficiencyRecordAdmin(admin.ModelAdmin):
    list_display = (
        'block_id',
        'corridor_code',
        'planned_hours',
        'actual_hours',
        'burst_hours',
        'gang_utilization_score',
        'trains_delayed_count',
        'created_at'
    )
    list_filter = ('corridor_code', 'created_at')
    search_fields = ('block_id', 'corridor_code')
