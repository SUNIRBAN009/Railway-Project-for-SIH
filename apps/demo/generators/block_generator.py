import random
from datetime import datetime, timedelta
from .base import BaseDataGenerator

class BlockGenerator(BaseDataGenerator):
    def generate(self, count=1, mode='RANDOM'):
        blocks = []
        for i in range(count):
            start_km = random.uniform(0.0, 430.0)
            end_km = start_km + random.uniform(1.0, 5.0)
            
            now = datetime.now()
            start_time = now + timedelta(hours=random.randint(1, 24))
            end_time = start_time + timedelta(hours=random.uniform(2, 6))
            
            block = {
                'id': f"BLK-{i}-{int(now.timestamp())}",
                'department': random.choice(['ENG', 'TRD', 'SNT']),
                'start_km': round(start_km, 3),
                'end_km': round(end_km, 3),
                'scheduled_start_time': start_time,
                'scheduled_end_time': end_time,
                'status': 'PENDING'
            }
            
            # Use coherence engine to validate
            try:
                self.coherence_engine.validate_block(block, blocks)
                blocks.append(block)
            except Exception as e:
                # In strict mode, we'd raise or retry. For demo generation, we might skip.
                pass
                
        return blocks
