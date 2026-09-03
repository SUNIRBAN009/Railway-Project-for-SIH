from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Station(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=10, unique=True)
    zone = models.CharField(max_length=50, default="NR")
    division = models.CharField(max_length=50, default="Delhi")
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    number_of_platforms = models.PositiveIntegerField(default=5)
    has_wifi = models.BooleanField(default=True)
    has_medical_booth = models.BooleanField(default=True)
    rpf_post_phone = models.CharField(max_length=20, default="182 / 139")

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.name} ({self.code})"

class TrainType(models.TextChoices):
    VANDE_BHARAT = 'VANDE_BHARAT', 'Vande Bharat Express'
    RAJDHANI = 'RAJDHANI', 'Rajdhani Express'
    SHATABDI = 'SHATABDI', 'Shatabdi Express'
    SUPERFAST = 'SUPERFAST', 'Superfast Express'
    EXPRESS = 'EXPRESS', 'Express / Mail'
    LOCAL = 'LOCAL', 'Suburban / Local'
    FREIGHT = 'FREIGHT', 'Freight Train'

class TrainStatus(models.TextChoices):
    ON_TIME = 'ON_TIME', 'On Time'
    DELAYED = 'DELAYED', 'Delayed'
    CANCELLED = 'CANCELLED', 'Cancelled'
    DIVERTED = 'DIVERTED', 'Diverted'
    ARRIVED = 'ARRIVED', 'Arrived'
    RUNNING = 'RUNNING', 'Running Live'

class Train(models.Model):
    train_number = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=150)
    train_type = models.CharField(max_length=30, choices=TrainType.choices, default=TrainType.SUPERFAST)
    source_station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='departing_trains')
    destination_station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='arriving_trains')
    runs_on = models.CharField(max_length=50, default="Daily", help_text="e.g. Daily or Mon, Wed, Fri")
    total_coaches = models.PositiveIntegerField(default=18)
    status = models.CharField(max_length=20, choices=TrainStatus.choices, default=TrainStatus.ON_TIME)
    delay_minutes = models.IntegerField(default=0, help_text="Delay in minutes (0 means on time)")
    current_station = models.ForeignKey(Station, on_delete=models.SET_NULL, null=True, blank=True, related_name='trains_currently_here')
    next_station = models.ForeignKey(Station, on_delete=models.SET_NULL, null=True, blank=True, related_name='trains_approaching')
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['train_number']

    def __str__(self):
        return f"{self.train_number} - {self.name}"

    @property
    def is_delayed(self):
        return self.delay_minutes > 5

class TrainSchedule(models.Model):
    train = models.ForeignKey(Train, on_delete=models.CASCADE, related_name='schedules')
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='scheduled_trains')
    stop_number = models.PositiveIntegerField()
    arrival_time = models.TimeField(null=True, blank=True)
    departure_time = models.TimeField(null=True, blank=True)
    halt_minutes = models.PositiveIntegerField(default=2)
    distance_km = models.PositiveIntegerField(default=0)
    day_number = models.PositiveIntegerField(default=1)
    platform_number = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['train', 'stop_number']
        unique_together = ('train', 'stop_number')

    def __str__(self):
        return f"{self.train.train_number} @ {self.station.code} (Stop #{self.stop_number})"

class CrowdLevel(models.TextChoices):
    LOW = 'LOW', 'Low (< 40%)'
    MODERATE = 'MODERATE', 'Moderate (40-75%)'
    HIGH = 'HIGH', 'High (75-95%)'
    OVERCROWDED = 'OVERCROWDED', 'Overcrowded (> 95%)'

class CoachComposition(models.Model):
    train = models.ForeignKey(Train, on_delete=models.CASCADE, related_name='coaches')
    coach_number = models.CharField(max_length=10, help_text="e.g. C1, B2, S4, DL1")
    coach_type = models.CharField(max_length=50, default="Sleeper", help_text="e.g. AC 3 Tier, Executive Chair, General")
    capacity = models.PositiveIntegerField(default=72)
    current_occupancy = models.PositiveIntegerField(default=50)
    crowd_level = models.CharField(max_length=20, choices=CrowdLevel.choices, default=CrowdLevel.MODERATE)
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
    status = models.CharField(max_length=30, default="Approaching", choices=[
        ('Approaching', 'Approaching'),
        ('Docked', 'Docked / Boarding'),
        ('Departed', 'Departed'),
        ('Delayed', 'Delayed'),
    ])
    assigned_by = models.CharField(max_length=100, default="AI Automated Dispatch")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['expected_arrival']

    def __str__(self):
        return f"{self.station.code} Pf #{self.platform_number} -> {self.train.train_number}"
