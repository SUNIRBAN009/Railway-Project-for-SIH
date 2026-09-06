from django.contrib import admin
from .models import Station, Train, TrainSchedule, TrainLiveStatus, CoachComposition, PlatformAllocation


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'zone', 'division', 'km_from_source', 'number_of_platforms', 'has_wifi')
    search_fields = ('code', 'name', 'zone')
    list_filter = ('zone', 'has_wifi')


class TrainScheduleInline(admin.TabularInline):
    model = TrainSchedule
    extra = 1
    fields = ('station_sequence', 'station_code', 'scheduled_arrival_time', 'scheduled_departure_time', 'platform_number', 'km_milestone')
    ordering = ('station_sequence',)


class TrainLiveStatusInline(admin.TabularInline):
    model = TrainLiveStatus
    extra = 0
    readonly_fields = ('last_reported_at',)


@admin.register(Train)
class TrainAdmin(admin.ModelAdmin):
    list_display = ('train_number', 'train_name', 'train_type', 'priority_rank', 'source_station', 'destination_station', 'traction_type', 'max_speed_kmh')
    list_filter = ('train_type', 'traction_type', 'is_daily')
    search_fields = ('train_number', 'train_name', 'source_station', 'destination_station')
    ordering = ('priority_rank', 'train_number')
    inlines = [TrainScheduleInline, TrainLiveStatusInline]


@admin.register(TrainSchedule)
class TrainScheduleAdmin(admin.ModelAdmin):
    list_display = ('train', 'station_sequence', 'station_code', 'scheduled_arrival_time', 'scheduled_departure_time', 'platform_number', 'km_milestone')
    list_filter = ('station_code',)
    search_fields = ('train__train_number', 'train__train_name', 'station_code')
    ordering = ('train', 'station_sequence')


@admin.register(TrainLiveStatus)
class TrainLiveStatusAdmin(admin.ModelAdmin):
    list_display = ('train', 'journey_date', 'current_station_code', 'current_km', 'delay_minutes', 'speed_kmh', 'status', 'last_reported_at')
    list_filter = ('status', 'journey_date', 'current_station_code')
    search_fields = ('train__train_number', 'train__train_name', 'current_station_code')
    ordering = ('-journey_date', 'delay_minutes')
