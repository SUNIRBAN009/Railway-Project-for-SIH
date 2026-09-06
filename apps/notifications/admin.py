from django.contrib import admin
from .models import DispatchAlert


@admin.register(DispatchAlert)
class DispatchAlertAdmin(admin.ModelAdmin):
    list_display = ('alert_id', 'channel', 'priority', 'recipient_role', 'is_delivered', 'created_at')
    list_filter = ('channel', 'priority', 'is_delivered')
