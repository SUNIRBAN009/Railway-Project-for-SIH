import logging
import datetime
from decimal import Decimal
from django.utils import timezone
from celery import shared_task
from apps.trains.models import (
    Train,
    TrainSchedule,
    TrainLiveStatus,
    TrainType,
    TractionType,
    TrainLiveRunStatus,
)

logger = logging.getLogger(__name__)


# High Density Master Feed for Delhi - Kanpur Corridor (NDLS - GZB - ALJN - TDL - CNB)
DEFAULT_COA_CORRIDOR_FEED = [
    {
        'train_number': '22436',
        'train_name': 'New Delhi - Varanasi Vande Bharat Express',
        'train_type': TrainType.PRESTIGE_SUPERFAST,
        'priority_rank': 1,
        'source_station': 'NDLS',
        'destination_station': 'BSB',
        'traction_type': TractionType.ELECTRIC,
        'max_speed_kmh': 160,
        'length_meters': 420.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': None, 'dep': '06:00:00', 'pf': '16', 'km': 0.0},
            {'station_code': 'GZB',  'seq': 2, 'arr': '06:28:00', 'dep': '06:30:00', 'pf': '2', 'km': 28.5},
            {'station_code': 'ALJN', 'seq': 3, 'arr': '07:30:00', 'dep': '07:32:00', 'pf': '3', 'km': 126.0},
            {'station_code': 'CNB',  'seq': 4, 'arr': '10:08:00', 'dep': '10:10:00', 'pf': '1', 'km': 435.0},
        ],
        'live': {'station_code': 'GZB', 'km': 28.5, 'delay': 0, 'speed': 130.0, 'status': TrainLiveRunStatus.ON_TIME}
    },
    {
        'train_number': '12424',
        'train_name': 'Dibrugarh Rajdhani Express',
        'train_type': TrainType.PRESTIGE_SUPERFAST,
        'priority_rank': 2,
        'source_station': 'NDLS',
        'destination_station': 'DBRG',
        'traction_type': TractionType.ELECTRIC,
        'max_speed_kmh': 140,
        'length_meters': 650.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': None, 'dep': '16:20:00', 'pf': '12', 'km': 0.0},
            {'station_code': 'GZB',  'seq': 2, 'arr': '16:50:00', 'dep': '16:52:00', 'pf': '3', 'km': 28.5},
            {'station_code': 'CNB',  'seq': 3, 'arr': '21:02:00', 'dep': '21:07:00', 'pf': '1', 'km': 435.0},
        ],
        'live': {'station_code': 'NDLS', 'km': 4.2, 'delay': 8, 'speed': 65.0, 'status': TrainLiveRunStatus.RUNNING}
    },
    {
        'train_number': '12004',
        'train_name': 'Lucknow Swarna Shatabdi Express',
        'train_type': TrainType.PRESTIGE_SUPERFAST,
        'priority_rank': 3,
        'source_station': 'NDLS',
        'destination_station': 'LKO',
        'traction_type': TractionType.ELECTRIC,
        'max_speed_kmh': 140,
        'length_meters': 580.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': None, 'dep': '06:10:00', 'pf': '9', 'km': 0.0},
            {'station_code': 'GZB',  'seq': 2, 'arr': '06:45:00', 'dep': '06:47:00', 'pf': '1', 'km': 28.5},
            {'station_code': 'ALJN', 'seq': 3, 'arr': '07:47:00', 'dep': '07:49:00', 'pf': '2', 'km': 126.0},
            {'station_code': 'TDL',  'seq': 4, 'arr': '08:49:00', 'dep': '08:51:00', 'pf': '3', 'km': 206.0},
            {'station_code': 'CNB',  'seq': 5, 'arr': '11:20:00', 'dep': '11:25:00', 'pf': '2', 'km': 435.0},
        ],
        'live': {'station_code': 'ALJN', 'km': 126.0, 'delay': 0, 'speed': 120.0, 'status': TrainLiveRunStatus.ON_TIME}
    },
    {
        'train_number': '14218',
        'train_name': 'Unchahar Express',
        'train_type': TrainType.PASSENGER_EXPRESS,
        'priority_rank': 15,
        'source_station': 'CDG',
        'destination_station': 'PYGS',
        'traction_type': TractionType.ELECTRIC,
        'max_speed_kmh': 110,
        'length_meters': 620.00,
        'schedules': [
            {'station_code': 'GZB',  'seq': 1, 'arr': '21:10:00', 'dep': '21:12:00', 'pf': '4', 'km': 28.5},
            {'station_code': 'ALJN', 'seq': 2, 'arr': '22:48:00', 'dep': '22:50:00', 'pf': '4', 'km': 126.0},
            {'station_code': 'CNB',  'seq': 3, 'arr': '05:30:00', 'dep': '05:35:00', 'pf': '5', 'km': 435.0},
        ],
        'live': {'station_code': 'ALJN', 'km': 110.5, 'delay': 24, 'speed': 45.0, 'status': TrainLiveRunStatus.DELAYED}
    },
    {
        'train_number': 'BOXN-881',
        'train_name': 'Coal Rake Freight (Tughlakabad - Dadri Yard)',
        'train_type': TrainType.BULK_FREIGHT,
        'priority_rank': 60,
        'source_station': 'TKD',
        'destination_station': 'DER',
        'traction_type': TractionType.ELECTRIC,
        'max_speed_kmh': 75,
        'length_meters': 712.00,
        'schedules': [
            {'station_code': 'TKD',  'seq': 1, 'arr': None, 'dep': '02:00:00', 'pf': 'G', 'km': 0.0},
            {'station_code': 'GZB',  'seq': 2, 'arr': '03:15:00', 'dep': '03:20:00', 'pf': 'G', 'km': 28.5},
            {'station_code': 'DER',  'seq': 3, 'arr': '04:10:00', 'dep': '04:15:00', 'pf': 'G', 'km': 45.0},
        ],
        'live': {'station_code': 'GZB', 'km': 32.0, 'delay': 40, 'speed': 30.0, 'status': TrainLiveRunStatus.REGULATED}
    },
    {
        'train_number': 'BCN-99',
        'train_name': 'CONCOR Double Stack Container Freight',
        'train_type': TrainType.CONTAINER_FREIGHT,
        'priority_rank': 50,
        'source_station': 'TKD',
        'destination_station': 'CNB',
        'traction_type': TractionType.ELECTRIC,
        'max_speed_kmh': 100,
        'length_meters': 750.00,
        'schedules': [
            {'station_code': 'TKD',  'seq': 1, 'arr': None, 'dep': '01:00:00', 'pf': 'G', 'km': 0.0},
            {'station_code': 'ALJN', 'seq': 2, 'arr': '04:30:00', 'dep': '04:35:00', 'pf': 'G', 'km': 126.0},
            {'station_code': 'CNB',  'seq': 3, 'arr': '10:45:00', 'dep': '11:00:00', 'pf': 'G', 'km': 435.0},
        ],
        'live': {'station_code': 'ALJN', 'km': 95.0, 'delay': 15, 'speed': 60.0, 'status': TrainLiveRunStatus.RUNNING}
    },
]


@shared_task(name='trains.tasks.ingest_coa_feed', queue='high')
def ingest_coa_feed(feed_data=None):
    """
    Ingest Control Office Application (COA) and FOIS Timetable Feeds (FUNC-TRN-003).
    Authoritative reference: docs/04-function-maps/05-trains-function-map.md
    """
    payload = feed_data or DEFAULT_COA_CORRIDOR_FEED
    today = timezone.now().date()

    trains_processed = 0
    schedules_created = 0
    live_positions_updated = 0

    for item in payload:
        train_num = item['train_number']
        train_obj, created = Train.objects.update_or_create(
            train_number=train_num,
            defaults={
                'train_name': item['train_name'],
                'train_type': item.get('train_type', TrainType.PASSENGER_EXPRESS),
                'priority_rank': item.get('priority_rank', 100),
                'source_station': item.get('source_station', 'NDLS'),
                'destination_station': item.get('destination_station', 'CNB'),
                'traction_type': item.get('traction_type', TractionType.ELECTRIC),
                'max_speed_kmh': item.get('max_speed_kmh', 130),
                'length_meters': Decimal(str(item.get('length_meters', 650.00))),
            }
        )
        trains_processed += 1

        # Ingest or update station stoppages
        for sched in item.get('schedules', []):
            TrainSchedule.objects.update_or_create(
                train=train_obj,
                station_sequence=sched['seq'],
                defaults={
                    'station_code': sched['station_code'],
                    'scheduled_arrival_time': sched.get('arr'),
                    'scheduled_departure_time': sched['dep'],
                    'platform_number': str(sched.get('pf', '1')),
                    'km_milestone': Decimal(str(sched.get('km', 0.0))),
                }
            )
            schedules_created += 1

        # Ingest real-time status record
        live = item.get('live')
        if live:
            TrainLiveStatus.objects.update_or_create(
                train=train_obj,
                journey_date=today,
                defaults={
                    'current_station_code': live.get('station_code', 'NDLS'),
                    'current_km': Decimal(str(live.get('km', 0.0))),
                    'delay_minutes': live.get('delay', 0),
                    'speed_kmh': Decimal(str(live.get('speed', 0.0))),
                    'status': live.get('status', TrainLiveRunStatus.RUNNING),
                }
            )
            live_positions_updated += 1

    summary = {
        'status': 'SUCCESS',
        'trains_processed': trains_processed,
        'schedules_created': schedules_created,
        'live_positions_updated': live_positions_updated,
        'timestamp': timezone.now().isoformat(),
    }
    logger.info(f"COA feed ingestion completed: {summary}")
    return summary
