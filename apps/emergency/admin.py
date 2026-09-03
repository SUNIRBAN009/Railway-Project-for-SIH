from django.contrib import admin
from .models import SOSAlert, RPFUnit, EmergencyHelpline

@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    list_display = ('alert_id', 'emergency_type', 'passenger_name', 'passenger_phone', 'train_number', 'coach_number', 'status', 'triggered_at')
    list_filter = ('emergency_type', 'status')
    search_fields = ('alert_id', 'passenger_name', 'passenger_phone', 'train_number')

@admin.register(RPFUnit)
class RPFUnitAdmin(admin.ModelAdmin):
    list_display = ('unit_name', 'badge_officer', 'station_base', 'phone_number', 'status')
    list_filter = ('status', 'station_base')

@admin.register(EmergencyHelpline)
class EmergencyHelplineAdmin(admin.ModelAdmin):
    list_display = ('title', 'number', 'category', 'is_toll_free')
