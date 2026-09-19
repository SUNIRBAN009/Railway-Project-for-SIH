import random
from .base import BaseDataGenerator

class DefectGenerator(BaseDataGenerator):
    def generate(self, count=1, severity='MEDIUM'):
        defects = []
        for i in range(count):
            start_km = random.uniform(0.0, 440.0)
            
            defect = {
                'id': f"DEF-{i}",
                'chainage_km': round(start_km, 3),
                'type': random.choice(['RAIL_FRACTURE', 'OHE_SNAP', 'SIGNAL_FAILURE']),
                'severity': severity,
                'status': 'OPEN'
            }
            defects.append(defect)
        return defects
