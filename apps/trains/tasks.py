import logging
import datetime
import os
import json
from decimal import Decimal
from django.utils import timezone
from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.trains.models import (
    Train,
    TrainSchedule,
    TrainLiveStatus,
    TrainType,
    TractionType,
    TrainLiveRunStatus,
    Station,
)

logger = logging.getLogger(__name__)

# Primary Corridor Geodetic Station Waypoints (NDLS - CNB Golden Corridor)
CORRIDOR_WAYPOINTS = [
    {'code': 'NDLS', 'name': 'New Delhi', 'km': 0.000, 'lat': 28.6429, 'lon': 77.2191},
    {'code': 'GZB',  'name': 'Ghaziabad Junction', 'km': 24.500, 'lat': 28.6538, 'lon': 77.4262},
    {'code': 'ALJN', 'name': 'Aligarh Junction', 'km': 126.100, 'lat': 27.8937, 'lon': 78.0772},
    {'code': 'TDL',  'name': 'Tundla Junction', 'km': 204.300, 'lat': 27.2043, 'lon': 78.2393},
    {'code': 'ETW',  'name': 'Etawah Junction', 'km': 296.800, 'lat': 26.7865, 'lon': 79.0182},
    {'code': 'CNB',  'name': 'Kanpur Central', 'km': 440.200, 'lat': 26.4525, 'lon': 80.3475},
]

def calculate_train_spatial_position(current_km: float, direction: str = 'DOWN'):
    """
    Interpolates WGS-84 coordinates, heading angle, and current track section
    for a train located at current_km along the NDLS-CNB trunk corridor.
    """
    km = max(0.0, min(440.2, float(current_km)))

    # Find segment [W_a, W_b]
    w_a = CORRIDOR_WAYPOINTS[0]
    w_b = CORRIDOR_WAYPOINTS[-1]

    for i in range(len(CORRIDOR_WAYPOINTS) - 1):
        if CORRIDOR_WAYPOINTS[i]['km'] <= km <= CORRIDOR_WAYPOINTS[i + 1]['km']:
            w_a = CORRIDOR_WAYPOINTS[i]
            w_b = CORRIDOR_WAYPOINTS[i + 1]
            break

    span = w_b['km'] - w_a['km']
    t = (km - w_a['km']) / span if span > 0 else 0.0

    # Parallel track lateral offset: DOWN line +0.0004 deg, UP line -0.0004 deg
    lat_offset = 0.0004 if direction == 'DOWN' else -0.0004
    lon_offset = 0.0004 if direction == 'DOWN' else -0.0004

    lat = round(w_a['lat'] + t * (w_b['lat'] - w_a['lat']) + lat_offset, 6)
    lon = round(w_a['lon'] + t * (w_b['lon'] - w_a['lon']) + lon_offset, 6)

    # Heading: DOWN (NDLS -> CNB) is ~122 degrees (SE); UP is ~302 degrees (NW)
    heading = 122.0 if direction == 'DOWN' else 302.0

    current_section = f"{w_a['code']} – {w_b['code']} ({direction} Line)"
    current_station = w_a['code'] if t < 0.5 else w_b['code']

    return {
        'latitude': lat,
        'longitude': lon,
        'heading': heading,
        'current_section': current_section,
        'current_station_code': current_station,
    }


# Canonical Master 12 Trains for Golden Corridor (NDLS - CNB)
MASTER_12_TRAINS_CORRIDOR_FEED = [
    {
        'train_number': '12301',
        'train_name': 'Howrah - New Delhi Rajdhani Express',
        'train_type': TrainType.PRESTIGE_SUPERFAST,
        'priority_rank': 1,
        'source_station': 'CNB',
        'destination_station': 'NDLS',
        'direction': 'UP',
        'pax_capacity': 1250,
        'max_speed_kmh': 130,
        'length_meters': 650.00,
        'schedules': [
            {'station_code': 'CNB',  'seq': 1, 'arr': '06:00:00', 'dep': '06:05:00', 'pf': '1', 'km': 440.2},
            {'station_code': 'ETW',  'seq': 2, 'arr': '07:15:00', 'dep': '07:16:00', 'pf': '1', 'km': 296.8},
            {'station_code': 'TDL',  'seq': 3, 'arr': '08:12:00', 'dep': '08:14:00', 'pf': '4', 'km': 204.3},
            {'station_code': 'ALJN', 'seq': 4, 'arr': '08:58:00', 'dep': '09:00:00', 'pf': '3', 'km': 126.1},
            {'station_code': 'GZB',  'seq': 5, 'arr': '09:42:00', 'dep': '09:44:00', 'pf': '2', 'km': 24.5},
            {'station_code': 'NDLS', 'seq': 6, 'arr': '10:05:00', 'dep': '10:05:00', 'pf': '14', 'km': 0.0},
        ],
        'live': {'km': 380.0, 'delay': 0, 'speed': 130.0, 'status': TrainLiveRunStatus.ON_TIME}
    },
    {
        'train_number': '12424',
        'train_name': 'New Delhi - Dibrugarh Rajdhani Express',
        'train_type': TrainType.PRESTIGE_SUPERFAST,
        'priority_rank': 1,
        'source_station': 'NDLS',
        'destination_station': 'CNB',
        'direction': 'DOWN',
        'pax_capacity': 1250,
        'max_speed_kmh': 140,
        'length_meters': 650.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': '16:20:00', 'dep': '16:20:00', 'pf': '16', 'km': 0.0},
            {'station_code': 'GZB',  'seq': 2, 'arr': '16:50:00', 'dep': '16:52:00', 'pf': '2', 'km': 24.5},
            {'station_code': 'ALJN', 'seq': 3, 'arr': '17:45:00', 'dep': '17:47:00', 'pf': '3', 'km': 126.1},
            {'station_code': 'TDL',  'seq': 4, 'arr': '18:35:00', 'dep': '18:37:00', 'pf': '3', 'km': 204.3},
            {'station_code': 'ETW',  'seq': 5, 'arr': '19:30:00', 'dep': '19:32:00', 'pf': '2', 'km': 296.8},
            {'station_code': 'CNB',  'seq': 6, 'arr': '21:02:00', 'dep': '21:07:00', 'pf': '1', 'km': 440.2},
        ],
        'live': {'km': 18.5, 'delay': 0, 'speed': 128.0, 'status': TrainLiveRunStatus.ON_TIME}
    },
    {
        'train_number': '12004',
        'train_name': 'New Delhi - Lucknow Swarna Shatabdi Express',
        'train_type': TrainType.PRESTIGE_SUPERFAST,
        'priority_rank': 2,
        'source_station': 'NDLS',
        'destination_station': 'CNB',
        'direction': 'DOWN',
        'pax_capacity': 980,
        'max_speed_kmh': 140,
        'length_meters': 580.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': '06:10:00', 'dep': '06:10:00', 'pf': '12', 'km': 0.0},
            {'station_code': 'GZB',  'seq': 2, 'arr': '06:50:00', 'dep': '06:52:00', 'pf': '2', 'km': 24.5},
            {'station_code': 'ALJN', 'seq': 3, 'arr': '07:50:00', 'dep': '07:52:00', 'pf': '3', 'km': 126.1},
            {'station_code': 'TDL',  'seq': 4, 'arr': '08:45:00', 'dep': '08:47:00', 'pf': '3', 'km': 204.3},
            {'station_code': 'ETW',  'seq': 5, 'arr': '09:40:00', 'dep': '09:42:00', 'pf': '2', 'km': 296.8},
            {'station_code': 'CNB',  'seq': 6, 'arr': '11:20:00', 'dep': '11:25:00', 'pf': '1', 'km': 440.2},
        ],
        'live': {'km': 145.0, 'delay': 4, 'speed': 110.0, 'status': TrainLiveRunStatus.ON_TIME}
    },
    {
        'train_number': '22436',
        'train_name': 'New Delhi - Varanasi Vande Bharat Express',
        'train_type': TrainType.PRESTIGE_SUPERFAST,
        'priority_rank': 1,
        'source_station': 'NDLS',
        'destination_station': 'CNB',
        'direction': 'DOWN',
        'pax_capacity': 1128,
        'max_speed_kmh': 160,
        'length_meters': 420.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': '06:00:00', 'dep': '06:00:00', 'pf': '16', 'km': 0.0},
            {'station_code': 'GZB',  'seq': 2, 'arr': '06:28:00', 'dep': '06:30:00', 'pf': '2', 'km': 24.5},
            {'station_code': 'ALJN', 'seq': 3, 'arr': '07:18:00', 'dep': '07:20:00', 'pf': '3', 'km': 126.1},
            {'station_code': 'TDL',  'seq': 4, 'arr': '08:00:00', 'dep': '08:02:00', 'pf': '3', 'km': 204.3},
            {'station_code': 'ETW',  'seq': 5, 'arr': '08:45:00', 'dep': '08:47:00', 'pf': '2', 'km': 296.8},
            {'station_code': 'CNB',  'seq': 6, 'arr': '10:08:00', 'dep': '10:10:00', 'pf': '1', 'km': 440.2},
        ],
        'live': {'km': 72.0, 'delay': 0, 'speed': 155.0, 'status': TrainLiveRunStatus.ON_TIME}
    },
    {
        'train_number': '12417',
        'train_name': 'Prayagraj Express',
        'train_type': TrainType.PASSENGER_EXPRESS,
        'priority_rank': 10,
        'source_station': 'CNB',
        'destination_station': 'NDLS',
        'direction': 'UP',
        'pax_capacity': 1500,
        'max_speed_kmh': 110,
        'length_meters': 650.00,
        'schedules': [
            {'station_code': 'CNB',  'seq': 1, 'arr': '00:25:00', 'dep': '00:30:00', 'pf': '2', 'km': 440.2},
            {'station_code': 'ETW',  'seq': 2, 'arr': '01:50:00', 'dep': '01:52:00', 'pf': '1', 'km': 296.8},
            {'station_code': 'TDL',  'seq': 3, 'arr': '03:05:00', 'dep': '03:07:00', 'pf': '4', 'km': 204.3},
            {'station_code': 'ALJN', 'seq': 4, 'arr': '04:15:00', 'dep': '04:17:00', 'pf': '3', 'km': 126.1},
            {'station_code': 'GZB',  'seq': 5, 'arr': '06:13:00', 'dep': '06:15:00', 'pf': '3', 'km': 24.5},
            {'station_code': 'NDLS', 'seq': 6, 'arr': '07:00:00', 'dep': '07:00:00', 'pf': '8', 'km': 0.0},
        ],
        'live': {'km': 250.0, 'delay': 5, 'speed': 105.0, 'status': TrainLiveRunStatus.ON_TIME}
    },
    {
        'train_number': '20801',
        'train_name': 'Magadh Express',
        'train_type': TrainType.PASSENGER_EXPRESS,
        'priority_rank': 12,
        'source_station': 'NDLS',
        'destination_station': 'CNB',
        'direction': 'DOWN',
        'pax_capacity': 1600,
        'max_speed_kmh': 110,
        'length_meters': 650.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': '20:00:00', 'dep': '20:00:00', 'pf': '14', 'km': 0.0},
            {'station_code': 'ALJN', 'seq': 2, 'arr': '21:50:00', 'dep': '21:52:00', 'pf': '3', 'km': 126.1},
            {'station_code': 'TDL',  'seq': 3, 'arr': '22:50:00', 'dep': '22:52:00', 'pf': '3', 'km': 204.3},
            {'station_code': 'ETW',  'seq': 4, 'arr': '23:55:00', 'dep': '23:57:00', 'pf': '2', 'km': 296.8},
            {'station_code': 'CNB',  'seq': 5, 'arr': '01:40:00', 'dep': '01:45:00', 'pf': '1', 'km': 440.2},
        ],
        'live': {'km': 8.0, 'delay': 12, 'speed': 85.0, 'status': TrainLiveRunStatus.DELAYED}
    },
    {
        'train_number': '12419',
        'train_name': 'Gomti Express',
        'train_type': TrainType.PASSENGER_EXPRESS,
        'priority_rank': 14,
        'source_station': 'CNB',
        'destination_station': 'NDLS',
        'direction': 'UP',
        'pax_capacity': 1400,
        'max_speed_kmh': 110,
        'length_meters': 620.00,
        'schedules': [
            {'station_code': 'CNB',  'seq': 1, 'arr': '07:45:00', 'dep': '07:45:00', 'pf': '3', 'km': 440.2},
            {'station_code': 'ETW',  'seq': 2, 'arr': '09:05:00', 'dep': '09:07:00', 'pf': '1', 'km': 296.8},
            {'station_code': 'TDL',  'seq': 3, 'arr': '10:15:00', 'dep': '10:17:00', 'pf': '4', 'km': 204.3},
            {'station_code': 'ALJN', 'seq': 4, 'arr': '11:15:00', 'dep': '11:17:00', 'pf': '3', 'km': 126.1},
            {'station_code': 'GZB',  'seq': 5, 'arr': '13:58:00', 'dep': '14:00:00', 'pf': '2', 'km': 24.5},
            {'station_code': 'NDLS', 'seq': 6, 'arr': '15:00:00', 'dep': '15:00:00', 'pf': '9', 'km': 0.0},
        ],
        'live': {'km': 180.0, 'delay': 0, 'speed': 100.0, 'status': TrainLiveRunStatus.ON_TIME}
    },
    {
        'train_number': '12397',
        'train_name': 'Mahabodhi Express',
        'train_type': TrainType.PASSENGER_EXPRESS,
        'priority_rank': 15,
        'source_station': 'NDLS',
        'destination_station': 'CNB',
        'direction': 'DOWN',
        'pax_capacity': 1550,
        'max_speed_kmh': 110,
        'length_meters': 650.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': '12:40:00', 'dep': '12:40:00', 'pf': '10', 'km': 0.0},
            {'station_code': 'ALJN', 'seq': 2, 'arr': '14:30:00', 'dep': '14:32:00', 'pf': '3', 'km': 126.1},
            {'station_code': 'TDL',  'seq': 3, 'arr': '15:40:00', 'dep': '15:42:00', 'pf': '3', 'km': 204.3},
            {'station_code': 'ETW',  'seq': 4, 'arr': '16:45:00', 'dep': '16:47:00', 'pf': '2', 'km': 296.8},
            {'station_code': 'CNB',  'seq': 5, 'arr': '18:05:00', 'dep': '18:10:00', 'pf': '2', 'km': 440.2},
        ],
        'live': {'km': 220.0, 'delay': 0, 'speed': 110.0, 'status': TrainLiveRunStatus.ON_TIME}
    },
    {
        'train_number': 'BOXN-998',
        'train_name': 'Coal Rake BCN Heavy Haul',
        'train_type': TrainType.BULK_FREIGHT,
        'priority_rank': 80,
        'source_station': 'CNB',
        'destination_station': 'NDLS',
        'direction': 'UP',
        'pax_capacity': 0,
        'max_speed_kmh': 75,
        'length_meters': 712.00,
        'schedules': [
            {'station_code': 'CNB',  'seq': 1, 'arr': '02:00:00', 'dep': '02:00:00', 'pf': 'YARD', 'km': 440.2},
            {'station_code': 'ETW',  'seq': 2, 'arr': '04:15:00', 'dep': '04:15:00', 'pf': 'LOOP', 'km': 296.8},
            {'station_code': 'TDL',  'seq': 3, 'arr': '06:30:00', 'dep': '06:30:00', 'pf': 'YARD', 'km': 204.3},
            {'station_code': 'ALJN', 'seq': 4, 'arr': '08:30:00', 'dep': '08:30:00', 'pf': 'LOOP', 'km': 126.1},
            {'station_code': 'GZB',  'seq': 5, 'arr': '10:45:00', 'dep': '10:45:00', 'pf': 'LOOP', 'km': 24.5},
            {'station_code': 'NDLS', 'seq': 6, 'arr': '12:00:00', 'dep': '12:00:00', 'pf': 'YARD', 'km': 0.0},
        ],
        'live': {'km': 28.5, 'delay': 35, 'speed': 0.0, 'status': TrainLiveRunStatus.REGULATED}
    },
    {
        'train_number': 'CONT-402',
        'train_name': 'CONCOR Container Export Express',
        'train_type': TrainType.CONTAINER_FREIGHT,
        'priority_rank': 75,
        'source_station': 'NDLS',
        'destination_station': 'CNB',
        'direction': 'DOWN',
        'pax_capacity': 0,
        'max_speed_kmh': 90,
        'length_meters': 750.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': '01:15:00', 'dep': '01:15:00', 'pf': 'YARD', 'km': 0.0},
            {'station_code': 'GZB',  'seq': 2, 'arr': '02:00:00', 'dep': '02:00:00', 'pf': 'LOOP', 'km': 24.5},
            {'station_code': 'ALJN', 'seq': 3, 'arr': '04:00:00', 'dep': '04:00:00', 'pf': 'LOOP', 'km': 126.1},
            {'station_code': 'TDL',  'seq': 4, 'arr': '05:45:00', 'dep': '05:45:00', 'pf': 'YARD', 'km': 204.3},
            {'station_code': 'ETW',  'seq': 5, 'arr': '07:30:00', 'dep': '07:30:00', 'pf': 'LOOP', 'km': 296.8},
            {'station_code': 'CNB',  'seq': 6, 'arr': '09:45:00', 'dep': '09:45:00', 'pf': 'YARD', 'km': 440.2},
        ],
        'live': {'km': 95.0, 'delay': 0, 'speed': 75.0, 'status': TrainLiveRunStatus.RUNNING}
    },
    {
        'train_number': 'POL-551',
        'train_name': 'IOCL Petroleum Tanker Special',
        'train_type': TrainType.BULK_FREIGHT,
        'priority_rank': 85,
        'source_station': 'CNB',
        'destination_station': 'NDLS',
        'direction': 'UP',
        'pax_capacity': 0,
        'max_speed_kmh': 70,
        'length_meters': 680.00,
        'schedules': [
            {'station_code': 'CNB',  'seq': 1, 'arr': '13:00:00', 'dep': '13:00:00', 'pf': 'YARD', 'km': 440.2},
            {'station_code': 'ETW',  'seq': 2, 'arr': '15:30:00', 'dep': '15:30:00', 'pf': 'LOOP', 'km': 296.8},
            {'station_code': 'TDL',  'seq': 3, 'arr': '18:00:00', 'dep': '18:00:00', 'pf': 'YARD', 'km': 204.3},
            {'station_code': 'ALJN', 'seq': 4, 'arr': '20:15:00', 'dep': '20:15:00', 'pf': 'LOOP', 'km': 126.1},
            {'station_code': 'GZB',  'seq': 5, 'arr': '22:45:00', 'dep': '22:45:00', 'pf': 'LOOP', 'km': 24.5},
            {'station_code': 'NDLS', 'seq': 6, 'arr': '00:30:00', 'dep': '00:30:00', 'pf': 'YARD', 'km': 0.0},
        ],
        'live': {'km': 126.1, 'delay': 20, 'speed': 0.0, 'status': TrainLiveRunStatus.REGULATED}
    },
    {
        'train_number': 'BCN-774',
        'train_name': 'Foodgrain & Cement Covered Rake',
        'train_type': TrainType.BULK_FREIGHT,
        'priority_rank': 82,
        'source_station': 'NDLS',
        'destination_station': 'CNB',
        'direction': 'DOWN',
        'pax_capacity': 0,
        'max_speed_kmh': 75,
        'length_meters': 720.00,
        'schedules': [
            {'station_code': 'NDLS', 'seq': 1, 'arr': '14:00:00', 'dep': '14:00:00', 'pf': 'YARD', 'km': 0.0},
            {'station_code': 'GZB',  'seq': 2, 'arr': '14:55:00', 'dep': '14:55:00', 'pf': 'LOOP', 'km': 24.5},
            {'station_code': 'ALJN', 'seq': 3, 'arr': '17:10:00', 'dep': '17:10:00', 'pf': 'LOOP', 'km': 126.1},
            {'station_code': 'TDL',  'seq': 4, 'arr': '19:20:00', 'dep': '19:20:00', 'pf': 'YARD', 'km': 204.3},
            {'station_code': 'ETW',  'seq': 5, 'arr': '21:30:00', 'dep': '21:30:00', 'pf': 'LOOP', 'km': 296.8},
            {'station_code': 'CNB',  'seq': 6, 'arr': '00:05:00', 'dep': '00:05:00', 'pf': 'YARD', 'km': 440.2},
        ],
        'live': {'km': 340.0, 'delay': 0, 'speed': 65.0, 'status': TrainLiveRunStatus.RUNNING}
    },
]


def load_coa_master_feed():
    """Attempts to load 12 master trains from json file or falls back to internal list."""
    json_path = os.path.join(os.path.dirname(__file__), '..', 'demo', 'master_data', 'trains.json')
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, list) and len(data) >= 12:
                formatted = []
                for item in data:
                    raw_type = item.get('type', 'EXPRESS')
                    if raw_type == 'PRESTIGE':
                        t_type = TrainType.PRESTIGE_SUPERFAST
                    elif raw_type == 'FREIGHT':
                        t_type = TrainType.CONTAINER_FREIGHT if 'CONT' in item.get('train_number', '') else TrainType.BULK_FREIGHT
                    else:
                        t_type = TrainType.PASSENGER_EXPRESS

                    # Match live data from fallback if not present
                    fallback = next((t for t in MASTER_12_TRAINS_CORRIDOR_FEED if t['train_number'] == item['train_number']), None)
                    live_data = fallback['live'] if fallback else {'km': 50.0, 'delay': 0, 'speed': 90.0, 'status': TrainLiveRunStatus.ON_TIME}

                    schedules = []
                    for idx, s in enumerate(item.get('schedule', []), 1):
                        schedules.append({
                            'station_code': s.get('station'),
                            'seq': s.get('station_sequence', idx),
                            'arr': s.get('arrival'),
                            'dep': s.get('departure'),
                            'pf': str(s.get('platform', '1')),
                            'km': float(s.get('km', 0.0)),
                        })

                    formatted.append({
                        'train_number': item.get('train_number'),
                        'train_name': item.get('train_name') or item.get('name'),
                        'train_type': t_type,
                        'priority_rank': item.get('priority_rank', 50),
                        'source_station': item.get('source', 'NDLS'),
                        'destination_station': item.get('destination', 'CNB'),
                        'direction': item.get('direction', 'DOWN'),
                        'pax_capacity': item.get('pax_capacity', 1200),
                        'max_speed_kmh': item.get('max_speed_kmph', 130),
                        'length_meters': 650.00,
                        'schedules': schedules,
                        'live': live_data,
                    })
                return formatted
        except Exception as e:
            logger.warning(f"Failed loading master_data/trains.json: {e}")

    return MASTER_12_TRAINS_CORRIDOR_FEED


@shared_task(name='apps.trains.tasks.ingest_coa_feed', queue='high')
def ingest_coa_feed(feed_data=None):
    """
    Ingest Control Office Application (COA) and FOIS Timetable Feeds (FUNC-TRN-003).
    Ensures all 12 Master Trains for the Golden Corridor (NDLS-CNB) are seeded with
    station schedules, geodetic WGS-84 coordinates, and live telemetry.
    """
    payload = feed_data or load_coa_master_feed()
    today = timezone.now().date()

    # Clean up stale live status records from previous journey dates
    TrainLiveStatus.objects.filter(journey_date__lt=today).delete()

    trains_processed = 0
    schedules_created = 0
    live_positions_updated = 0

    for item in payload:
        train_num = item['train_number']
        direction = item.get('direction', 'DOWN')

        train_obj, _ = Train.objects.update_or_create(
            train_number=train_num,
            defaults={
                'train_name': item['train_name'],
                'train_type': item.get('train_type', TrainType.PASSENGER_EXPRESS),
                'priority_rank': item.get('priority_rank', 100),
                'direction': direction,
                'pax_capacity': item.get('pax_capacity', 1200),
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
                    'scheduled_departure_time': sched.get('dep') or sched.get('arr'),
                    'platform_number': str(sched.get('pf', '1')),
                    'km_milestone': Decimal(str(sched.get('km', 0.0))),
                }
            )
            schedules_created += 1

        # Ingest real-time status record with spatial interpolation
        live = item.get('live') or {}
        cur_km = float(live.get('km', 0.0))
        spatial = calculate_train_spatial_position(cur_km, direction=direction)

        TrainLiveStatus.objects.update_or_create(
            train=train_obj,
            journey_date=today,
            defaults={
                'current_station_code': spatial['current_station_code'],
                'current_section': spatial['current_section'],
                'current_km': Decimal(str(cur_km)),
                'latitude': spatial['latitude'],
                'longitude': spatial['longitude'],
                'heading': spatial['heading'],
                'delay_minutes': live.get('delay', 0),
                'speed_kmh': Decimal(str(live.get('speed', 0.0))),
                'status': live.get('status', TrainLiveRunStatus.RUNNING),
            }
        )
        live_positions_updated += 1

    # Real-time WebSocket event dispatch to Daphne channels
    channel_layer = get_channel_layer()
    if channel_layer:
        event_payload = {
            'type': 'train_feed_event',
            'event_type': 'TRAIN_FEED_INGESTED',
            'trains_count': trains_processed,
            'timestamp': timezone.now().isoformat(),
        }
        for grp in ['corridor_all', 'corridor_ndls-gzb']:
            try:
                async_to_sync(channel_layer.group_send)(
                    grp,
                    {
                        'type': 'corridor_event',
                        'data': event_payload
                    }
                )
            except Exception:
                pass

    summary = {
        'status': 'SUCCESS',
        'trains_processed': trains_processed,
        'schedules_created': schedules_created,
        'live_positions_updated': live_positions_updated,
        'timestamp': timezone.now().isoformat(),
    }
    logger.info(f"COA 12 Master Train Feed Ingestion completed: {summary}")
    return summary


@shared_task(name='apps.trains.tasks.simulate_train_movement', queue='high')
def simulate_train_movement(delta_seconds: int = 30):
    """
    Simulates continuous 60-FPS realistic train movements along the NDLS-CNB corridor.
    Updates WGS-84 coordinates, track section, speed, and heading for each active train.
    """
    today = timezone.now().date()
    live_records = TrainLiveStatus.objects.select_related('train').filter(journey_date=today)
    updated = 0

    for rec in live_records:
        speed = float(rec.speed_kmh)
        if speed <= 0:
            continue

        direction = getattr(rec.train, 'direction', 'DOWN')
        # Distance moved in delta_seconds (km = speed * hours)
        delta_km = (speed * (delta_seconds / 3600.0))

        if direction == 'DOWN':
            new_km = float(rec.current_km) + delta_km
            if new_km >= 440.2:
                new_km = 0.0  # Reset for continuous demonstration
        else:
            new_km = float(rec.current_km) - delta_km
            if new_km <= 0.0:
                new_km = 440.2  # Reset for continuous demonstration

        spatial = calculate_train_spatial_position(new_km, direction=direction)
        rec.current_km = Decimal(str(round(new_km, 3)))
        rec.latitude = spatial['latitude']
        rec.longitude = spatial['longitude']
        rec.heading = spatial['heading']
        rec.current_section = spatial['current_section']
        rec.current_station_code = spatial['current_station_code']
        rec.save(update_fields=['current_km', 'latitude', 'longitude', 'heading', 'current_section', 'current_station_code', 'last_reported_at'])
        updated += 1

    return {'simulated_trains': updated, 'delta_seconds': delta_seconds}
