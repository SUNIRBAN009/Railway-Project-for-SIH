from rest_framework import serializers
from apps.assets.models import TrackAsset, AssetDefectLog, DefectSeverity, DefectType


class AssetDefectLogSerializer(serializers.ModelSerializer):
    asset_tag = serializers.CharField(source='asset.asset_tag', read_only=True)
    defect_type_display = serializers.CharField(source='get_defect_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)

    class Meta:
        model = AssetDefectLog
        fields = [
            'id',
            'defect_code',
            'asset',
            'asset_tag',
            'defect_type',
            'defect_type_display',
            'severity',
            'severity_display',
            'detected_by_source',
            'flaw_depth_mm',
            'recommended_speed_restriction_kmh',
            'block_recommended',
            'is_rectified',
            'description',
            'emergency_block_id',
            'detected_at',
            'rectified_at',
        ]
        read_only_fields = ['id', 'emergency_block_id', 'detected_at']


class TrackAssetListSerializer(serializers.ModelSerializer):
    corridor_code = serializers.CharField(source='corridor.code', read_only=True)
    corridor_name = serializers.CharField(source='corridor.name', read_only=True)
    asset_category_display = serializers.CharField(source='get_asset_category_display', read_only=True)
    active_defects_count = serializers.SerializerMethodField()

    class Meta:
        model = TrackAsset
        fields = [
            'id',
            'asset_tag',
            'name',
            'asset_category',
            'asset_category_display',
            'sub_type',
            'corridor',
            'corridor_code',
            'corridor_name',
            'location_km',
            'line_type',
            'current_health_score',
            'tqi_index',
            'needs_maintenance',
            'is_operational',
            'active_defects_count',
            'last_inspected_at',
        ]

    def get_active_defects_count(self, obj):
        return obj.defects.filter(is_rectified=False).count()


class TrackAssetDetailSerializer(serializers.ModelSerializer):
    corridor_code = serializers.CharField(source='corridor.code', read_only=True)
    corridor_name = serializers.CharField(source='corridor.name', read_only=True)
    defects = AssetDefectLogSerializer(many=True, read_only=True)

    class Meta:
        model = TrackAsset
        fields = [
            'id',
            'asset_tag',
            'name',
            'asset_category',
            'sub_type',
            'corridor',
            'corridor_code',
            'corridor_name',
            'location_km',
            'line_type',
            'installation_date',
            'current_health_score',
            'tqi_index',
            'needs_maintenance',
            'last_inspected_at',
            'is_operational',
            'created_at',
            'updated_at',
            'defects',
        ]


class DefectRegistrationSerializer(serializers.Serializer):
    asset_id = serializers.CharField(required=True, help_text="Asset UUID or asset_tag")
    defect_type = serializers.ChoiceField(choices=DefectType.choices, default=DefectType.INTERNAL_RAIL_FRACTURE)
    severity = serializers.ChoiceField(choices=DefectSeverity.choices, default=DefectSeverity.IMPAIRMENT_SPEED_RESTRICTION)
    detected_by_source = serializers.CharField(default='USFD_TESTING_CAR_02')
    flaw_depth_mm = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    recommended_speed_restriction_kmh = serializers.IntegerField(required=False, allow_null=True)
    block_recommended = serializers.BooleanField(default=False)
    description = serializers.CharField(required=False, allow_blank=True, default='')


class TQICalculationSerializer(serializers.Serializer):
    asset_id = serializers.CharField(required=False, allow_null=True, help_text="Optional asset to persist updated TQI to")
    unevenness_sd = serializers.FloatField(required=True, min_value=0.0, help_text="Standard deviation of vertical rail profile (mm)")
    alignment_sd = serializers.FloatField(required=True, min_value=0.0, help_text="Standard deviation of lateral alignment (mm)")
    twist_sd = serializers.FloatField(required=True, min_value=0.0, help_text="Standard deviation of twist gradient (mm/m)")
    gauge_sd = serializers.FloatField(required=True, min_value=0.0, help_text="Standard deviation of gauge variation (mm)")
