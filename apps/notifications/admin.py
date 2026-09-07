from django.contrib import admin
from .models import Notification, NotificationDeliveryLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient_user', 'recipient_role', 'priority', 'category', 'is_read', 'created_at')
    list_filter = ('priority', 'category', 'is_read', 'recipient_role')
    search_fields = ('title', 'message_body', 'recipient_user__username')


@admin.register(NotificationDeliveryLog)
class NotificationDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ('notification', 'channel', 'delivery_status', 'retry_attempts', 'external_reference_id', 'dispatched_at')
    list_filter = ('channel', 'delivery_status')
    search_fields = ('notification__title', 'external_reference_id')
