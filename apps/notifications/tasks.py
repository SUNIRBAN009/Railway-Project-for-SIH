"""
Celery Background Tasks for Notification Service (SVC-NOTIF / TSK-P3-012).
Authoritative reference: docs/03-service-blueprints/08-notifications.md
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from celery import shared_task

from apps.notifications.models import (
    Notification,
    NotificationDeliveryLog,
    DeliveryStatus,
    DeliveryChannel,
)
from apps.notifications.services.sms_gateway import CDACSMSGatewayClient
from apps.notifications.services.dispatcher import NotificationDispatcher

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_cdac_sms_task(self, delivery_log_id: str, phone_number: str, message: str):
    """
    Celery task to dispatch SMS via Indian Railways CDAC Gateway with auto-retry.
    """
    try:
        log = NotificationDeliveryLog.objects.get(id=delivery_log_id)
    except NotificationDeliveryLog.DoesNotExist:
        logger.error("NotificationDeliveryLog %s does not exist", delivery_log_id)
        return False

    client = CDACSMSGatewayClient()
    try:
        log.dispatched_at = timezone.now()
        log.retry_attempts = self.request.retries
        res = client.send_sms(recipient_phone=phone_number, message=message)
        log.external_reference_id = res.get('reference_id')

        if res.get('success'):
            log.delivery_status = DeliveryStatus.DELIVERED
            log.save(update_fields=['delivery_status', 'dispatched_at', 'external_reference_id', 'retry_attempts'])
            return True
        else:
            log.delivery_status = DeliveryStatus.FAILED
            log.error_details = res.get('error_message')
            log.save(update_fields=['delivery_status', 'error_details', 'external_reference_id', 'retry_attempts'])
            raise Exception(res.get('error_message') or "SMS transmission failed")
    except Exception as exc:
        logger.warning("SMS task attempt %d failed: %s", self.request.retries + 1, exc)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            log.delivery_status = DeliveryStatus.DEAD_LETTER
            log.error_details = f"Dead-lettered after {self.max_retries} retries: {exc}"
            log.save(update_fields=['delivery_status', 'error_details'])
            return False


@shared_task
def async_dispatch_notification(
    title: str,
    message_body: str,
    recipient_user_id: int = None,
    recipient_role: str = 'ALL',
    recipient_phone: str = None,
    priority: str = 'ROUTINE_INFO',
    category: str = 'GENERAL_INFO',
    target_entity_type: str = '',
    target_entity_id: str = '',
    send_sms: bool = False,
    corridor_code: str = 'ALL',
):
    """
    Asynchronously invoke the NotificationDispatcher from Celery.
    """
    recipient_user = None
    if recipient_user_id:
        try:
            recipient_user = User.objects.get(id=recipient_user_id)
        except User.DoesNotExist:
            logger.warning("User %s not found for async dispatch", recipient_user_id)

    dispatcher = NotificationDispatcher()
    notification = dispatcher.dispatch(
        title=title,
        message_body=message_body,
        recipient_user=recipient_user,
        recipient_role=recipient_role,
        recipient_phone=recipient_phone,
        priority=priority,
        category=category,
        target_entity_type=target_entity_type,
        target_entity_id=target_entity_id,
        send_sms=send_sms,
        corridor_code=corridor_code,
    )
    return str(notification.id)


@shared_task
def purge_old_notifications_task(days_to_keep: int = 60):
    """
    Housekeeping task to purge stale read notifications beyond the retention period.
    """
    cutoff = timezone.now() - timedelta(days=days_to_keep)
    deleted_count, _ = Notification.objects.filter(is_read=True, created_at__lt=cutoff).delete()
    logger.info("Purged %d stale notifications older than %d days", deleted_count, days_to_keep)
    return deleted_count
