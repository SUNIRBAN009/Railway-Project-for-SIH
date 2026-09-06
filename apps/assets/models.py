from django.db import models


class TrackAsset(models.Model):
    """
    Physical Railway Infrastructure Asset (SVC-AST).
    Tracks, Turnouts, OHE Cantilevers, Signals, Axle Counters.
    """
    asset_id = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    asset_type = models.CharField(
        max_length=50,
        choices=[
            ('RAIL_TRACK', 'Continuous Welded Rail (CWR)'),
            ('TURNOUT', 'Switch & Crossing Turnout'),
            ('OHE_MAST', 'Overhead Electric Cantilever Mast'),
            ('SIGNAL_POST', 'Multi-Aspect Colour Light Signal'),
            ('TRACK_CIRCUIT', 'Digital Axle Counter / Track Circuit'),
        ],
        default='RAIL_TRACK'
    )
    corridor_code = models.CharField(max_length=50, default='NDLS-GZB-UP')
    km_marker = models.DecimalField(max_digits=7, decimal_places=3)
    health_score = models.DecimalField(max_digits=5, decimal_places=2, default=95.0, help_text="0-100% Health")
    tqi_index = models.DecimalField(max_digits=5, decimal_places=2, default=24.5, help_text="Track Quality Index")
    last_inspected_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.asset_id} ({self.get_asset_type_display()} at KM {self.km_marker})"


class AssetDefectLog(models.Model):
    """
    Identified rail defect triggering routine or emergency block possessions.
    """
    defect_id = models.CharField(max_length=50, unique=True, db_index=True)
    asset = models.ForeignKey(TrackAsset, on_delete=models.CASCADE, related_name='defects')
    severity = models.CharField(
        max_length=20,
        choices=[('CRITICAL', 'Critical Rail Fracture'), ('MAJOR', 'Major Flaw (IMR)'), ('MINOR', 'Minor Surface Wear')],
        default='MAJOR'
    )
    detected_by = models.CharField(max_length=50, default='USFD_ULTRASONIC')
    description = models.TextField()
    is_rectified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.severity}] {self.defect_id} on {self.asset.asset_id}"
