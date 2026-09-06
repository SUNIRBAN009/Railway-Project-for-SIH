from django.db import models


class DispatchAlert(models.Model):
    """
    Emergency alerts and block possession dispatch notifications (SVC-NOTIF).
    """
    alert_id = models.CharField(max_length=50, unique=True, db_index=True)
    channel = models.CharField(
        max_length=20,
        choices=[('SMS_CDAC', 'CDAC Railway SMS'), ('IN_APP', 'In-App Modal Alert'), ('WEBSOCKET', 'Live WebSocket Chime')],
        default='IN_APP'
    )
    priority = models.CharField(
        max_length=20,
        choices=[('CRITICAL', 'Critical Alert'), ('URGENT', 'Urgent Notice'), ('INFO', 'Informational')],
        default='URGENT'
    )
    recipient_role = models.CharField(max_length=50, default='DEPT_ENGINEER')
    recipient_phone = models.CharField(max_length=20, blank=True)
    message = models.TextField()
    is_delivered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.priority}] {self.alert_id} ({self.channel})"
