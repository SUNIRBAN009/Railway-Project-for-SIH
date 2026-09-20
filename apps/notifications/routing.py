"""
WebSocket URL routing for SVC-NOTIF (TSK-P3-010).
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/notifications/?$', consumers.NotificationConsumer.as_asgi(), name='ws_notifications'),
    re_path(r'^ws/v1/notifications/?$', consumers.NotificationConsumer.as_asgi(), name='ws_v1_notifications'),
    re_path(r'^ws/corridor/(?P<corridor_code>[\w\-]+)/?$', consumers.CorridorConsumer.as_asgi(), name='ws_corridor'),
    re_path(r'^ws/v1/corridor/(?P<corridor_code>[\w\-]+)/?$', consumers.CorridorConsumer.as_asgi(), name='ws_v1_corridor'),
]

