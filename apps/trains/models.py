import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Station(models.Model):
    """Geographical station nodes along the operational corridor."""
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=10, unique=True, db_index=True)
    zone = models.CharField(max_length=50, default="NR")
    division = models.CharField(max_length=50, default="Delhi")
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    km_from_source = models.DecimalField(max_digits=8, decimal_places=3, default=0.0)
    number_of_platforms = models.PositiveIntegerField(default=5)
    has_wifi = models.BooleanField(default=True)
    has_medical_booth = models.BooleanField(default=True)
    rpf_post_phone = models.CharField(max_length=20, default="182 / 139")

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.name} ({self.code})"


class TrainType(models.TextChoices):
    PRESTIGE_SUPERFAST = 'PRESTIGE_SUPERFAST', 'Prestige Superfast (Rajdhani / Shatabdi / Vande Bharat)'
    PASSENGER_EXPRESS = 'PASSENGER_EXPRESS', 'Passenger Express / Mail'
    SUBURBAN_EMU = 'SUBURBAN_EMU', 'Suburban EMU / Local'
    CONTAINER_FREIGHT = 'CONTAINER_FREIGHT', 'Container Freight (CONCOR / DFC)'
    BULK_FREIGHT = 'BULK_FREIGHT', 'Bulk Freight (Coal / Minerals / BOXN)'


class TractionType(models.TextChoices):
    ELECTRIC = 'ELECTRIC', 'Electric (25kV AC OHE)'
    DIESEL = 'DIESEL', 'Diesel'
    DUAL = 'DUAL', 'Dual Mode / Hybrid'


class TrainLiveRunStatus(models.TextChoices):
    ON_TIME = 'ON_TIME', 'On Time'
    RUNNING = 'RUNNING', 'Running'
    DELAYED = 'DELAYED', 'Delayed'
    DIVERTED = 'DIVERTED', 'Diverted'
    REGULATED = 'REGULATED', 'Regulated'
    CANCELLED = 'CANCELLED', 'Cancelled'
    ARRIVED = 'ARRIVED', 'Arrived'


class Train(models.Model):
    """
    Master Train Catalog (SVC-TRN).
    Authoritative reference: docs/03-service-blueprints/05-trains.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    train_number = models.CharField(max_length=10, unique=True, db_index=True)
    train_name = models.CharField(max_length=150)
    train_type = models.CharField(
        max_length=30,
        choices=TrainType.choices,
        default=TrainType.PASSENGER_EXPRESS,
        db_index=True
    )
    priority_rank = models.PositiveIntegerField(
        default=100,
        help_text="Lower number indicates higher traffic priority (e.g. Rajdhani=1, Shatabdi=2, Freight=50)",
        db_index=True
    )
    source_station = models.CharField(max_length=10, default="NDLS")
    destination_station = models.CharField(max_length=10, default="CNB")
    is_daily = models.BooleanField(default=True)
    operating_days_mask = models.CharField(
        max_length=7,
        default="1111111",
        help_text="7-digit binary mask for Mon-Sun (1=Runs, 0=Does not run)"
    )
    traction_type = models.CharField(
        max_length=20,
        choices=TractionType.choices,
        default=TractionType.ELECTRIC
    )
    max_speed_kmh = models.PositiveIntegerField(default=130)
    length_meters = models.DecimalField(max_digits=7, decimal_places=2, default=650.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['priority_rank', 'train_number']
        indexes = [
            models.Index(fields=['train_type', 'priority_rank'], name='idx_trn_type_priority'),
        ]

    def __str__(self):
        return f"{self.train_number} - {self.train_name} ({self.get_train_type_display()})"

    @property
    def is_prestige(self) -> bool:
        return self.train_type == TrainType.PRESTIGE_SUPERFAST

    @property
    def is_freight(self) -> bool:
        return self.train_type in (TrainType.CONTAINER_FREIGHT, TrainType.BULK_FREIGHT)

    @property
    def current_live_status(self):
        """Returns most recent live status record if available."""
        return self.live_status_records.order_by('-journey_date', '-last_reported_at').first()


class TrainSchedule(models.Model):
    """
    Scheduled Station Stoppages & Timetables along corridors.
    Authoritative reference: docs/03-service-blueprints/05-trains.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    train = models.ForeignKey(Train, on_delete=models.CASCADE, related_name='schedules')
    station_code = models.CharField(max_length=10, db_index=True)
    station_sequence = models.PositiveIntegerField()
    scheduled_arrival_time = models.TimeField(null=True, blank=True)
    scheduled_departure_time = models.TimeField()
    platform_number = models.CharField(max_length=5, null=True, blank=True)
    corridor_section_id = models.CharField(max_length=36, null=True, blank=True)
    km_milestone = models.DecimalField(max_digits=8, decimal_places=3, default=0.0)

    class Meta:
        ordering = ['train', 'station_sequence']
        unique_together = ('train', 'station_sequence')
        indexes = [
            models.Index(fields=['station_code'], name='idx_schedules_station'),
        ]

    def __str__(self):
        return f"{self.train.train_number} @ {self.station_code} (Seq {self.station_sequence})"


class TrainLiveStatus(models.Model):
    """
    Real-Time Live Running Status & Dynamic Delay Tracking.
    Authoritative reference: docs/03-service-blueprints/05-trains.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    train = models.ForeignKey(Train, on_delete=models.CASCADE, related_name='live_status_records')
    journey_date = models.DateField(db_index=True)
    current_station_code = models.CharField(max_length=10, db_index=True)
    current_km = models.DecimalField(max_digits=8, decimal_places=3, default=0.0)
    delay_minutes = models.IntegerField(default=0, help_text="Negative means early, 0 means on time, >0 means delayed")
    speed_kmh = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(
        max_length=20,
        choices=TrainLiveRunStatus.choices,
        default=TrainLiveRunStatus.RUNNING
    )
    active_caution_orders = models.JSONField(default=list, blank=True)
    last_reported_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-journey_date', 'delay_minutes']
        unique_together = ('train', 'journey_date')
        indexes = [
            models.Index(fields=['current_station_code', 'delay_minutes'], name='idx_live_stn_delay'),
        ]

    def __str__(self):
        return f"{self.train.train_number} ({self.journey_date}): {self.status} +{self.delay_minutes}m @ {self.current_station_code}"

    @property
    def is_punctual(self) -> bool:
        return self.delay_minutes <= 5


# Auxiliary Models for Passenger Information & Platform Allocations
class CoachComposition(models.Model):
    train = models.ForeignKey(Train, on_delete=models.CASCADE, related_name='coaches')
    coach_number = models.CharField(max_length=10)
    coach_type = models.CharField(max_length=50, default="Sleeper")
    capacity = models.PositiveIntegerField(default=72)
    current_occupancy = models.PositiveIntegerField(default=50)
    ac_working = models.BooleanField(default=True)
    cleanliness_score = models.FloatField(default=4.5, validators=[MinValueValidator(1.0), MaxValueValidator(5.0)])

    class Meta:
        ordering = ['train', 'coach_number']

    def __str__(self):
        return f"{self.train.train_number} - Coach {self.coach_number} ({self.coach_type})"


class PlatformAllocation(models.Model):
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='platform_allocations')
    platform_number = models.PositiveIntegerField()
    train = models.ForeignKey(Train, on_delete=models.CASCADE)
    expected_arrival = models.DateTimeField()
    expected_departure = models.DateTimeField()
    status = models.CharField(max_length=30, default="Approaching")
    assigned_by = models.CharField(max_length=100, default="AI Automated Dispatch")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['expected_arrival']

    def __str__(self):
        return f"{self.station.code} Pf #{self.platform_number} -> {self.train.train_number}"
