from apps.analytics.services.kpi_aggregation_service import KPIAggregationService
from apps.analytics.models import CorridorDailyKPI
from apps.blocks.models import Block, BlockStatus
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q, Sum

end_date = timezone.localdate()
start_date = end_date - timedelta(days=6)
corridor_code = 'NDLS-CNB-MAIN'

all_period_blocks = Block.objects.filter(
    corridor__code=corridor_code if corridor_code and corridor_code != 'ALL' else 'NDLS-CNB',
    scheduled_start_time__date__gte=start_date,
    scheduled_start_time__date__lte=end_date
)
corridor_filter = ['NDLS-CNB', 'NDLS-CNB-MAIN'] if corridor_code in ('NDLS-CNB', 'NDLS-CNB-MAIN') else [corridor_code]
all_comb = Block.objects.filter(
    corridor__code__in=corridor_filter,
    scheduled_start_time__date__gte=start_date,
    scheduled_start_time__date__lte=end_date
)
print('all_comb count:', all_comb.count())
bundled_comb = all_comb.filter(
    Q(is_shadow=True) | Q(parent_block__isnull=False) | Q(shadow_blocks__isnull=False)
).distinct().count()
print('bundled_comb count:', bundled_comb)
print('ratio:', round((bundled_comb / all_comb.count()) * 100.0, 2))

# What corridors exist for these blocks?
print('corridors in blocks table:', list(Block.objects.values('corridor__code').distinct()))

qs = CorridorDailyKPI.objects.filter(corridor_code=corridor_code, metric_date__gte=start_date, metric_date__lte=end_date)
print('qs count:', qs.count())
total_requested = qs.aggregate(s=Sum('total_blocks_requested'))['s'] or 0
total_shadows = qs.aggregate(s=Sum('shadow_blocks_count'))['s'] or 0
print('total_requested:', total_requested, 'total_shadows:', total_shadows)
for r in qs:
    print('  date:', r.metric_date, 'shadow_blocks_count:', r.shadow_blocks_count, 'shadow_bundling_ratio_pct:', r.shadow_bundling_ratio_pct)
