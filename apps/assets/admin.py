from django.contrib import admin
from .models import TrackAsset, AssetDefectLog


@admin.register(TrackAsset)
class TrackAssetAdmin(admin.ModelAdmin):
    list_display = (
        'asset_tag',
        'name',
        'asset_category',
        'sub_type',
        'corridor',
        'location_km',
        'line_type',
        'current_health_score',
        'tqi_index',
        'is_operational'
    )
    list_filter = ('asset_category', 'line_type', 'is_operational')
    search_fields = ('asset_tag', 'name', 'sub_type')


@admin.register(AssetDefectLog)
class AssetDefectLogAdmin(admin.ModelAdmin):
    list_display = (
        'defect_code',
        'asset',
        'defect_type',
        'severity',
        'flaw_depth_mm',
        'recommended_speed_restriction_kmh',
        'block_recommended',
        'is_rectified',
        'emergency_block_id',
        'detected_at'
    )
    list_filter = ('defect_type', 'severity', 'block_recommended', 'is_rectified')
    search_fields = ('defect_code', 'asset__asset_tag', 'description')
