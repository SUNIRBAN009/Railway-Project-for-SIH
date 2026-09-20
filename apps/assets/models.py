import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.blocks.models import Corridor, LineType


class AssetCategory(models.TextChoices):
    PERMANENT_WAY = 'PERMANENT_WAY', 'Permanent Way (Rails, Sleepers, Ballast)'
    OHE_TRACTION = 'OHE_TRACTION', '25kV Traction Overhead Equipment'
    SIGNAL_INTERLOCKING = 'SIGNAL_INTERLOCKING', 'Signaling & Interlocking'
    TELECOM = 'TELECOM', 'Telecommunications & Axle Counters'
    BRIDGES_STRUCTURES = 'BRIDGES_STRUCTURES', 'Bridges, Culverts & Structures'


class DefectType(models.TextChoices):
    INTERNAL_RAIL_FRACTURE = 'INTERNAL_RAIL_FRACTURE', 'Internal Rail Fracture / Transverse Fissure'
    WHEEL_BURN = 'WHEEL_BURN', 'Wheel Burn / Scabbing'
    OHE_SAG_EXCESSIVE = 'OHE_SAG_EXCESSIVE', 'Excessive Catenary / Contact Wire Sag'
    POINT_SLACK_TIMEOUT = 'POINT_SLACK_TIMEOUT', 'Points Machine Slack / Detection Timeout'
    INSULATION_BREAKDOWN = 'INSULATION_BREAKDOWN', 'Track Circuit Insulation Breakdown'
    WELD_COLLAPSE = 'WELD_COLLAPSE', 'Thermit Weld Joint Failure'


class DefectSeverity(models.TextChoices):
    CRITICAL_IMMEDIATE_STOP = 'CRITICAL_IMMEDIATE_STOP', 'Critical Flaw - Immediate Train Stop (IMR)'
    IMPAIRMENT_SPEED_RESTRICTION = 'IMPAIRMENT_SPEED_RESTRICTION', 'Safety Impairment - Speed Restriction (OBS)'
    MONITORING_REQUIRED = 'MONITORING_REQUIRED', 'Routine Monitoring Required'


class TrackAsset(models.Model):
    """
    Physical Railway Infrastructure Asset (SVC-AST).
    Continuous Welded Rails, Turnouts, OHE Cantilevers, Signals, Axle Counters.
    Reference: docs/03-service-blueprints/06-assets.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset_tag = models.CharField(max_length=60, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    asset_category = models.CharField(
        max_length=40,
        choices=AssetCategory.choices,
        default=AssetCategory.PERMANENT_WAY,
        db_index=True
    )
    sub_type = models.CharField(
        max_length=80,
        help_text="e.g. 60KG_UIC_RAIL, POINT_MACHINE_143, OHE_CANTILEVER"
    )
    corridor = models.ForeignKey(
        Corridor,
        on_delete=models.RESTRICT,
        related_name='track_assets'
    )
    location_km = models.DecimalField(max_digits=8, decimal_places=3, db_index=True)
    line_type = models.CharField(
        max_length=20,
        choices=LineType.choices,
        default=LineType.DOWN
    )
    installation_date = models.DateField(null=True, blank=True)
    current_health_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00,
        db_index=True,
        help_text="100.0 = Brand New, < 40.0 = Critical Maintenance Required"
    )
    tqi_index = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=24.50,
        help_text="Track Quality Index (RDSO TRC standard)"
    )
    last_inspected_at = models.DateTimeField(null=True, blank=True)
    is_operational = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'track_assets'
        ordering = ['corridor', 'location_km']
        indexes = [
            models.Index(fields=['corridor', 'location_km']),
            models.Index(fields=['current_health_score']),
            models.Index(fields=['asset_category', 'is_operational']),
        ]

    def __str__(self):
        return f"{self.asset_tag} ({self.get_asset_category_display()} @ KM {self.location_km})"

    @property
    def needs_maintenance(self) -> bool:
        return float(self.current_health_score) < 40.0 or float(self.tqi_index) > 45.0


UnifiedAsset = TrackAsset


class AssetDefectLog(models.Model):
    """
    Identified rail, OHE or signaling defect triggering routine or emergency blocks.
    Reference: docs/03-service-blueprints/06-assets.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    defect_code = models.CharField(max_length=50, unique=True, db_index=True)
    asset = models.ForeignKey(
        TrackAsset,
        on_delete=models.CASCADE,
        related_name='defects'
    )
    defect_type = models.CharField(
        max_length=40,
        choices=DefectType.choices,
        default=DefectType.INTERNAL_RAIL_FRACTURE
    )
    severity = models.CharField(
        max_length=40,
        choices=DefectSeverity.choices,
        default=DefectSeverity.IMPAIRMENT_SPEED_RESTRICTION,
        db_index=True
    )
    detected_by_source = models.CharField(
        max_length=60,
        default='USFD_ULTRASONIC',
        help_text="e.g. USFD_CAR_04, MANUAL_TROLLEY_INSPECTION"
    )
    flaw_depth_mm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="USFD flaw depth in mm"
    )
    recommended_speed_restriction_kmh = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Temporary Caution Order speed restriction (km/h)"
    )
    block_recommended = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True if defect warrants immediate or scheduled maintenance block"
    )
    cof_score = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Consequence of Failure (1-5, Feature #92)"
    )
    lof_score = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Likelihood of Failure (1-5, Feature #92)"
    )
    overdue_days = models.PositiveIntegerField(
        default=0,
        help_text="Days defect has been active/overdue since initial detection (Feature #93)"
    )
    is_rectified = models.BooleanField(default=False, db_index=True)
    description = models.TextField(blank=True)
    emergency_block_id = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="Linked automated emergency block UUID"
    )
    detected_at = models.DateTimeField(auto_now_add=True)
    rectified_at = models.DateTimeField(null=True, blank=True)

    @property
    def final_risk_score(self) -> float:
        corridor_is_critical = getattr(self.asset.corridor, 'is_critical', True)
        base_risk = self.cof_score * self.lof_score
        multiplier = 1.25 if corridor_is_critical else 1.00
        return round(min(25.0, base_risk * multiplier), 2)

    @property
    def risk_category(self) -> str:
        score = self.final_risk_score
        if score >= 16.0:
            return "EXTREME_RISK"
        elif score >= 10.0:
            return "HIGH_RISK"
        elif score >= 5.0:
            return "MEDIUM_RISK"
        return "LOW_RISK"

    @property
    def aging_score(self) -> float:
        import math
        base = 20.0 if self.severity == DefectSeverity.CRITICAL_IMMEDIATE_STOP else (10.0 if self.severity == DefectSeverity.IMPAIRMENT_SPEED_RESTRICTION else 5.0)
        if self.overdue_days <= 0:
            return round(base, 2)
        k = 0.035
        capped_days = min(self.overdue_days, 60)
        return round(min(100.0, base * math.exp(k * capped_days)), 2)

    class Meta:
        db_table = 'asset_defect_logs'
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['asset', 'is_rectified']),
            models.Index(fields=['severity', 'is_rectified']),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.defect_code} on {self.asset.asset_tag}"
