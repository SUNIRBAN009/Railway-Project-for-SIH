"""
URL configuration for Notification Service (SVC-NOTIF).
Authoritative reference: docs/03-service-blueprints/08-notifications.md
"""
from django.urls import path
from .views import (
    NotificationListView,
    NotificationDetailView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationUnreadCountView,
    NotificationTestSendView,
)

app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('unread-count/', NotificationUnreadCountView.as_view(), name='notification_unread_count'),
    path('mark-all-read/', NotificationMarkAllReadView.as_view(), name='notification_mark_all_read'),
    path('test-send/', NotificationTestSendView.as_view(), name='notification_test_send'),
    path('<uuid:pk>/', NotificationDetailView.as_view(), name='notification_detail'),
    path('<uuid:pk>/mark-read/', NotificationMarkReadView.as_view(), name='notification_mark_read'),
]
