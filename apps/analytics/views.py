from rest_framework import viewsets, permissions
from .models import CorridorDailyKPI


class CorridorDailyKPIViewSet(viewsets.ModelViewSet):
    queryset = CorridorDailyKPI.objects.all()
    permission_classes = [permissions.IsAuthenticated]
