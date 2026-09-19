import unittest
from datetime import datetime, timedelta
from apps.demo.coherence import CoherenceEngine, CoherenceViolation

class CoherenceEngineTests(unittest.TestCase):
    def setUp(self):
        self.master_data = {}
        self.engine = CoherenceEngine(self.master_data)

    def test_geography_validator(self):
        # Valid
        self.engine.validate_block({
            'start_km': 100.0, 'end_km': 110.0,
            'scheduled_start_time': datetime.now(),
            'scheduled_end_time': datetime.now() + timedelta(hours=2)
        })
        
        # Invalid (Out of bounds)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': -5.0, 'end_km': 10.0,
                'scheduled_start_time': datetime.now(),
                'scheduled_end_time': datetime.now() + timedelta(hours=2)
            })

    def test_time_validator(self):
        now = datetime.now()
        # Invalid (End time before start time)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 100.0, 'end_km': 110.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now - timedelta(hours=1)
            })
            
        # Invalid (Exceeds 8 hours)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 100.0, 'end_km': 110.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=9)
            })

    def test_resource_validator(self):
        now = datetime.now()
        existing_blocks = [{
            'gang_id': 'GANG-1',
            'scheduled_start_time': now,
            'scheduled_end_time': now + timedelta(hours=4)
        }]
        
        # Overlapping time for same gang
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 100.0, 'end_km': 110.0,
                'scheduled_start_time': now + timedelta(hours=2),
                'scheduled_end_time': now + timedelta(hours=6),
                'gang_id': 'GANG-1'
            }, existing_blocks=existing_blocks)
