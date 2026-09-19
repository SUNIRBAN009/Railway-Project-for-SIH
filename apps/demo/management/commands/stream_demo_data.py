import time
from django.core.management.base import BaseCommand
from apps.demo.generators.train_generator import TrainPositionGenerator
from apps.demo.generators.defect_generator import DefectGenerator
from apps.demo.generators.block_generator import BlockGenerator

class Command(BaseCommand):
    help = 'Continuously streams demo events to WebSockets for live feel'

    def add_arguments(self, parser):
        parser.add_argument('--rate', type=float, default=4.0, help='Events per second')
        parser.add_argument('--duration', type=int, default=1800, help='Duration in seconds')
        parser.add_argument('--broadcast', action='store_true', help='Broadcast to WebSockets')

    def handle(self, *args, **options):
        rate = options['rate']
        duration = options['duration']
        broadcast = options['broadcast']
        
        sleep_time = 1.0 / rate
        end_time = time.time() + duration
        
        self.stdout.write(self.style.SUCCESS(f"Starting stream for {duration}s at {rate} Hz"))
        
        # In a real setup, we would initialize generators with master data
        train_gen = TrainPositionGenerator({})
        defect_gen = DefectGenerator({})
        block_gen = BlockGenerator({})
        
        event_count = 0
        try:
            while time.time() < end_time:
                # Alternate generating events
                if event_count % 3 == 0:
                    payload = train_gen.generate(1)
                    evt = "TRAIN_MOVED"
                elif event_count % 10 == 0:
                    payload = defect_gen.generate(1)
                    evt = "DEFECT_REPORTED"
                else:
                    payload = {"heartbeat": True}
                    evt = "PING"
                    
                if broadcast:
                    # In a real app, send to Daphne WebSocket
                    pass
                
                self.stdout.write(f"Stream: [{evt}] {payload}")
                event_count += 1
                time.sleep(sleep_time)
                
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Stream interrupted by user."))
            
        self.stdout.write(self.style.SUCCESS(f"Stream ended. Sent {event_count} events."))
