from django.db import models


class CorridorDailyKPI(models.Model):
    """
    Daily aggregated operational KPI records for OLAP reporting (SVC-ANA).
    """
    date = models.DateField(db_index=True)
    corridor_code = models.CharField(max_length=50, db_index=True)
    total_blocks_requested = models.PositiveIntegerField(default=0)
    total_blocks_granted = models.PositiveIntegerField(default=0)
    total_possession_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    shadow_blocks_count = models.PositiveIntegerField(default=0)
    train_punctuality_pct = models.DecimalField(max_digits=5, decimal_places=2, default=94.5)
    conflict_mitigation_rate_pct = models.DecimalField(max_digits=5, decimal_places=2, default=88.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('date', 'corridor_code')

    def __str__(self):
        return f"{self.date} - {self.corridor_code} (Punctuality: {self.train_punctuality_pct}%)"
