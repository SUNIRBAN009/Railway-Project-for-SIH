"""
Daphne / Django Channels WebSocket Consumers for SVC-NOTIF (TSK-P3-010).
Authoritative reference: docs/03-service-blueprints/08-notifications.md
Provides live push-to-invalidate event stream for Corridor and In-App Notifications.
"""
import logging
from django.utils import timezone
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for user-level and role-level live notifications.
    Clients connect to /ws/notifications/
    """

    async def connect(self):
        self.user = self.scope.get('user')
        self.groups_joined = set()

        # Always join the general notifications group
        general_group = "notifications_general"
        await self.channel_layer.group_add(general_group, self.channel_name)
        self.groups_joined.add(general_group)

        # If authenticated, join user-specific and role-specific channels
        if self.user and self.user.is_authenticated:
            user_group = f"user_{self.user.id}"
            await self.channel_layer.group_add(user_group, self.channel_name)
            self.groups_joined.add(user_group)

            role = getattr(self.user, 'role', None)
            if role:
                role_group = f"role_{str(role).lower()}"
                await self.channel_layer.group_add(role_group, self.channel_name)
                self.groups_joined.add(role_group)

        await self.accept()
        logger.info(
            "Notification WS connected: user=%s, groups=%s",
            getattr(self.user, 'username', 'anonymous'),
            list(self.groups_joined)
        )

        # Send welcome/ready handshake
        await self.send_json({
            "type": "connection_established",
            "message": "Connected to Indian Railways Real-Time Notification Stream",
            "user": getattr(self.user, 'username', 'anonymous'),
            "timestamp": timezone.now().isoformat(),
        })

    async def disconnect(self, close_code):
        for group in self.groups_joined:
            await self.channel_layer.group_discard(group, self.channel_name)
        logger.info("Notification WS disconnected (code: %s)", close_code)

    async def receive_json(self, content):
        """
        Handle incoming WebSocket messages from frontend client.
        Supports heartbeat pings and client-side acknowledgments.
        """
        msg_type = content.get('type')
        if msg_type == 'ping':
            await self.send_json({
                "type": "pong",
                "timestamp": timezone.now().isoformat(),
            })
        elif msg_type == 'ack':
            logger.debug("Received ack for notification %s", content.get('notification_id'))
        else:
            await self.send_json({
                "type": "echo",
                "received": content,
            })

    async def notification_broadcast(self, event):
        """
        Handler invoked when notification.broadcast message is sent to group.
        """
        data = event.get('data', {})
        await self.send_json({
            "type": "notification",
            "payload": data,
        })


class CorridorConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for corridor-specific operational telemetry and cache invalidation.
    Clients connect to /ws/corridor/<corridor_code>/
    """

    async def connect(self):
        self.corridor_code = self.scope['url_route']['kwargs'].get('corridor_code', 'ALL').upper()
        self.corridor_group = f"corridor_{self.corridor_code.lower()}"

        await self.channel_layer.group_add(self.corridor_group, self.channel_name)
        await self.accept()

        logger.info("CorridorConsumer connected to %s", self.corridor_group)
        await self.send_json({
            "type": "corridor_connected",
            "corridor": self.corridor_code,
            "message": f"Subscribed to live updates for corridor {self.corridor_code}",
            "timestamp": timezone.now().isoformat(),
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'corridor_group'):
            await self.channel_layer.group_discard(self.corridor_group, self.channel_name)
        logger.info("CorridorConsumer disconnected from %s", getattr(self, 'corridor_group', 'unknown'))

    async def receive_json(self, content):
        msg_type = content.get('type')
        if msg_type == 'ping':
            await self.send_json({
                "type": "pong",
                "corridor": self.corridor_code,
                "timestamp": timezone.now().isoformat(),
            })

    async def notification_broadcast(self, event):
        """
        Handler invoked when notification.broadcast message is sent to corridor group.
        """
        data = event.get('data', {})
        await self.send_json({
            "type": "corridor_event",
            "corridor": self.corridor_code,
            "payload": data,
        })
