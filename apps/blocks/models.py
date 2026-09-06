import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.accounts.models import DepartmentCode


class BlockStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft Proposal'
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Submitted to COA'
    COORDINATED = 'COORDINATED', 'Shadow-Block Coordinated'
    CONFLICT_DETECTED = 'CONFLICT_DETECTED', 'Spatial/Temporal Conflict'
    SANCTIONED = 'SANCTIONED', 'Sanctioned by Chief Controller'
    ACTIVE = 'ACTIVE', 'Possession Live / Caution In Effect'
    COMPLETED = 'COMPLETED', 'Cleared & Safety Handback'
    CANCELLED = 'CANCELLED', 'Cancelled by Department'
    REJECTED = 'REJECTED', 'Rejected by COA'


class LineType(models.TextChoices):
    UP = 'UP', 'Up Main Line (e.g. Towards NDLS)'
    DOWN = 'DOWN', 'Down Main Line (e.g. Towards GZB/CNB)'
    BIDIRECTIONAL = 'BIDIRECTIONAL', 'Bi-directional Single Track'
    LOOP_1 = 'LOOP_1', 'Loop Line 1 / Platform Line'
    LOOP_2 = 'LOOP_2', 'Loop Line 2'
    YARD = 'YARD', 'Marshalling Yard / Sidings'


class WorkType(models.TextChoices):
    TRACK_TAMPING = 'TRACK_TAMPING', 'Track Tamping (CSM Machine)'
    BALLAST_CLEANING = 'BALLAST_CLEANING', 'Ballast Deep Screening (BCM)'
    RAIL_RENEWAL = 'RAIL_RENEWAL', 'Through Rail Renewal (TRR)'
    OHE_INSPECTION = 'OHE_INSPECTION', '25kV OHE Tower Wagon Inspection'
    CATENARY_MAINTENANCE = 'CATENARY_MAINTENANCE', 'Catenary & Contact Wire Adjustment'
    SIGNAL_INTERLOCKING_TEST = 'SIGNAL_INTERLOCKING_TEST', 'Electronic Interlocking Point Overhaul'
    TURNOUT_OVERHAUL = 'TURNOUT_OVERHAUL', 'Turnout & Switch Crossing Renewal'


class ConflictType(models.TextChoices):
    TRAIN_PATH_COLLISION = 'TRAIN_PATH_COLLISION', 'Train Timetable Collision'
    PARALLEL_BLOCK_COLLISION = 'PARALLEL_BLOCK_COLLISION', 'Parallel Block Possession Overlap'
    OHE_POWER_CONCURRENT_LOCK = 'OHE_POWER_CONCURRENT_LOCK', 'Conflicting OHE Power Cut Zone'
    SAFETY_MARGIN_VIOLATION = 'SAFETY_MARGIN_VIOLATION', 'Headway / Safety Buffer Violation'


class ConflictSeverity(models.TextChoices):
    CRITICAL = 'CRITICAL', 'Critical Hazard / Prestige Train Interruption'
    HIGH = 'HIGH', 'High Priority Overlap'
    MEDIUM = 'MEDIUM', 'Medium Delay Potential'
    LOW = 'LOW', 'Low Operational Margin'


class Corridor(models.Model):
    """
    Railway track corridor geography and physical infrastructure.
    Authoritative reference: docs/03-service-blueprints/02-blocks.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    zone = models.CharField(max_length=10, default='NR')
    division = models.CharField(max_length=10, default='DLI')
    source_station = models.CharField(max_length=50, default='NDLS')
    destination_station = models.CharField(max_length=50, default='GZB')
    start_km = models.DecimalField(max_digits=8, decimal_places=3, default=0.000)
    end_km = models.DecimalField(max_digits=8, decimal_places=3, default=28.500)
    is_electrified = models.BooleanField(default=True)
    max_permissible_speed_kmh = models.PositiveIntegerField(default=130)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name} (KM {self.start_km} to {self.end_km})"

    @property
    def total_length_km(self):
        return float(self.end_km - self.start_km)


class Block(models.Model):
    """
    Maintenance Block Possession Request & Lifecycle State Machine (SVC-BLK).
    Authoritative reference: docs/03-service-blueprints/02-blocks.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    block_code = models.CharField(max_length=50, unique=True, db_index=True)
    corridor = models.ForeignKey(Corridor, on_delete=models.RESTRICT, related_name='blocks')
    line_type = models.CharField(max_length=20, choices=LineType.choices, default=LineType.DOWN)
    
    # Requesting Department & Metadata
    department_code = models.CharField(max_length=20, choices=DepartmentCode.choices, default=DepartmentCode.ENG, db_index=True)
    work_type = models.CharField(max_length=40, choices=WorkType.choices, default=WorkType.TRACK_TAMPING)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='requested_blocks')
    gang_id = models.CharField(max_length=50, blank=True, help_text="Designated maintenance gang code")
    equipment_required = models.CharField(max_length=150, blank=True)
    
    # Spatial Kilometer Span
    start_km = models.DecimalField(max_digits=8, decimal_places=3)
    end_km = models.DecimalField(max_digits=8, decimal_places=3)
    
    # Scheduled Temporal Window
    scheduled_start_time = models.DateTimeField(db_index=True)
    scheduled_end_time = models.DateTimeField(db_index=True)
    
    # Actual Execution Window
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    # Traction Power Cut
    traction_power_cutoff_required = models.BooleanField(default=False, help_text="Requires 25kV OHE de-energization")
    
    # Lifecycle Status & Sanction
    status = models.CharField(max_length=30, choices=BlockStatus.choices, default=BlockStatus.PENDING_APPROVAL, db_index=True)
    rejection_reason = models.TextField(blank=True, null=True)
    sanctioned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sanctioned_blocks')
    sanctioned_at = models.DateTimeField(null=True, blank=True)
    caution_order_id = models.CharField(max_length=50, blank=True, help_text="Official Caution Order ID (e.g. CO-2026-DLI-99)")
    track_fit_certified = models.BooleanField(default=False, help_text="Final physical safety sign-off before handback")
    
    # Coordinated Shadow-Block Pairing
    parent_block = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='shadow_blocks')
    is_shadow = models.BooleanField(default=False, db_index=True)
    
    # Optimistic Concurrency Locking (TSK-P2-006)
    version = models.PositiveIntegerField(default=1)
    
    work_description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-scheduled_start_time']
        indexes = [
            models.Index(fields=['corridor', 'scheduled_start_time', 'scheduled_end_time']),
            models.Index(fields=['status', 'department_code']),
        ]

    def __str__(self):
        return f"[{self.department_code}] {self.block_code} ({self.get_status_display()})"

    @property
    def duration_hours(self):
        delta = self.scheduled_end_time - self.scheduled_start_time
        return round(delta.total_seconds() / 3600.0, 2)

    @property
    def span_km(self):
        return float(abs(self.end_km - self.start_km))

    def can_transition_to(self, new_status):
        """State machine transition verification."""
        allowed_transitions = {
            BlockStatus.DRAFT: [BlockStatus.PENDING_APPROVAL, BlockStatus.CANCELLED],
            BlockStatus.PENDING_APPROVAL: [BlockStatus.COORDINATED, BlockStatus.CONFLICT_DETECTED, BlockStatus.SANCTIONED, BlockStatus.REJECTED, BlockStatus.CANCELLED],
            BlockStatus.COORDINATED: [BlockStatus.SANCTIONED, BlockStatus.REJECTED, BlockStatus.CANCELLED],
            BlockStatus.CONFLICT_DETECTED: [BlockStatus.PENDING_APPROVAL, BlockStatus.COORDINATED, BlockStatus.SANCTIONED, BlockStatus.REJECTED, BlockStatus.CANCELLED],
            BlockStatus.SANCTIONED: [BlockStatus.ACTIVE, BlockStatus.CANCELLED],
            BlockStatus.ACTIVE: [BlockStatus.COMPLETED],
            BlockStatus.COMPLETED: [],
            BlockStatus.CANCELLED: [],
            BlockStatus.REJECTED: [],
        }
        return new_status in allowed_transitions.get(self.status, [])


class BlockConflict(models.Model):
    """
    Persisted record of spatial/temporal overlaps identified by the sweep-line algorithm.
    Authoritative reference: docs/03-service-blueprints/02-blocks.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name='conflicts')
    conflict_type = models.CharField(max_length=40, choices=ConflictType.choices, default=ConflictType.PARALLEL_BLOCK_COLLISION)
    severity = models.CharField(max_length=20, choices=ConflictSeverity.choices, default=ConflictSeverity.HIGH, db_index=True)
    
    # Conflicting entity (another Block or Train Number)
    conflicting_entity_id = models.CharField(max_length=64, db_index=True)
    conflicting_entity_label = models.CharField(max_length=150, blank=True)
    
    # Overlap Spatial & Temporal Window
    overlap_start_km = models.DecimalField(max_digits=8, decimal_places=3)
    overlap_end_km = models.DecimalField(max_digits=8, decimal_places=3)
    conflict_start_time = models.DateTimeField()
    conflict_end_time = models.DateTimeField()
    
    # Resolution State
    resolution_status = models.CharField(
        max_length=30,
        choices=[
            ('UNRESOLVED', 'Unresolved Conflict'),
            ('AUTO_RESOLVED', 'Automated Resolution Proposed'),
            ('SHADOW_MERGED', 'Merged as Shadow Co-Possession'),
            ('MANUALLY_OVERRIDDEN', 'Controller Authorized Override'),
            ('DISMISSED', 'Dismissed / Inapplicable')
        ],
        default='UNRESOLVED',
        db_index=True
    )
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.conflict_type} on {self.block.block_code} (Entity: {self.conflicting_entity_id})"
