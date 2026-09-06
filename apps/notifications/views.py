from rest_framework import viewsets, permissions
from .models import DispatchAlert


class DispatchAlertViewSet(viewsets.ModelViewSet):
    queryset = DispatchAlert.objects.all()
    permission_classes = [permissions.IsAuthenticated]
