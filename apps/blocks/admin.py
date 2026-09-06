from django.contrib import admin
from .models import Corridor, Block, BlockConflict


@admin.register(Corridor)
class CorridorAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'division', 'start_km', 'end_km', 'is_electrified', 'max_permissible_speed_kmh')
    search_fields = ('code', 'name', 'division')
    list_filter = ('division', 'is_electrified')


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('block_code', 'department_code', 'corridor', 'line_type', 'work_type', 'start_km', 'end_km', 'status', 'scheduled_start_time', 'scheduled_end_time', 'is_shadow')
    list_filter = ('department_code', 'status', 'line_type', 'is_shadow')
    search_fields = ('block_code', 'corridor__code', 'corridor__name')


@admin.register(BlockConflict)
class BlockConflictAdmin(admin.ModelAdmin):
    list_display = ('block', 'conflict_type', 'severity', 'conflicting_entity_label', 'overlap_start_km', 'overlap_end_km', 'resolution_status')
    list_filter = ('severity', 'conflict_type', 'resolution_status')
    search_fields = ('block__block_code', 'conflicting_entity_label')
