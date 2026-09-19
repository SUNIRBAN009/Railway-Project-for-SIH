from datetime import datetime, timedelta, timezone
from .base import BaseDataGenerator, OperationalMode

class BlockGenerator(BaseDataGenerator):
    """
    Coherent Block Request Generator for Indian Railways AI Platform.
    Generates realistic, multi-departmental track possession requests
    guaranteed to comply 100% with the 7 Coherence Rules.
    """
    ENG_WORKS = [
        {'name': 'Track Tamping (CSM)', 'equipment': 'CSM-09-32', 'gang': 'GANG-ENG-01', 'avg_hours': 3.0, 'avg_km': 4.0},
        {'name': 'Ballast Cleaning (BCM)', 'equipment': 'BCM-301', 'gang': 'GANG-ENG-02', 'avg_hours': 4.0, 'avg_km': 2.5},
        {'name': 'Turnout Tamping (UNIMAT)', 'equipment': 'UNIMAT-08-4S', 'gang': 'GANG-ENG-01', 'avg_hours': 2.5, 'avg_km': 1.2},
        {'name': 'Rail Grinding (RGM)', 'equipment': 'RGM-72', 'gang': 'GANG-ENG-02', 'avg_hours': 3.5, 'avg_km': 6.0},
    ]

    TRD_WORKS = [
        {'name': 'OHE Catenary Dropper Renewal', 'equipment': 'TOWER-WAGON-01', 'gang': 'GANG-TRD-01', 'avg_hours': 2.5, 'avg_km': 3.0},
        {'name': 'Cantilever Assembly Overhaul', 'equipment': 'TOWER-WAGON-02', 'gang': 'GANG-TRD-02', 'avg_hours': 3.0, 'avg_km': 2.0},
        {'name': '25kV Neutral Section Inspection', 'equipment': 'TOWER-WAGON-01', 'gang': 'GANG-TRD-01', 'avg_hours': 2.0, 'avg_km': 1.5},
    ]

    SNT_WORKS = [
        {'name': 'Point Machine Drive Overhaul', 'equipment': 'SNT-TEST-KIT-01', 'gang': 'GANG-SNT-01', 'avg_hours': 2.0, 'avg_km': 1.0},
        {'name': 'Digital Axle Counter Calibration', 'equipment': 'SNT-TEST-KIT-02', 'gang': 'GANG-SNT-02', 'avg_hours': 1.5, 'avg_km': 1.5},
        {'name': 'Track Circuit Bonding Replacement', 'equipment': 'SNT-TEST-KIT-01', 'gang': 'GANG-SNT-01', 'avg_hours': 2.0, 'avg_km': 2.0},
    ]

    def generate(self, count=1, base_time=None, target_department=None, status='PENDING'):
        blocks = []
        now = base_time or datetime.now(timezone.utc)

        # Department distribution weights: 50% ENG, 30% TRD, 20% SNT
        dept_choices = ['ENG'] * 5 + ['TRD'] * 3 + ['SNT'] * 2

        attempts = 0
        max_attempts = count * 50

        while len(blocks) < count and attempts < max_attempts:
            attempts += 1
            dept = target_department or self.rng.choice(dept_choices)

            if dept == 'ENG':
                work_cfg = self.rng.choice(self.ENG_WORKS)
                power_cutoff = False
            elif dept == 'TRD':
                work_cfg = self.rng.choice(self.TRD_WORKS)
                power_cutoff = True
            else:
                work_cfg = self.rng.choice(self.SNT_WORKS)
                power_cutoff = False

            # Rule 1: Geography bounds (NDLS 0.0 to CNB 440.2 km)
            span_km = max(0.5, round(self.rng.uniform(work_cfg['avg_km'] * 0.7, work_cfg['avg_km'] * 1.3), 2))
            start_km = round(self.rng.uniform(5.0, 430.0), 3)
            end_km = round(min(439.5, start_km + span_km), 3)

            # Rule 2: Duration <= 6 hours (well within 8.0h max)
            duration_hours = max(1.0, min(6.0, round(self.rng.uniform(work_cfg['avg_hours'] * 0.8, work_cfg['avg_hours'] * 1.2), 2)))
            
            # Start time window: Staggered across next 1 to 48 hours
            offset_hours = self.rng.randint(1, 48)
            start_time = now + timedelta(hours=offset_hours, minutes=self.rng.choice([0, 15, 30, 45]))
            end_time = start_time + timedelta(hours=duration_hours)

            line_type = self.rng.choice(['UP', 'DOWN'])

            block_id = f"BLK-{dept}-{len(blocks) + 1:04d}-{int(now.timestamp()) % 10000}"
            block = {
                'id': block_id,
                'block_code': block_id,
                'department': dept,
                'department_code': dept,
                'work_type': work_cfg['name'],
                'start_km': start_km,
                'end_km': end_km,
                'scheduled_start_time': start_time,
                'scheduled_end_time': end_time,
                'line_type': line_type,
                'status': status,
                'equipment_id': work_cfg['equipment'],
                'gang_id': work_cfg['gang'],
                'traction_power_cutoff_required': power_cutoff,
                'caution_speed_kmh': self.rng.choice([30, 45, 60]),
                'priority': self.rng.choice([1, 2, 3]),
                'version': 1
            }

            # Enforce 100% compliance with CoherenceEngine
            try:
                self.coherence_engine.validate_block(block, blocks)
                blocks.append(block)
            except Exception:
                # If random parameter collided with existing block's resource/time, retry
                continue

        return blocks
