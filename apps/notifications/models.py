import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationPriority(models.TextChoices):
    CRITICAL_EMERGENCY = 'CRITICAL_EMERGENCY', 'Critical Emergency'
    CRITICAL_ALARM = 'CRITICAL_ALARM', 'Critical Alarm'
    HIGH_OPERATIONAL = 'HIGH_OPERATIONAL', 'High Operational Priority'
    URGENT_ACTION = 'URGENT_ACTION', 'Urgent Action'
    ROUTINE_INFO = 'ROUTINE_INFO', 'Routine Information'


class NotificationCategory(models.TextChoices):
    BLOCK_SANCTIONED = 'BLOCK_SANCTIONED', 'Block Sanctioned'
    BLOCK_BURST_WARNING = 'BLOCK_BURST_WARNING', 'Block Burst Warning'
    SAFETY_CONFLICT_ALARM = 'SAFETY_CONFLICT_ALARM', 'Safety Conflict Alarm'
    WORK_ORDER_ASSIGNED = 'WORK_ORDER_ASSIGNED', 'Work Order Assigned'
    TRAIN_DELAY_ALERT = 'TRAIN_DELAY_ALERT', 'Train Delay Alert'
    CRITICAL_DEFECT_DETECTED = 'CRITICAL_DEFECT_DETECTED', 'Critical Defect Detected'
    GENERAL_INFO = 'GENERAL_INFO', 'General Information'


class DeliveryChannel(models.TextChoices):
    WEBSOCKET_INAPP = 'WEBSOCKET_INAPP', 'WebSocket In-App'
    SMS_GATEWAY = 'SMS_GATEWAY', 'CDAC Cellular SMS'
    EMAIL = 'EMAIL', 'Official Railway Email'


class DeliveryStatus(models.TextChoices):
    QUEUED = 'QUEUED', 'Queued for Dispatch'
    DISPATCHED = 'DISPATCHED', 'Dispatched to Carrier'
    DELIVERED = 'DELIVERED', 'Delivered'
    FAILED = 'FAILED', 'Failed'
    DEAD_LETTER = 'DEAD_LETTER', 'Dead Letter Archived'


class Notification(models.Model):
    """
    Real-Time Operational Notification Record (SVC-NOTIF).
    Authoritative reference: docs/03-service-blueprints/08-notifications.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
        help_text="Target user, or null for role/system broadcast"
    )
    recipient_role = models.CharField(
        max_length=40,
        default='ALL',
        db_index=True,
        help_text="Target role (e.g. CHIEF_CONTROLLER, DEPT_ENGINEER, ALL)"
    )
    priority = models.CharField(
        max_length=30,
        choices=NotificationPriority.choices,
        default=NotificationPriority.ROUTINE_INFO,
        db_index=True
    )
    category = models.CharField(
        max_length=40,
        choices=NotificationCategory.choices,
        default=NotificationCategory.GENERAL_INFO
    )
    title = models.CharField(max_length=150)
    message_body = models.TextField()
    target_entity_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="e.g. BLOCK, TRAIN, ASSET, WORK_ORDER"
    )
    target_entity_id = models.CharField(max_length=64, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient_user', 'is_read']),
            models.Index(fields=['recipient_role', 'priority']),
            models.Index(fields=['priority', 'created_at']),
        ]

    def __str__(self):
        target = f"User {self.recipient_user_id}" if self.recipient_user_id else f"Role {self.recipient_role}"
        return f"[{self.priority}] {self.title} -> {target}"


class NotificationDeliveryLog(models.Model):
    """
    Multi-Channel Delivery Audit & Dispatch Ledger (SVC-NOTIF).
    Tracks WebSocket in-app pushes and external CDAC SMS gateway transactions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='delivery_logs'
    )
    channel = models.CharField(
        max_length=30,
        choices=DeliveryChannel.choices,
        default=DeliveryChannel.WEBSOCKET_INAPP
    )
    delivery_status = models.CharField(
        max_length=30,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.QUEUED,
        db_index=True
    )
    external_reference_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Telco/CDAC SMS gateway message ID"
    )
    retry_attempts = models.PositiveIntegerField(default=0)
    error_details = models.TextField(blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __init__(self, *args, **kwargs):
        # Map convenience alias arguments to database column names
        if 'status' in kwargs and 'delivery_status' not in kwargs:
            kwargs['delivery_status'] = kwargs.pop('status')
        if 'error_message' in kwargs and 'error_details' not in kwargs:
            kwargs['error_details'] = kwargs.pop('error_message')
        if 'retry_count' in kwargs and 'retry_attempts' not in kwargs:
            kwargs['retry_attempts'] = kwargs.pop('retry_count')
        if 'delivered_at' in kwargs and 'dispatched_at' not in kwargs:
            kwargs['dispatched_at'] = kwargs.pop('delivered_at')
        if 'attempted_at' in kwargs and 'dispatched_at' not in kwargs:
            kwargs['dispatched_at'] = kwargs.pop('attempted_at')
        super().__init__(*args, **kwargs)

    @property
    def status(self):
        return self.delivery_status

    @status.setter
    def status(self, val):
        self.delivery_status = val

    @property
    def error_message(self):
        return self.error_details

    @error_message.setter
    def error_message(self, val):
        self.error_details = val

    @property
    def retry_count(self):
        return self.retry_attempts

    @retry_count.setter
    def retry_count(self, val):
        self.retry_attempts = val

    @property
    def delivered_at(self):
        return self.dispatched_at

    @delivered_at.setter
    def delivered_at(self, val):
        self.dispatched_at = val

    @property
    def attempted_at(self):
        return self.dispatched_at

    @attempted_at.setter
    def attempted_at(self, val):
        self.dispatched_at = val

    class Meta:
        db_table = 'notification_delivery_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['notification', 'channel']),
            models.Index(fields=['delivery_status', 'retry_attempts']),
        ]

    def __str__(self):
        return f"[{self.channel}] {self.notification.title[:30]} ({self.delivery_status})"
