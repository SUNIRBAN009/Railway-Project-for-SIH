import random
from .base import BaseDataGenerator

class TrainPositionGenerator(BaseDataGenerator):
    def generate(self, count=1):
        positions = []
        for i in range(count):
            train = random.choice(self.master_data.get('trains', [{'train_number': '12301'}]))
            position = {
                'train_number': train['train_number'],
                'current_km': round(random.uniform(0.0, 440.0), 3),
                'speed_kmph': random.randint(40, 130),
                'delay_minutes': random.randint(0, 120)
            }
            positions.append(position)
        return positions
