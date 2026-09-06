from django.contrib import admin
from .models import TrackAsset, AssetDefectLog


@admin.register(TrackAsset)
class TrackAssetAdmin(admin.ModelAdmin):
    list_display = ('asset_id', 'name', 'asset_type', 'corridor_code', 'km_marker', 'health_score', 'tqi_index')
    list_filter = ('asset_type', 'corridor_code')


@admin.register(AssetDefectLog)
class AssetDefectLogAdmin(admin.ModelAdmin):
    list_display = ('defect_id', 'asset', 'severity', 'detected_by', 'is_rectified')
    list_filter = ('severity', 'is_rectified')
