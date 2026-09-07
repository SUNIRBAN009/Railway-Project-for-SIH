"""
Notification services module for SVC-NOTIF.
"""
from .dispatcher import NotificationDispatcher
from .sms_gateway import CDACSMSGatewayClient

__all__ = ['NotificationDispatcher', 'CDACSMSGatewayClient']
