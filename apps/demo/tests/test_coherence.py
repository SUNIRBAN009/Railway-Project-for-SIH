import unittest
from datetime import datetime, timedelta
from apps.demo.coherence import CoherenceEngine, CoherenceViolation

class CoherenceEngineTests(unittest.TestCase):
    def setUp(self):
        self.master_data = {
            'trains': [
                {
                    'train_number': '12301',
                    'name': 'Howrah Rajdhani',
                    'schedule': [
                        {'station': 'CNB', 'km': 440.2, 'arrival': '06:00:00', 'departure': '06:05:00'},
                        {'station': 'NDLS', 'km': 0.0, 'arrival': '10:05:00', 'departure': '10:05:00'}
                    ]
                }
            ]
        }
        self.engine = CoherenceEngine(self.master_data)

    def test_rule_1_geography_validator(self):
        now = datetime.now()
        # Valid
        self.assertTrue(self.engine.validate_block({
            'start_km': 100.0, 'end_km': 110.0,
            'scheduled_start_time': now,
            'scheduled_end_time': now + timedelta(hours=2)
        }))
        
        # Invalid (Negative KM)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': -5.0, 'end_km': 10.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=2)
            })

        # Invalid (Exceeds corridor end 440.2 km)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 430.0, 'end_km': 450.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=2)
            })

        # Invalid (Reversed chainage)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 120.0, 'end_km': 100.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=2)
            })

    def test_rule_2_time_validator(self):
        now = datetime.now()
        # Invalid (End time before start time)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 100.0, 'end_km': 110.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now - timedelta(hours=1)
            })
            
        # Invalid (Exceeds maximum 8 hours)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 100.0, 'end_km': 110.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=8, minutes=30)
            })

    def test_rule_3_resource_exclusivity_and_travel_physics(self):
        now = datetime.now()
        existing_blocks = [{
            'gang_id': 'GANG-ENG-01',
            'start_km': 100.0,
            'end_km': 105.0,
            'scheduled_start_time': now,
            'scheduled_end_time': now + timedelta(hours=3)
        }]
        
        # 1. Overlapping time for same gang (Double-booking)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 100.0, 'end_km': 105.0,
                'scheduled_start_time': now + timedelta(hours=1),
                'scheduled_end_time': now + timedelta(hours=4),
                'gang_id': 'GANG-ENG-01'
            }, existing_blocks=existing_blocks)

        # 2. Travel Physics Violation: 80 km relocation in 1 hour (requires 80 km/h > max 40 km/h)
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 185.0, 'end_km': 190.0,
                'scheduled_start_time': now + timedelta(hours=4), # 1 hour after existing ends at 105km
                'scheduled_end_time': now + timedelta(hours=6),
                'gang_id': 'GANG-ENG-01'
            }, existing_blocks=existing_blocks)

        # 3. Valid Travel Physics: 20 km relocation in 1 hour (requires 20 km/h <= 40 km/h)
        self.assertTrue(self.engine.validate_block({
            'start_km': 120.0, 'end_km': 125.0,
            'scheduled_start_time': now + timedelta(hours=4),
            'scheduled_end_time': now + timedelta(hours=6),
            'gang_id': 'GANG-ENG-01'
        }, existing_blocks=existing_blocks))

    def test_rule_4_train_block_exclusion(self):
        now = datetime.now()
        # Allowed when PENDING
        self.assertTrue(self.engine.validate_block({
            'start_km': 100.0, 'end_km': 110.0,
            'scheduled_start_time': now,
            'scheduled_end_time': now + timedelta(hours=2),
            'status': 'PENDING',
            'conflicting_train_number': '12424'
        }))

        # Rejected when SANCTIONED
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 100.0, 'end_km': 110.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=2),
                'status': 'SANCTIONED',
                'conflicting_train_number': '12424'
            })

    def test_rule_5_cross_department_combined_block(self):
        now = datetime.now()
        # Invalid combined block with single department
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 142.5, 'end_km': 146.2,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=4),
                'is_combined_block': True,
                'participating_departments': ['ENG']
            })

        # Invalid electrical isolation line mismatch
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 142.5, 'end_km': 146.2,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=4),
                'is_combined_block': True,
                'participating_departments': ['ENG', 'TRD'],
                'line_type': 'DOWN',
                'ohe_isolated_line': 'UP'
            })

        # Valid combined block
        self.assertTrue(self.engine.validate_block({
            'start_km': 142.5, 'end_km': 146.2,
            'scheduled_start_time': now,
            'scheduled_end_time': now + timedelta(hours=4),
            'is_combined_block': True,
            'participating_departments': ['ENG', 'TRD'],
            'line_type': 'DOWN',
            'ohe_isolated_line': 'DOWN'
        }))

    def test_rule_6_asset_triplet_validation(self):
        now = datetime.now()
        # Invalid TMS prefix
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 100.0, 'end_km': 110.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=2),
                'tms_id': 'WRONG-ID-144.2'
            })

        # Valid Triplets
        self.assertTrue(self.engine.validate_block({
            'start_km': 100.0, 'end_km': 110.0,
            'scheduled_start_time': now,
            'scheduled_end_time': now + timedelta(hours=2),
            'tms_id': 'TMS-RAIL-NDLS-CNB-144.2',
            'smms_id': 'SMMS-SIG-NDLS-CNB-144.2',
            'tdms_id': 'TDMS-OHE-NDLS-CNB-144.2'
        }))

    def test_rule_7_seed_validation(self):
        now = datetime.now()
        # Invalid negative seed
        with self.assertRaises(CoherenceViolation):
            self.engine.validate_block({
                'start_km': 100.0, 'end_km': 110.0,
                'scheduled_start_time': now,
                'scheduled_end_time': now + timedelta(hours=2),
                'seed': -1
            })

        # Valid fixed seed 26027
        self.assertTrue(self.engine.validate_block({
            'start_km': 100.0, 'end_km': 110.0,
            'scheduled_start_time': now,
            'scheduled_end_time': now + timedelta(hours=2),
            'seed': 26027
        }))

if __name__ == '__main__':
    unittest.main()
