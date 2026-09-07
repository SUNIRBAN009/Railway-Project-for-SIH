"""
Notification Dispatcher Service for SVC-NOTIF (TSK-P3-011).
Authoritative reference: docs/03-service-blueprints/08-notifications.md
Orchestrates multi-channel delivery: In-App DB, Redis WebSocket Broadcast, and CDAC SMS Gateway.
"""
import logging
from typing import Optional, Dict, Any
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.notifications.models import (
    Notification,
    NotificationDeliveryLog,
    NotificationPriority,
    NotificationCategory,
    DeliveryChannel,
    DeliveryStatus,
)
from apps.notifications.services.sms_gateway import CDACSMSGatewayClient

logger = logging.getLogger(__name__)


class NotificationDispatcher:
    """
    Central dispatcher coordinating in-app notification persistence,
    Redis Channel Layer WebSocket event broadcasting, and CDAC SMS delivery.
    """

    def __init__(self, sms_client: Optional[CDACSMSGatewayClient] = None):
        self.sms_client = sms_client or CDACSMSGatewayClient()

    def dispatch(
        self,
        title: str,
        message_body: str,
        recipient_user=None,
        recipient_role: str = 'ALL',
        recipient_phone: Optional[str] = None,
        priority: str = NotificationPriority.ROUTINE_INFO,
        category: str = NotificationCategory.GENERAL_INFO,
        target_entity_type: str = '',
        target_entity_id: str = '',
        send_sms: bool = False,
        corridor_code: str = 'ALL',
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Notification:
        """
        Main entry point for dispatching an operational notification.
        1. Persists Notification in database.
        2. Logs and sends WebSocket push-to-invalidate event via Redis channel layer.
        3. If SMS is requested or priority is CRITICAL_ALARM, queues/dispatches SMS.
        """
        notification = Notification.objects.create(
            recipient_user=recipient_user,
            recipient_role=recipient_role,
            priority=priority,
            category=category,
            title=title,
            message_body=message_body,
            target_entity_type=target_entity_type,
            target_entity_id=str(target_entity_id) if target_entity_id else '',
        )

        # 1. WebSocket In-App Broadcast
        ws_log = NotificationDeliveryLog.objects.create(
            notification=notification,
            channel=DeliveryChannel.WEBSOCKET_INAPP,
            status=DeliveryStatus.QUEUED,
        )
        self._broadcast_websocket(
            notification=notification,
            delivery_log=ws_log,
            corridor_code=corridor_code,
            extra_data=extra_data or {}
        )

        # 2. CDAC SMS Delivery (if requested or CRITICAL_ALARM with phone available)
        should_send_sms = send_sms or (priority == NotificationPriority.CRITICAL_ALARM and recipient_phone)
        if should_send_sms and recipient_phone:
            sms_log = NotificationDeliveryLog.objects.create(
                notification=notification,
                channel=DeliveryChannel.SMS_GATEWAY,
                status=DeliveryStatus.QUEUED,
            )
            self._dispatch_sms(
                delivery_log=sms_log,
                phone_number=recipient_phone,
                message=f"[{priority}] {title}: {message_body}"[:160]
            )

        return notification

    def _broadcast_websocket(
        self,
        notification: Notification,
        delivery_log: NotificationDeliveryLog,
        corridor_code: str = 'ALL',
        extra_data: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Pushes a real-time event to the Redis channel layer groups:
        - `user_{recipient_id}` (if targeted to user)
        - `role_{recipient_role}` (if targeted to role)
        - `corridor_{corridor_code}` (for corridor-wide events)
        """
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning("No channel layer configured. Skipping WebSocket broadcast.")
            delivery_log.status = DeliveryStatus.FAILED
            delivery_log.error_message = "No ASGI channel layer configured."
            delivery_log.save(update_fields=['status', 'error_message'])
            return

        event_payload = {
            "type": "notification_message",
            "id": str(notification.id),
            "title": notification.title,
            "message": notification.message_body,
            "priority": notification.priority,
            "category": notification.category,
            "target_entity_type": notification.target_entity_type,
            "target_entity_id": notification.target_entity_id,
            "corridor_code": corridor_code,
            "created_at": notification.created_at.isoformat(),
            "extra_data": extra_data or {},
        }

        groups = []
        if notification.recipient_user:
            groups.append(f"user_{notification.recipient_user.id}")
        if notification.recipient_role and notification.recipient_role != 'ALL':
            groups.append(f"role_{notification.recipient_role.lower()}")
        if corridor_code:
            groups.append(f"corridor_{corridor_code.lower()}")
        
        # Always broadcast to generic notifications group as well
        groups.append("notifications_general")

        dispatched_any = False
        last_error = None
        for group in set(groups):
            try:
                async_to_sync(channel_layer.group_send)(
                    group,
                    {
                        "type": "notification.broadcast",
                        "data": event_payload,
                    }
                )
                dispatched_any = True
            except Exception as exc:
                logger.warning("Error pushing to channel group %s: %s", group, exc)
                last_error = str(exc)

        if dispatched_any:
            delivery_log.delivery_status = DeliveryStatus.DELIVERED
            delivery_log.dispatched_at = timezone.now()
            delivery_log.external_reference_id = f"WS-GROUPS:{','.join(groups)}"
        else:
            delivery_log.delivery_status = DeliveryStatus.FAILED
            delivery_log.error_details = last_error or "Failed to broadcast to any WebSocket group"

        delivery_log.save(update_fields=['delivery_status', 'dispatched_at', 'external_reference_id', 'error_details'])

    def _dispatch_sms(self, delivery_log: NotificationDeliveryLog, phone_number: str, message: str) -> None:
        """
        Sends SMS through CDAC gateway client and updates delivery log.
        """
        try:
            res = self.sms_client.send_sms(recipient_phone=phone_number, message=message)
            delivery_log.dispatched_at = timezone.now()
            delivery_log.external_reference_id = res.get('reference_id')
            if res.get('success'):
                delivery_log.delivery_status = DeliveryStatus.DELIVERED
            else:
                delivery_log.delivery_status = DeliveryStatus.FAILED
                delivery_log.error_details = res.get('error_message')
        except Exception as exc:
            logger.error("Failed to dispatch SMS: %s", exc)
            delivery_log.delivery_status = DeliveryStatus.FAILED
            delivery_log.error_details = str(exc)

        delivery_log.save(update_fields=['delivery_status', 'dispatched_at', 'external_reference_id', 'error_details'])

    def broadcast_corridor_event(
        self,
        corridor_code: str,
        event_type: str,
        payload: Dict[str, Any],
        title: str = "Corridor State Update",
        priority: str = NotificationPriority.ROUTINE_INFO
    ) -> Notification:
        """
        Convenience method to broadcast a corridor-wide cache invalidation or update.
        """
        return self.dispatch(
            title=title,
            message_body=f"Corridor {corridor_code} event: {event_type}",
            priority=priority,
            category=NotificationCategory.GENERAL_INFO,
            corridor_code=corridor_code,
            extra_data={"event_type": event_type, "payload": payload}
        )
