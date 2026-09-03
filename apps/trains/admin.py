from django.contrib import admin
from .models import Station, Train, TrainSchedule, CoachComposition, PlatformAllocation

@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'zone', 'division', 'number_of_platforms', 'has_wifi')
    search_fields = ('code', 'name', 'zone')
    list_filter = ('zone', 'has_wifi')

class TrainScheduleInline(admin.TabularInline):
    model = TrainSchedule
    extra = 1

class CoachCompositionInline(admin.TabularInline):
    model = CoachComposition
    extra = 1

@admin.register(Train)
class TrainAdmin(admin.ModelAdmin):
    list_display = ('train_number', 'name', 'train_type', 'source_station', 'destination_station', 'status', 'delay_minutes')
    list_filter = ('train_type', 'status')
    search_fields = ('train_number', 'name', 'source_station__name', 'destination_station__name')
    inlines = [TrainScheduleInline, CoachCompositionInline]

@admin.register(PlatformAllocation)
class PlatformAllocationAdmin(admin.ModelAdmin):
    list_display = ('station', 'platform_number', 'train', 'expected_arrival', 'status')
    list_filter = ('station', 'status')
