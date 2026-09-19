import time
import random
from datetime import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.demo.generators.train_generator import TrainPositionGenerator
from apps.demo.generators.defect_generator import DefectGenerator
from apps.demo.generators.block_generator import BlockGenerator
from apps.blocks.models import Block, Corridor
from apps.trains.models import Train

class Command(BaseCommand):
    help = 'Continuously streams real-time demo telemetry & events to Daphne WebSockets at 2Hz+'

    def add_arguments(self, parser):
        parser.add_argument('--rate', type=float, default=2.0, help='Events per second (Hz)')
        parser.add_argument('--duration', type=int, default=60, help='Duration in seconds')
        parser.add_argument('--broadcast', action='store_true', default=True, help='Broadcast to WebSockets via Redis')
        parser.add_argument('--corridor', type=str, default='NDLS-CNB-MAIN', help='Corridor code to stream')

    def handle(self, *args, **options):
        rate = options['rate']
        duration = options['duration']
        broadcast = options['broadcast']
        corridor_code = options['corridor'].upper()

        sleep_time = 1.0 / max(rate, 0.1)
        end_time = time.time() + duration

        self.stdout.write(self.style.SUCCESS(
            f"⚡ Starting Continuous Streaming Engine on {corridor_code} for {duration}s at {rate} Hz (Broadcast={broadcast})..."
        ))

        # Channel Layer
        channel_layer = get_channel_layer() if broadcast else None
        if broadcast and not channel_layer:
            self.stdout.write(self.style.WARNING("⚠️ Channel layer not configured. Continuing in console logging mode."))

        corridor_groups = [
            f"corridor_{corridor_code.lower()}",
            "corridor_ndls-gzb",
            "corridor_all"
        ]

        # Initialize generators with master data
        train_gen = TrainPositionGenerator({'mode': 'STREAM', 'seed': 26027})
        defect_gen = DefectGenerator({'mode': 'STREAM', 'seed': 26027})
        block_gen = BlockGenerator({'mode': 'STREAM', 'seed': 26027})

        event_count = 0
        train_step = 0

        # Master train IDs to simulate progression along the corridor
        active_train_numbers = ["12424", "12004", "12301", "22436"]

        try:
            while time.time() < end_time:
                event_count += 1
                cycle = event_count % 10

                if cycle in (1, 3, 5, 7, 9):
                    # 1. Train Telemetry Event (at ~1-2Hz)
                    train_idx = (event_count // 2) % len(active_train_numbers)
                    t_num = active_train_numbers[train_idx]
                    km_pos = (20.0 + (event_count * 1.8)) % 430.0
                    speed = 100 + random.randint(0, 30)

                    evt_type = "TRAIN_TELEMETRY_UPDATE"
                    payload = {
                        "train_number": t_num,
                        "location_km": round(km_pos, 3),
                        "speed_kmh": speed,
                        "direction": "DOWN" if train_idx % 2 == 0 else "UP",
                        "delay_minutes": 0 if t_num != "12424" else 15,
                        "status": "ON_TIME" if t_num != "12424" else "CAUTION",
                        "timestamp": timezone.now().isoformat()
                    }

                elif cycle == 2:
                    # 2. Ultrasonic Defect Health Stream
                    defects = defect_gen.generate(1)
                    first_def = defects[0] if defects else {}
                    evt_type = "DEFECT_REPORTED"
                    payload = {
                        "defect_id": first_def.get("defect_id", f"DEF-STRM-{event_count}"),
                        "chainage_km": first_def.get("chainage_km", 144.2),
                        "composite_risk_score": first_def.get("composite_risk_score", 0.72),
                        "defect_type": first_def.get("defect_type", "USFD_FLAW"),
                        "status": "DETECTED",
                        "timestamp": timezone.now().isoformat()
                    }

                elif cycle == 6:
                    # 3. Block Occupancy Pulse
                    blocks_count = Block.objects.count()
                    active_blocks = Block.objects.filter(status='ACTIVE').count()
                    evt_type = "CORRIDOR_TELEMETRY"
                    payload = {
                        "corridor": corridor_code,
                        "total_blocks": blocks_count,
                        "active_possessions": active_blocks,
                        "punctuality_index": 98.6,
                        "active_trains": 12,
                        "timestamp": timezone.now().isoformat()
                    }

                else:
                    # 4. 2Hz Liveness Heartbeat
                    evt_type = "HEARTBEAT"
                    payload = {
                        "event_seq": event_count,
                        "rate_hz": rate,
                        "corridor": corridor_code,
                        "timestamp": timezone.now().isoformat()
                    }

                # WebSocket Broadcast to Channel Layer
                if broadcast and channel_layer:
                    for grp in corridor_groups:
                        try:
                            # Send both event formats to support all consumer implementations
                            async_to_sync(channel_layer.group_send)(
                                grp,
                                {
                                    "type": "corridor.event",
                                    "data": {
                                        "event_type": evt_type,
                                        "payload": payload,
                                        "timestamp": timezone.now().isoformat()
                                    }
                                }
                            )
                        except Exception as ex:
                            pass

                # Progress indicator every 10 events
                if event_count % 10 == 0:
                    remaining = int(end_time - time.time())
                    self.stdout.write(f"[{event_count:04d}] Streamed {evt_type} -> {payload.get('train_number', payload.get('corridor', 'PING'))} ({remaining}s remaining)")

                time.sleep(sleep_time)

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\n🛑 Streaming stopped by user signal."))

        self.stdout.write(self.style.SUCCESS(
            f"✅ Continuous Streaming completed: {event_count} events dispatched at {rate} Hz."
        ))
