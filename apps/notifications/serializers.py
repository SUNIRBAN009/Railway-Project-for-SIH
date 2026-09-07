"""
Serializers for Notification Service (SVC-NOTIF).
Authoritative reference: docs/03-service-blueprints/08-notifications.md
"""
from rest_framework import serializers
from .models import (
    Notification,
    NotificationDeliveryLog,
    NotificationPriority,
    NotificationCategory,
    DeliveryChannel,
    DeliveryStatus,
)


class NotificationDeliveryLogSerializer(serializers.ModelSerializer):
    """Serializer for channel delivery audit logs."""
    class Meta:
        model = NotificationDeliveryLog
        fields = [
            'id',
            'channel',
            'status',
            'external_reference_id',
            'error_message',
            'retry_count',
            'attempted_at',
            'delivered_at',
        ]
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for real-time notifications."""
    delivery_logs = NotificationDeliveryLogSerializer(many=True, read_only=True)
    recipient_username = serializers.CharField(source='recipient_user.username', read_only=True, default=None)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient_user',
            'recipient_username',
            'recipient_role',
            'priority',
            'priority_display',
            'category',
            'category_display',
            'title',
            'message_body',
            'target_entity_type',
            'target_entity_id',
            'is_read',
            'read_at',
            'created_at',
            'delivery_logs',
        ]
        read_only_fields = [
            'id',
            'recipient_username',
            'priority_display',
            'category_display',
            'read_at',
            'created_at',
            'delivery_logs',
        ]


class NotificationDispatchSerializer(serializers.Serializer):
    """Payload for triggering operational notifications across channels."""
    recipient_user_id = serializers.IntegerField(required=False, allow_null=True)
    recipient_role = serializers.CharField(max_length=50, required=False, default='ALL')
    recipient_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    priority = serializers.ChoiceField(
        choices=NotificationPriority.choices,
        default=NotificationPriority.ROUTINE_INFO
    )
    category = serializers.ChoiceField(
        choices=NotificationCategory.choices,
        default=NotificationCategory.GENERAL_INFO
    )
    title = serializers.CharField(max_length=150)
    message_body = serializers.CharField()
    target_entity_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    target_entity_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    send_sms = serializers.BooleanField(default=False)
    corridor_code = serializers.CharField(max_length=50, required=False, default='ALL')
