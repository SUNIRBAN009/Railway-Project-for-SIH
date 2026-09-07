"""
Views for Notification Service (SVC-NOTIF).
Authoritative reference: docs/03-service-blueprints/08-notifications.md
"""
import logging
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView

from apps.accounts.api_envelope import ApiResponse
from apps.notifications.models import (
    Notification,
    NotificationPriority,
    NotificationCategory,
)
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationDispatchSerializer,
)
from apps.notifications.services.dispatcher import NotificationDispatcher

logger = logging.getLogger(__name__)


def get_user_notifications_queryset(user):
    """
    Returns queryset of notifications visible to the given user:
    1. Specifically addressed to this user.
    2. Addressed to the user's role (if any).
    3. Addressed to 'ALL' roles without a specific user.
    """
    if not user or not user.is_authenticated:
        return Notification.objects.none()

    q = Q(recipient_user=user) | Q(recipient_role='ALL')
    user_role = getattr(user, 'role', None)
    if user_role:
        q |= Q(recipient_role=str(user_role))

    return Notification.objects.filter(q).prefetch_related('delivery_logs')


class NotificationListView(APIView):
    """
    FUNC-NOTIF-001: Query & Dispatch Notifications.
    GET /api/v1/notifications/
    POST /api/v1/notifications/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = get_user_notifications_queryset(request.user)

        # Filter by read status
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            if is_read.lower() in ('true', '1'):
                qs = qs.filter(is_read=True)
            elif is_read.lower() in ('false', '0'):
                qs = qs.filter(is_read=False)

        # Filter by priority
        priority = request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority.upper())

        # Filter by category
        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category=category.upper())

        limit = int(request.query_params.get('limit', 50))
        notifications = qs.order_by('-created_at')[:limit]

        serializer = NotificationSerializer(notifications, many=True)
        return ApiResponse.success(data=serializer.data)

    def post(self, request, *args, **kwargs):
        """Dispatches an operational notification."""
        serializer = NotificationDispatchSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                message="Validation failed",
                code="VALIDATION_ERROR",
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        recipient_user = None
        if data.get('recipient_user_id'):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            recipient_user = User.objects.filter(id=data['recipient_user_id']).first()
        elif not data.get('recipient_role') or data.get('recipient_role') == 'ALL':
            recipient_user = request.user

        dispatcher = NotificationDispatcher()
        notification = dispatcher.dispatch(
            title=data['title'],
            message_body=data['message_body'],
            recipient_user=recipient_user,
            recipient_role=data.get('recipient_role', 'ALL'),
            recipient_phone=data.get('recipient_phone'),
            priority=data.get('priority', NotificationPriority.ROUTINE_INFO),
            category=data.get('category', NotificationCategory.GENERAL_INFO),
            target_entity_type=data.get('target_entity_type', ''),
            target_entity_id=data.get('target_entity_id', ''),
            send_sms=data.get('send_sms', False),
            corridor_code=data.get('corridor_code', 'ALL'),
        )

        out_serializer = NotificationSerializer(notification)
        return ApiResponse.success(
            data=out_serializer.data,
            message="Notification dispatched successfully",
            status_code=status.HTTP_201_CREATED
        )


class NotificationDetailView(APIView):
    """
    GET /api/v1/notifications/<uuid:pk>/
    DELETE /api/v1/notifications/<uuid:pk>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        try:
            notification = get_user_notifications_queryset(request.user).get(pk=pk)
        except Notification.DoesNotExist:
            return ApiResponse.error(
                message="Notification not found",
                code="NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        serializer = NotificationSerializer(notification)
        return ApiResponse.success(data=serializer.data)

    def delete(self, request, pk, *args, **kwargs):
        try:
            notification = get_user_notifications_queryset(request.user).get(pk=pk)
        except Notification.DoesNotExist:
            return ApiResponse.error(
                message="Notification not found",
                code="NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        notification.delete()
        return ApiResponse.success(message="Notification removed successfully")


class NotificationMarkReadView(APIView):
    """
    POST /api/v1/notifications/<uuid:pk>/mark-read/
    Marks a single notification as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            notification = get_user_notifications_queryset(request.user).get(pk=pk)
        except Notification.DoesNotExist:
            return ApiResponse.error(
                message="Notification not found",
                code="NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )

        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=['is_read', 'read_at'])

        serializer = NotificationSerializer(notification)
        return ApiResponse.success(data=serializer.data, message="Notification marked as read")


class NotificationMarkAllReadView(APIView):
    """
    POST /api/v1/notifications/mark-all-read/
    Marks all notifications for the authenticated user as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        qs = get_user_notifications_queryset(request.user).filter(is_read=False)
        updated_count = qs.update(is_read=True, read_at=timezone.now())
        return ApiResponse.success(
            data={"marked_read_count": updated_count},
            message=f"{updated_count} notifications marked as read"
        )


class NotificationUnreadCountView(APIView):
    """
    GET /api/v1/notifications/unread-count/
    Returns the count of unread and critical unread notifications.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = get_user_notifications_queryset(request.user).filter(is_read=False)
        total_unread = qs.count()
        critical_unread = qs.filter(priority=NotificationPriority.CRITICAL_ALARM).count()

        return ApiResponse.success(data={
            "unread_count": total_unread,
            "critical_count": critical_unread,
        })


class NotificationTestSendView(APIView):
    """
    POST /api/v1/notifications/test-send/
    Sends an immediate test notification to the authenticated user for verification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        priority = request.data.get('priority', NotificationPriority.URGENT_ACTION)
        category = request.data.get('category', NotificationCategory.SAFETY_CONFLICT_ALARM)
        title = request.data.get('title', 'Emergency Simulated Conflict Alert')
        message = request.data.get(
            'message',
            'Simulated Track Circuit Degradation detected at KM 124/8 (Corridor NDLS-CNB). Immediate inspection mandated.'
        )
        send_sms = bool(request.data.get('send_sms', False))
        phone = request.data.get('phone', getattr(request.user, 'phone_number', '9876543210'))

        dispatcher = NotificationDispatcher()
        notification = dispatcher.dispatch(
            title=title,
            message_body=message,
            recipient_user=request.user,
            recipient_role='ALL',
            recipient_phone=phone,
            priority=priority,
            category=category,
            target_entity_type='ASSET',
            target_entity_id='TRK-TEST-001',
            send_sms=send_sms,
            corridor_code='NDLS-CNB',
        )

        serializer = NotificationSerializer(notification)
        return ApiResponse.success(
            data=serializer.data,
            message="Test notification successfully dispatched"
        )
