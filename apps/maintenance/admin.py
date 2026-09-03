from django.contrib import admin
from .models import DefectReport, WorkOrder

class WorkOrderInline(admin.TabularInline):
    model = WorkOrder
    extra = 1

@admin.register(DefectReport)
class DefectReportAdmin(admin.ModelAdmin):
    list_display = ('report_id', 'defect_type', 'severity', 'section_name', 'track_km_marker', 'ai_confidence_score', 'status', 'created_at')
    list_filter = ('defect_type', 'severity', 'status')
    search_fields = ('report_id', 'section_name', 'track_km_marker', 'description')
    inlines = [WorkOrderInline]

@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'defect', 'assigned_crew', 'assigned_engineer', 'status', 'created_at')
    list_filter = ('status',)
