import unittest
from datetime import datetime, timezone
from apps.demo.generators import (
    BaseDataGenerator,
    OperationalMode,
    BlockGenerator,
    DefectGenerator,
    TrainPositionGenerator,
    ConflictInjector,
)
from apps.demo.coherence import CoherenceEngine, CoherenceViolation

class TestGenerators(unittest.TestCase):
    def setUp(self):
        self.coherence_engine = CoherenceEngine()

    def test_seed_mode_batch_blocks_100_percent_coherent(self):
        """Generates 50 batch blocks in SEED mode (26027) and asserts 100% coherence."""
        generator = BlockGenerator(mode=OperationalMode.SEED, seed=26027)
        blocks = generator.generate(count=50)
        self.assertEqual(len(blocks), 50, "Should generate exactly 50 blocks")

        for block in blocks:
            # Geography bounds
            self.assertGreaterEqual(block['start_km'], 0.0)
            self.assertLessEqual(block['end_km'], 440.2)
            self.assertLess(block['start_km'], block['end_km'])

            # Time duration <= 8 hours
            duration = (block['scheduled_end_time'] - block['scheduled_start_time']).total_seconds() / 3600.0
            self.assertLessEqual(duration, 8.0)
            self.assertGreater(duration, 0.0)

            # Department
            self.assertIn(block['department'], ['ENG', 'TRD', 'SNT'])

        # Validate with CoherenceEngine
        self.assertTrue(self.coherence_engine.validate_all(blocks))

    def test_random_mode_batch_blocks_100_percent_coherent(self):
        """Generates 50 batch blocks in RANDOM mode and asserts 100% coherence."""
        generator = BlockGenerator(mode=OperationalMode.RANDOM)
        blocks = generator.generate(count=50)
        self.assertEqual(len(blocks), 50, "Should generate exactly 50 blocks")

        for block in blocks:
            self.assertGreaterEqual(block['start_km'], 0.0)
            self.assertLessEqual(block['end_km'], 440.2)
            self.assertLess(block['start_km'], block['end_km'])

            duration = (block['scheduled_end_time'] - block['scheduled_start_time']).total_seconds() / 3600.0
            self.assertLessEqual(duration, 8.0)

        # Validate with CoherenceEngine
        self.assertTrue(self.coherence_engine.validate_all(blocks))

    def test_defect_generator(self):
        """Generates defects and asserts risk scores and corridor bounds."""
        generator = DefectGenerator(mode=OperationalMode.SEED)
        defects = generator.generate(count=20)
        self.assertEqual(len(defects), 20)

        for d in defects:
            self.assertGreaterEqual(d['chainage_km'], 0.0)
            self.assertLessEqual(d['chainage_km'], 440.2)
            self.assertIn(d['severity'], ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
            self.assertGreaterEqual(d['risk_score'], 1)
            self.assertLessEqual(d['risk_score'], 25)
            self.assertTrue(len(d['why_priority_explanation']) > 10)

    def test_train_position_generator(self):
        """Generates train telemetry and asserts physical speed & bounds."""
        generator = TrainPositionGenerator(mode=OperationalMode.STREAM)
        telemetry = generator.generate()
        self.assertGreater(len(telemetry), 0)

        for t in telemetry:
            self.assertGreaterEqual(t['current_km'], 0.0)
            self.assertLessEqual(t['current_km'], 440.2)
            self.assertGreater(t['speed_kmph'], 0.0)
            self.assertLessEqual(t['speed_kmph'], 165.0)
            self.assertIn(t['direction'], ['UP', 'DOWN'])

    def test_conflict_injector_all_scenarios(self):
        """Tests all 3 conflict archetypes from ConflictInjector."""
        injector = ConflictInjector()

        # 1. USP #98 Combined Block Overlap
        c1 = injector.inject_eng_vs_trd_combined_conflict()
        self.assertEqual(c1['scenario_type'], 'USP_98_COMBINED_BLOCK')
        self.assertEqual(len(c1['blocks']), 2)
        self.assertEqual(c1['potential_time_savings_hours'], 3.5)

        # 2. Train Precedence Conflict
        c2 = injector.inject_train_precedence_conflict()
        self.assertEqual(c2['scenario_type'], 'TRAIN_PRECEDENCE_CONFLICT')
        self.assertIn('12301', c2['title'])

        # 3. Resource Double-Booking & Travel Physics
        c3 = injector.inject_resource_double_booking_conflict()
        self.assertEqual(c3['scenario_type'], 'RESOURCE_PHYSICS_VIOLATION')
        self.assertGreater(c3['required_speed_kmh'], 40.0)


if __name__ == '__main__':
    unittest.main()
