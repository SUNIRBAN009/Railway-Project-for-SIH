import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.accounts.models import DepartmentCode


class Department(models.Model):
    """
    Railway Departmental Division (SVC-DEPT).
    Authoritative reference: docs/03-service-blueprints/03-departments.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=10, unique=True, choices=DepartmentCode.choices, db_index=True)
    name = models.CharField(max_length=100)
    headquarters_division = models.CharField(max_length=10, default='DLI')
    contact_email = models.EmailField(max_length=255)
    escalation_phone = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class Gang(models.Model):
    """
    Maintenance Gang Unit / Field Crew (TSK-P2-015).
    Authoritative reference: docs/03-service-blueprints/03-departments.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gang_number = models.CharField(max_length=30, unique=True, db_index=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='gangs')
    supervisor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervised_gangs'
    )
    headquarters_station = models.CharField(max_length=10, default='NDLS', db_index=True)
    crew_strength = models.PositiveIntegerField(default=12)
    assigned_section_start_km = models.DecimalField(max_digits=8, decimal_places=3, default=0.0)
    assigned_section_end_km = models.DecimalField(max_digits=8, decimal_places=3, default=50.0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['department', 'gang_number']
        indexes = [
            models.Index(fields=['department', 'headquarters_station'], name='idx_gang_dept_station'),
        ]

    def __str__(self):
        return f"[{self.department.code}] {self.gang_number} ({self.headquarters_station})"

    def is_available_for_window(self, start_time, end_time) -> bool:
        """
        Checks if gang has no overlapping active/mobilizing work order during a time window.
        """
        if not self.is_active:
            return False
        overlapping_orders = self.work_orders.filter(
            status__in=[
                WorkOrderStatus.PENDING,
                WorkOrderStatus.MOBILIZING,
                WorkOrderStatus.ON_SITE,
            ],
            block__scheduled_start_time__lt=end_time,
            block__scheduled_end_time__gt=start_time,
        )
        return not overlapping_orders.exists()


class EquipmentType(models.TextChoices):
    TRACK_TAMPER_CSM = 'TRACK_TAMPER_CSM', 'Continuous Action Tamper (09-32 CSM)'
    BALLAST_CLEANER_BCM = 'BALLAST_CLEANER_BCM', 'Ballast Cleaning Machine (RM-80 BCM)'
    DYNAMIC_TRACK_STABILIZER = 'DYNAMIC_TRACK_STABILIZER', 'Dynamic Track Stabilizer (DGS 62N)'
    OHE_TOWER_WAGON = 'OHE_TOWER_WAGON', '8-Wheeler OHE Inspection Tower Car'
    RAIL_GRINDING_TRAIN = 'RAIL_GRINDING_TRAIN', 'Rail Grinding Machine (RGM 96 Stone)'
    USFD_TROLLEY = 'USFD_TROLLEY', 'Ultrasonic Flaw Detector Trolley'


class EquipmentStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    ASSIGNED = 'ASSIGNED', 'Assigned to Block'
    MAINTENANCE_DUE = 'MAINTENANCE_DUE', 'Scheduled Maintenance Due'
    BREAKDOWN = 'BREAKDOWN', 'Breakdown / Out of Order'


class MaintenanceEquipment(models.Model):
    """
    Heavy Railway Machinery & Special Equipment (TSK-P2-016).
    Authoritative reference: docs/03-service-blueprints/03-departments.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment_code = models.CharField(max_length=50, unique=True, db_index=True)
    equipment_name = models.CharField(max_length=100)
    equipment_type = models.CharField(
        max_length=50,
        choices=EquipmentType.choices,
        default=EquipmentType.TRACK_TAMPER_CSM,
        db_index=True
    )
    department = models.ForeignKey(Department, on_delete=models.RESTRICT, related_name='equipment')
    home_depot = models.CharField(max_length=20, default='GZB')
    current_location_km = models.DecimalField(max_digits=8, decimal_places=3, default=0.0)
    operational_status = models.CharField(
        max_length=30,
        choices=EquipmentStatus.choices,
        default=EquipmentStatus.AVAILABLE,
        db_index=True
    )
    fitness_expiry_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['department', 'equipment_type', 'equipment_code']
        indexes = [
            models.Index(fields=['equipment_type', 'operational_status'], name='idx_eq_type_status'),
        ]

    def __str__(self):
        return f"{self.equipment_code} - {self.equipment_name} ({self.operational_status})"

    @property
    def is_fit(self) -> bool:
        """Machine is mechanically certified and available."""
        today = timezone.now().date()
        return (
            self.fitness_expiry_date >= today and
            self.operational_status == EquipmentStatus.AVAILABLE
        )

    @property
    def is_fitness_expired(self) -> bool:
        return self.fitness_expiry_date < timezone.now().date()


class WorkOrderStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Mobilization'
    MOBILIZING = 'MOBILIZING', 'Crew & Machinery Mobilizing'
    ON_SITE = 'ON_SITE', 'On Site / Working'
    WORK_COMPLETED = 'WORK_COMPLETED', 'Work Completed'
    SAFETY_CLEARANCE_SIGNED = 'SAFETY_CLEARANCE_SIGNED', 'Safety Clearance Signed'


class WorkOrder(models.Model):
    """
    Departmental Work Order linked to Sanctioned Block (TSK-P2-017).
    Authoritative reference: docs/03-service-blueprints/03-departments.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=40, unique=True, db_index=True)
    block = models.ForeignKey(
        'blocks.Block',
        on_delete=models.CASCADE,
        related_name='work_orders'
    )
    department = models.ForeignKey(Department, on_delete=models.RESTRICT, related_name='work_orders')
    gang = models.ForeignKey(Gang, on_delete=models.RESTRICT, related_name='work_orders')
    equipment = models.ForeignKey(
        MaintenanceEquipment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_orders'
    )
    planned_work_scope = models.TextField()
    target_metric_units = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="e.g. 1500 meters of track tamped"
    )
    actual_metric_units = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    status = models.CharField(
        max_length=30,
        choices=WorkOrderStatus.choices,
        default=WorkOrderStatus.PENDING,
        db_index=True
    )
    ballast_profile_verified = models.BooleanField(default=False)
    track_gauge_checked = models.BooleanField(default=False)
    safety_certified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='certified_work_orders'
    )
    safety_clearance_timestamp = models.DateTimeField(null=True, blank=True)
    safety_remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['gang', 'status'], name='idx_wo_gang_status'),
        ]

    def __str__(self):
        return f"{self.order_number} ({self.get_status_display()})"
