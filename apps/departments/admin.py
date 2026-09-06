from django.contrib import admin
from .models import Department, Gang, MaintenanceEquipment, WorkOrder


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'headquarters_division', 'contact_email', 'escalation_phone')
    search_fields = ('code', 'name', 'headquarters_division')


@admin.register(Gang)
class GangAdmin(admin.ModelAdmin):
    list_display = ('gang_number', 'department', 'headquarters_station', 'crew_strength', 'is_active', 'created_at')
    list_filter = ('department', 'is_active', 'headquarters_station')
    search_fields = ('gang_number', 'headquarters_station')


@admin.register(MaintenanceEquipment)
class MaintenanceEquipmentAdmin(admin.ModelAdmin):
    list_display = ('equipment_code', 'equipment_name', 'department', 'equipment_type', 'home_depot', 'operational_status', 'fitness_expiry_date')
    list_filter = ('department', 'equipment_type', 'operational_status')
    search_fields = ('equipment_code', 'equipment_name', 'home_depot')


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'block', 'department', 'gang', 'equipment', 'status', 'target_metric_units', 'actual_metric_units', 'safety_clearance_timestamp')
    list_filter = ('department', 'status')
    search_fields = ('order_number', 'block__block_code', 'gang__gang_number')
