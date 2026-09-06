from rest_framework import viewsets, permissions
from .models import TrackAsset, AssetDefectLog


class TrackAssetViewSet(viewsets.ModelViewSet):
    queryset = TrackAsset.objects.all()
    permission_classes = [permissions.IsAuthenticated]


class AssetDefectLogViewSet(viewsets.ModelViewSet):
    queryset = AssetDefectLog.objects.select_related('asset').all()
    permission_classes = [permissions.IsAuthenticated]
