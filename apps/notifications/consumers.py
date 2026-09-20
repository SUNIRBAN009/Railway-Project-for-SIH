"""
Daphne / Django Channels WebSocket Consumers for SVC-NOTIF & SVC-BLK (TSK-P3-01-BE).
Authoritative reference: docs/03-service-blueprints/08-notifications.md & docs/08-standards/01-api-standards.md
Provides live push-to-invalidate event stream for Corridor and In-App Notifications with Redis Pub/Sub.
"""
import logging
import time
from django.utils import timezone
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from apps.notifications.middleware import get_user_from_token

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for user-level and role-level live notifications.
    Clients connect to /ws/notifications/ or /ws/v1/notifications/
    """

    async def connect(self):
        self.user = self.scope.get('user')
        self.groups_joined = set()

        # 1. General broadcast notifications group
        general_group = "notifications_general"
        await self.channel_layer.group_add(general_group, self.channel_name)
        self.groups_joined.add(general_group)

        # Universal emergency alert group
        await self.channel_layer.group_add("emergency_all", self.channel_name)
        self.groups_joined.add("emergency_all")

        # 2. Join authenticated user, role, and department channels
        await self._join_user_groups()

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
            "groups": list(self.groups_joined),
            "timestamp": timezone.now().isoformat(),
        })

    async def _join_user_groups(self):
        if self.user and self.user.is_authenticated:
            user_group = f"user_{self.user.id}"
            await self.channel_layer.group_add(user_group, self.channel_name)
            self.groups_joined.add(user_group)

            profile = getattr(self.user, 'profile', None)
            role = getattr(profile, 'role', getattr(self.user, 'role', None))
            if role:
                role_group = f"role_{str(role).lower()}"
                await self.channel_layer.group_add(role_group, self.channel_name)
                self.groups_joined.add(role_group)

            dept = getattr(profile, 'department_code', None)
            if dept:
                dept_group = f"dept_{str(dept).lower()}"
                await self.channel_layer.group_add(dept_group, self.channel_name)
                self.groups_joined.add(dept_group)

    async def disconnect(self, close_code):
        for group in list(self.groups_joined):
            await self.channel_layer.group_discard(group, self.channel_name)
        logger.info("Notification WS disconnected (code: %s)", close_code)

    async def receive_json(self, content):
        """
        Handle incoming WebSocket messages from frontend client:
        - 'ping' -> 'pong'
        - 'authenticate' -> dynamically authorize with JWT token
        - 'ack' -> acknowledge notification receipt
        """
        msg_type = content.get('type')

        if msg_type == 'ping':
            await self.send_json({
                "type": "pong",
                "timestamp": timezone.now().isoformat(),
            })
        elif msg_type == 'authenticate':
            token = content.get('token')
            if token:
                user = await get_user_from_token(token)
                if user and user.is_authenticated:
                    self.user = user
                    await self._join_user_groups()
                    profile = getattr(user, 'profile', None)
                    await self.send_json({
                        "type": "authenticated",
                        "username": user.username,
                        "role": getattr(profile, 'role', ''),
                        "department": getattr(profile, 'department_code', ''),
                        "timestamp": timezone.now().isoformat(),
                    })
                else:
                    await self.send_json({
                        "type": "auth_error",
                        "message": "Invalid or expired JWT token.",
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
        if isinstance(data, dict):
            out_frame = dict(data)
            out_frame.setdefault('type', 'notification')
            out_frame.setdefault('payload', data)
            await self.send_json(out_frame)
        else:
            await self.send_json({
                "type": "notification",
                "payload": data,
            })

    async def emergency_alert(self, event):
        """
        Handler invoked when emergency.alert message is sent to group.
        Dispatches high-priority EMERGENCY_ALERT frame to client.
        """
        data = event.get('data', {})
        if isinstance(data, dict):
            out_frame = dict(data)
            out_frame.setdefault('type', 'EMERGENCY_ALERT')
            out_frame.setdefault('priority', 'CRITICAL_ALARM')
            out_frame.setdefault('timestamp', timezone.now().isoformat())
            await self.send_json(out_frame)
        else:
            await self.send_json({
                "type": "EMERGENCY_ALERT",
                "priority": "CRITICAL_ALARM",
                "payload": data,
                "timestamp": timezone.now().isoformat(),
            })


class CorridorConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for corridor-specific operational telemetry and push-to-invalidate cache events.
    Clients connect to /ws/corridor/<corridor_code>/ or /ws/v1/corridor/<corridor_code>/
    """

    async def connect(self):
        self.user = self.scope.get('user')
        self.corridor_code = self.scope['url_route']['kwargs'].get('corridor_code', 'ALL').upper()
        self.groups_joined = set()

        # 1. Primary corridor group
        primary_group = f"corridor_{self.corridor_code.lower()}"
        await self.channel_layer.group_add(primary_group, self.channel_name)
        self.groups_joined.add(primary_group)

        # 2. Universal corridor group
        await self.channel_layer.group_add("corridor_all", self.channel_name)
        self.groups_joined.add("corridor_all")

        # 3. Universal emergency alert group
        await self.channel_layer.group_add("emergency_all", self.channel_name)
        self.groups_joined.add("emergency_all")

        # 3. Base corridor group if sub-corridor is specified (e.g. NDLS-GZB-UP -> NDLS-GZB)
        parts = self.corridor_code.lower().split('-')
        if len(parts) > 2:
            base_corridor = f"corridor_{'-'.join(parts[:-1])}"
            await self.channel_layer.group_add(base_corridor, self.channel_name)
            self.groups_joined.add(base_corridor)

        await self.accept()

        logger.info(
            "CorridorConsumer connected: corridor=%s, groups=%s, user=%s",
            self.corridor_code,
            list(self.groups_joined),
            getattr(self.user, 'username', 'anonymous')
        )

        await self.send_json({
            "type": "corridor_connected",
            "corridor": self.corridor_code,
            "message": f"Subscribed to live push-to-invalidate stream for corridor {self.corridor_code}",
            "groups": list(self.groups_joined),
            "timestamp": timezone.now().isoformat(),
        })

    async def disconnect(self, close_code):
        for group in list(self.groups_joined):
            await self.channel_layer.group_discard(group, self.channel_name)
        logger.info("CorridorConsumer disconnected from %s (code: %s)", self.corridor_code, close_code)

    async def receive_json(self, content):
        """
        Handles incoming client control frames:
        - 'ping' -> responds 'pong' with current corridor
        - 'authenticate' -> binds JWT bearer user session
        - 'subscribe' -> dynamically joins another corridor group
        """
        msg_type = content.get('type')

        if msg_type == 'ping':
            await self.send_json({
                "type": "pong",
                "corridor": self.corridor_code,
                "timestamp": timezone.now().isoformat(),
            })
        elif msg_type == 'authenticate':
            token = content.get('token')
            if token:
                user = await get_user_from_token(token)
                if user and user.is_authenticated:
                    self.user = user
                    profile = getattr(user, 'profile', None)
                    await self.send_json({
                        "type": "authenticated",
                        "username": user.username,
                        "role": getattr(profile, 'role', ''),
                        "department": getattr(profile, 'department_code', ''),
                        "timestamp": timezone.now().isoformat(),
                    })
                else:
                    await self.send_json({
                        "type": "auth_error",
                        "message": "Invalid JWT token.",
                        "timestamp": timezone.now().isoformat(),
                    })
        elif msg_type == 'subscribe':
            new_corridor = content.get('corridor', '').upper()
            if new_corridor:
                group = f"corridor_{new_corridor.lower()}"
                await self.channel_layer.group_add(group, self.channel_name)
                self.groups_joined.add(group)
                await self.send_json({
                    "type": "subscribed",
                    "corridor": new_corridor,
                    "groups": list(self.groups_joined),
                    "timestamp": timezone.now().isoformat(),
                })

    async def corridor_event(self, event):
        """
        Handler invoked when corridor.event message is sent to corridor group.
        Dispatches standard push-to-invalidate frame (INVALIDATE_CACHE) to frontend.
        Deduplicates identical frames broadcast across overlapping corridor channel groups.
        """
        data = event.get('data', {})
        if isinstance(data, dict):
            event_key = f"{data.get('domain', '')}:{data.get('entity_id', '')}:{data.get('action', '')}:{data.get('status', '')}:{data.get('version', '')}"
            now = time.time()
            if not hasattr(self, '_recent_corridor_events'):
                self._recent_corridor_events = {}
            else:
                last_time = self._recent_corridor_events.get(event_key)
                if last_time and (now - last_time) < 2.0:
                    return
                if len(self._recent_corridor_events) > 100:
                    self._recent_corridor_events = {k: v for k, v in self._recent_corridor_events.items() if (now - v) < 5.0}
            self._recent_corridor_events[event_key] = now

            out_frame = dict(data)
            # Enforce standard push-to-invalidate contract
            out_frame.setdefault('type', data.get('type', 'INVALIDATE_CACHE'))
            out_frame.setdefault('domain', data.get('domain', 'BLOCKS'))
            out_frame.setdefault('resource', data.get('resource', 'blocks'))
            out_frame.setdefault('action', data.get('action', data.get('event_type', 'UPDATE')))
            out_frame.setdefault('corridor', self.corridor_code)
            out_frame.setdefault('payload', data)
            out_frame.setdefault('timestamp', timezone.now().isoformat())
            await self.send_json(out_frame)
        else:
            await self.send_json({
                "type": "INVALIDATE_CACHE",
                "domain": "BLOCKS",
                "resource": "blocks",
                "corridor": self.corridor_code,
                "payload": data,
                "timestamp": timezone.now().isoformat(),
            })

    async def notification_broadcast(self, event):
        """
        Handler invoked when notification.broadcast message is sent to corridor group.
        """
        data = event.get('data', {})
        if isinstance(data, dict):
            out_frame = dict(data)
            out_frame.setdefault('type', 'notification')
            out_frame.setdefault('corridor', self.corridor_code)
            out_frame.setdefault('payload', data)
            await self.send_json(out_frame)
        else:
            await self.send_json({
                "type": "corridor_event",
                "corridor": self.corridor_code,
                "payload": data,
            })

    async def emergency_alert(self, event):
        """
        Handler invoked when emergency.alert message is sent to corridor or emergency_all groups.
        Dispatches high-priority EMERGENCY_ALERT frame to corridor client.
        """
        data = event.get('data', {})
        if isinstance(data, dict):
            out_frame = dict(data)
            out_frame.setdefault('type', 'EMERGENCY_ALERT')
            out_frame.setdefault('priority', 'CRITICAL_ALARM')
            out_frame.setdefault('corridor', self.corridor_code)
            out_frame.setdefault('corridor_code', self.corridor_code)
            out_frame.setdefault('timestamp', timezone.now().isoformat())
            await self.send_json(out_frame)
        else:
            await self.send_json({
                "type": "EMERGENCY_ALERT",
                "priority": "CRITICAL_ALARM",
                "corridor": self.corridor_code,
                "payload": data,
                "timestamp": timezone.now().isoformat(),
            })
