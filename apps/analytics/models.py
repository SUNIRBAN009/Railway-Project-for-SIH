"""
Operational Analytics and KPI Intelligence Models (SVC-ANA / TSK-P4-001).
Authoritative reference: docs/03-service-blueprints/07-analytics.md
"""
import uuid
from django.db import models


class CorridorDailyKPI(models.Model):
    """
    Daily Division & Corridor Aggregated KPI Mart (SVC-ANA).
    Maintains historical performance metrics for punctuality, possession utilization,
    and multi-department co-possession savings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_date = models.DateField(db_index=True)
    division_code = models.CharField(max_length=10, default='DLI', db_index=True)
    corridor_code = models.CharField(max_length=50, db_index=True)

    total_blocks_requested = models.PositiveIntegerField(default=0)
    total_blocks_sanctioned = models.PositiveIntegerField(default=0)
    total_blocks_executed = models.PositiveIntegerField(default=0)

    total_sanctioned_duration_minutes = models.PositiveIntegerField(default=0)
    total_actual_duration_minutes = models.PositiveIntegerField(default=0)
    total_possession_hours = models.DecimalField(max_digits=7, decimal_places=2, default=0.0)

    co_possession_blocks_count = models.PositiveIntegerField(
        default=0,
        help_text="Blocks where 2 or more departments worked simultaneously"
    )
    total_train_delay_minutes_incurred = models.PositiveIntegerField(default=0)
    corridor_punctuality_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    conflict_mitigation_rate_pct = models.DecimalField(max_digits=5, decimal_places=2, default=88.00)
    shadow_blocks_count = models.PositiveIntegerField(default=0)

    computed_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Aliases for backwards compatibility with earlier prototypes
    @property
    def date(self):
        return self.metric_date

    @date.setter
    def date(self, val):
        self.metric_date = val

    @property
    def total_blocks_granted(self):
        return self.total_blocks_sanctioned

    @total_blocks_granted.setter
    def total_blocks_granted(self, val):
        self.total_blocks_sanctioned = val

    @property
    def train_punctuality_pct(self):
        return self.corridor_punctuality_percentage

    @train_punctuality_pct.setter
    def train_punctuality_pct(self, val):
        self.corridor_punctuality_percentage = val

    class Meta:
        db_table = 'corridor_daily_kpis'
        ordering = ['-metric_date', 'corridor_code']
        unique_together = ('metric_date', 'division_code', 'corridor_code')
        indexes = [
            models.Index(fields=['metric_date', 'division_code', 'corridor_code']),
            models.Index(fields=['corridor_code', 'metric_date']),
        ]

    def __str__(self):
        return f"{self.metric_date} [{self.division_code}-{self.corridor_code}] Punctuality: {self.corridor_punctuality_percentage}%"


class BlockEfficiencyRecord(models.Model):
    """
    Granular Block Utilization & Work Order Productivity Ledger (SVC-ANA).
    Captures duration variance, burst overtime, and train delay attribution.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    block_id = models.CharField(max_length=64, db_index=True)
    corridor_code = models.CharField(max_length=50, default='NDLS-CNB', db_index=True)

    planned_hours = models.DecimalField(max_digits=5, decimal_places=2)
    actual_hours = models.DecimalField(max_digits=5, decimal_places=2)
    burst_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Duration exceeded beyond sanctioned window"
    )
    gang_utilization_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00,
        help_text="Productivity output per worker hour (%)"
    )
    trains_delayed_count = models.PositiveIntegerField(default=0)
    total_delay_minutes = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'block_efficiency_records'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['block_id']),
            models.Index(fields=['corridor_code', 'created_at']),
        ]

    def __str__(self):
        return f"Block {self.block_id} | Planned: {self.planned_hours}h | Actual: {self.actual_hours}h | Burst: {self.burst_hours}h"
