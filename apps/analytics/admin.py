from django.contrib import admin
from .models import CorridorDailyKPI


@admin.register(CorridorDailyKPI)
class CorridorDailyKPIAdmin(admin.ModelAdmin):
    list_display = ('date', 'corridor_code', 'total_blocks_granted', 'total_possession_hours', 'train_punctuality_pct')
    list_filter = ('corridor_code',)
