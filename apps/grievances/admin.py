from django.contrib import admin
from .models import Grievance, GrievanceComment, GrievanceAuditLog

class GrievanceCommentInline(admin.TabularInline):
    model = GrievanceComment
    extra = 1

class GrievanceAuditLogInline(admin.TabularInline):
    model = GrievanceAuditLog
    extra = 0
    readonly_fields = ('performed_by', 'old_status', 'new_status', 'remarks', 'timestamp')

@admin.register(Grievance)
class GrievanceAdmin(admin.ModelAdmin):
    list_display = ('tracking_id', 'subject', 'category', 'priority', 'status', 'urgency_score', 'passenger_name', 'created_at')
    list_filter = ('category', 'priority', 'status', 'is_ai_escalated')
    search_fields = ('tracking_id', 'subject', 'description', 'pnr_number', 'passenger_name', 'passenger_phone')
    inlines = [GrievanceCommentInline, GrievanceAuditLogInline]
