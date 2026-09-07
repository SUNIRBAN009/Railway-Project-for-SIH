"""
Comprehensive Unit & Integration Tests for Notification Service (SVC-NOTIF).
Covers TSK-P3-010 (Daphne WebSocket), TSK-P3-011 (Redis Channel Layer Dispatcher),
TSK-P3-012 (CDAC SMS Gateway), TSK-P3-013 (In-App Bell & Chime), and TSK-P3-014 (ASGI Stream).
"""
import uuid
from django.test import TestCase, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from channels.testing import WebsocketCommunicator

from apps.notifications.models import (
    Notification,
    NotificationDeliveryLog,
    NotificationPriority,
    NotificationCategory,
    DeliveryChannel,
    DeliveryStatus,
)
from apps.notifications.services.sms_gateway import CDACSMSGatewayClient
from apps.notifications.services.dispatcher import NotificationDispatcher
from apps.notifications.tasks import (
    send_cdac_sms_task,
    async_dispatch_notification,
    purge_old_notifications_task,
)
from apps.notifications.consumers import NotificationConsumer, CorridorConsumer

User = get_user_model()

TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS, CELERY_TASK_ALWAYS_EAGER=True)
class CDACSMSGatewayClientTests(TestCase):
    """Tests for Indian Railways CDAC SMS Gateway Client (TSK-P3-012)."""

    def setUp(self):
        self.client = CDACSMSGatewayClient()

    def test_phone_sanitization(self):
        # 10 digits
        self.assertEqual(CDACSMSGatewayClient.sanitize_phone_number("9876543210"), "9876543210")
        # With +91
        self.assertEqual(CDACSMSGatewayClient.sanitize_phone_number("+919876543210"), "9876543210")
        # With 91 prefix
        self.assertEqual(CDACSMSGatewayClient.sanitize_phone_number("919876543210"), "9876543210")
        # With leading 0
        self.assertEqual(CDACSMSGatewayClient.sanitize_phone_number("09876543210"), "9876543210")
        # With spaces and hyphens
        self.assertEqual(CDACSMSGatewayClient.sanitize_phone_number("+91 98765-43210"), "9876543210")

    def test_invalid_phone_raises_error(self):
        with self.assertRaises(ValueError):
            CDACSMSGatewayClient.sanitize_phone_number("12345")
        with self.assertRaises(ValueError):
            CDACSMSGatewayClient.sanitize_phone_number("")
        with self.assertRaises(ValueError):
            CDACSMSGatewayClient.sanitize_phone_number("5876543210")  # Indian mobiles start with 6-9

    def test_send_sms_simulation(self):
        res = self.client.send_sms("9876543210", "Test Emergency Block Sanction")
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "DELIVERED")
        self.assertTrue(res["reference_id"].startswith("CDAC-"))
        self.assertEqual(res["recipient_phone"], "9876543210")


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS, CELERY_TASK_ALWAYS_EAGER=True)
class NotificationDispatcherTests(TestCase):
    """Tests for NotificationDispatcher multi-channel orchestration (TSK-P3-011)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='test_controller',
            email='controller@railway.gov.in',
            password='testpassword'
        )
        self.dispatcher = NotificationDispatcher()

    def test_dispatch_inapp_websocket(self):
        notification = self.dispatcher.dispatch(
            title="Block Sanctioned",
            message_body="Block 26027-BLK-01 sanctioned by Section Controller.",
            recipient_user=self.user,
            recipient_role='CHIEF_CONTROLLER',
            priority=NotificationPriority.URGENT_ACTION,
            category=NotificationCategory.BLOCK_SANCTIONED,
            corridor_code='NDLS-CNB',
        )

        self.assertIsNotNone(notification.id)
        self.assertEqual(notification.recipient_user, self.user)
        self.assertEqual(notification.priority, NotificationPriority.URGENT_ACTION)
        self.assertEqual(notification.category, NotificationCategory.BLOCK_SANCTIONED)

        # Check delivery log created for WEBSOCKET_INAPP
        log = notification.delivery_logs.filter(channel=DeliveryChannel.WEBSOCKET_INAPP).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, DeliveryStatus.DELIVERED)
        self.assertIn("WS-GROUPS", log.external_reference_id)

    def test_dispatch_with_cdac_sms(self):
        notification = self.dispatcher.dispatch(
            title="Critical Broken Rail Alarm",
            message_body="Severe track fracture detected at KM 120/4. Immediate halt.",
            recipient_user=self.user,
            recipient_phone="+919876543210",
            priority=NotificationPriority.CRITICAL_ALARM,
            category=NotificationCategory.SAFETY_CONFLICT_ALARM,
            send_sms=True,
            corridor_code='NDLS-CNB',
        )

        # Check both WEBSOCKET and SMS logs created
        logs = notification.delivery_logs.all()
        channels = [l.channel for l in logs]
        self.assertIn(DeliveryChannel.WEBSOCKET_INAPP, channels)
        self.assertIn(DeliveryChannel.SMS_GATEWAY, channels)

        sms_log = notification.delivery_logs.get(channel=DeliveryChannel.SMS_GATEWAY)
        self.assertEqual(sms_log.status, DeliveryStatus.DELIVERED)
        self.assertTrue(sms_log.external_reference_id.startswith("CDAC-"))

    def test_broadcast_corridor_event(self):
        notification = self.dispatcher.broadcast_corridor_event(
            corridor_code='NDLS-CNB',
            event_type='SCHEDULE_REOPTIMIZED',
            payload={"affected_trains": ["12001", "12002"]},
            title="Corridor Cache Invalidation"
        )
        self.assertIsNotNone(notification.id)
        self.assertEqual(notification.title, "Corridor Cache Invalidation")


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS, CELERY_TASK_ALWAYS_EAGER=True)
class NotificationTasksTests(TestCase):
    """Tests for Celery background tasks (TSK-P3-012)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='celery_user',
            password='testpassword'
        )

    def test_send_cdac_sms_task(self):
        notification = Notification.objects.create(
            recipient_user=self.user,
            title="Task SMS",
            message_body="Task message",
        )
        log = NotificationDeliveryLog.objects.create(
            notification=notification,
            channel=DeliveryChannel.SMS_GATEWAY,
            status=DeliveryStatus.QUEUED
        )

        res = send_cdac_sms_task(str(log.id), "9876543210", "Test Celery SMS")
        self.assertTrue(res)

        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.DELIVERED)

    def test_async_dispatch_notification(self):
        nid = async_dispatch_notification(
            title="Async Alert",
            message_body="Dispatched via Celery worker",
            recipient_user_id=self.user.id,
            recipient_role='ALL',
            priority=NotificationPriority.ROUTINE_INFO
        )
        self.assertIsNotNone(nid)
        self.assertTrue(Notification.objects.filter(id=nid).exists())

    def test_purge_old_notifications_task(self):
        purged = purge_old_notifications_task(days_to_keep=30)
        self.assertIsInstance(purged, int)


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS, CELERY_TASK_ALWAYS_EAGER=True)
class NotificationAPITests(TestCase):
    """Tests for Notification REST API endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='api_engineer',
            password='testpassword'
        )
        self.client.login(username='api_engineer', password='testpassword')

        # Create sample notifications
        self.n1 = Notification.objects.create(
            recipient_user=self.user,
            title="Unread General Alert",
            message_body="OHE Power Block clearance granted.",
            priority=NotificationPriority.ROUTINE_INFO,
            category=NotificationCategory.GENERAL_INFO,
            is_read=False
        )
        self.n2 = Notification.objects.create(
            recipient_user=self.user,
            title="Unread Critical Safety Alarm",
            message_body="Track geometry exceedance at Point 104.",
            priority=NotificationPriority.CRITICAL_ALARM,
            category=NotificationCategory.SAFETY_CONFLICT_ALARM,
            is_read=False
        )

    def test_list_notifications(self):
        url = reverse('notifications:notification_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertTrue(json_data['success'])
        self.assertEqual(len(json_data['data']), 2)

    def test_unread_count(self):
        url = reverse('notifications:notification_unread_count')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertTrue(json_data['success'])
        self.assertEqual(json_data['data']['unread_count'], 2)
        self.assertEqual(json_data['data']['critical_count'], 1)

    def test_mark_single_read(self):
        url = reverse('notifications:notification_mark_read', kwargs={'pk': self.n1.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        self.n1.refresh_from_db()
        self.assertTrue(self.n1.is_read)
        self.assertIsNotNone(self.n1.read_at)

    def test_mark_all_read(self):
        url = reverse('notifications:notification_mark_all_read')
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        self.assertEqual(
            Notification.objects.filter(recipient_user=self.user, is_read=False).count(),
            0
        )

    def test_test_send_endpoint(self):
        url = reverse('notifications:notification_test_send')
        response = self.client.post(url, {
            'priority': 'URGENT_ACTION',
            'title': 'Test Integration Alert',
            'message': 'Simulated track circuit fluctuation.'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertTrue(json_data['success'])
        self.assertEqual(json_data['data']['title'], 'Test Integration Alert')


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class WebSocketConsumerTests(TestCase):
    """Tests for Daphne / Channels WebSocket consumers (TSK-P3-010)."""

    async def test_notification_consumer_lifecycle(self):
        communicator = WebsocketCommunicator(
            NotificationConsumer.as_asgi(),
            "/ws/notifications/"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Receive connection handshake
        handshake = await communicator.receive_json_from()
        self.assertEqual(handshake["type"], "connection_established")

        # Test Heartbeat Ping
        await communicator.send_json_to({"type": "ping"})
        pong = await communicator.receive_json_from()
        self.assertEqual(pong["type"], "pong")

        await communicator.disconnect()

    async def test_corridor_consumer_lifecycle(self):
        communicator = WebsocketCommunicator(
            CorridorConsumer.as_asgi(),
            "/ws/corridor/NDLS-CNB/"
        )
        communicator.scope['url_route'] = {'kwargs': {'corridor_code': 'NDLS-CNB'}}
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Receive corridor connection message
        welcome = await communicator.receive_json_from()
        self.assertEqual(welcome["type"], "corridor_connected")
        self.assertEqual(welcome["corridor"], "NDLS-CNB")

        # Test Heartbeat Ping
        await communicator.send_json_to({"type": "ping"})
        pong = await communicator.receive_json_from()
        self.assertEqual(pong["type"], "pong")
        self.assertEqual(pong["corridor"], "NDLS-CNB")

        await communicator.disconnect()
