from datetime import datetime, timedelta, timezone
from .base import BaseDataGenerator

class ConflictInjector(BaseDataGenerator):
    """
    Automated Conflict Injection Engine for Indian Railways AI Platform.
    Injects high-impact operational conflict scenarios to demonstrate
    AI spatial-temporal conflict detection, Combined Block USP (#98),
    and Rule 3 travel physics enforcement to hackathon judges.
    """

    def inject_eng_vs_trd_combined_conflict(self, base_time=None):
        """
        USP #98: Cross-Department Combined Block Conflict.
        Injects overlapping ENG and TRD block requests on the same line.
        Saves 3.5 hours of corridor downtime when merged by AI.
        """
        now = base_time or datetime.now(timezone.utc)
        start_time = now + timedelta(hours=3)

        # Block 1: Civil Engineering Track Tamping
        eng_block = {
            'id': f"BLK-ENG-CONFLICT-{int(now.timestamp())}",
            'block_code': f"BLK-ENG-GZB-101",
            'department': 'ENG',
            'department_code': 'ENG',
            'work_type': 'Track Tamping (CSM-09-32)',
            'start_km': 14.200,
            'end_km': 18.500,
            'scheduled_start_time': start_time,
            'scheduled_end_time': start_time + timedelta(hours=3), # 3.0h
            'line_type': 'UP',
            'equipment_id': 'CSM-09-32',
            'gang_id': 'GANG-ENG-01',
            'traction_power_cutoff_required': False,
            'status': 'PENDING',
            'conflict_flag': 'CROSS_DEPT_OVERLAP',
            'description': 'P-Way scheduled continuous track tamping and alignment.',
        }

        # Block 2: Electrical Traction Catenary Replacement
        trd_block = {
            'id': f"BLK-TRD-CONFLICT-{int(now.timestamp())}",
            'block_code': f"BLK-TRD-GZB-102",
            'department': 'TRD',
            'department_code': 'TRD',
            'work_type': '25kV AC Catenary Dropper Renewal',
            'start_km': 15.000,
            'end_km': 17.500,
            'scheduled_start_time': start_time + timedelta(minutes=30),
            'scheduled_end_time': start_time + timedelta(hours=3, minutes=30), # 3.0h
            'line_type': 'UP',
            'equipment_id': 'TOWER-WAGON-01',
            'gang_id': 'GANG-TRD-01',
            'traction_power_cutoff_required': True,
            'status': 'PENDING',
            'conflict_flag': 'CROSS_DEPT_OVERLAP',
            'description': '25kV contact wire dropper replacement under power block.',
        }

        return {
            'scenario_type': 'USP_98_COMBINED_BLOCK',
            'title': 'ENG vs TRD Cross-Department Overlap',
            'blocks': [eng_block, trd_block],
            'overlap_km_span': 2.5,
            'potential_time_savings_hours': 3.5,
            'ai_recommendation': 'Merge into Single Unified Combined Block (UP Main, KM 14.2-18.5, 03:00 Window)',
            'resolution_type': 'COMBINED_BLOCK_RECOMMENDED'
        }

    def inject_train_precedence_conflict(self, base_time=None):
        """
        Train-Block Precedence Conflict.
        Injects a block proposal overlapping a Prestige Rajdhani Express schedule.
        """
        now = base_time or datetime.now(timezone.utc)
        start_time = now + timedelta(hours=4)

        conflicting_block = {
            'id': f"BLK-ENG-TRAIN-CONFLICT-{int(now.timestamp())}",
            'block_code': f"BLK-ENG-TDL-204",
            'department': 'ENG',
            'department_code': 'ENG',
            'work_type': 'Ballast Cleaning (BCM-301)',
            'start_km': 204.000,
            'end_km': 208.500,
            'scheduled_start_time': start_time,
            'scheduled_end_time': start_time + timedelta(hours=4),
            'line_type': 'DOWN',
            'equipment_id': 'BCM-301',
            'gang_id': 'GANG-ENG-02',
            'status': 'PENDING',
            'conflict_flag': 'TRAIN_SCHEDULE_COLLISION',
            'conflicting_train': {
                'train_number': '12301',
                'name': 'Howrah Rajdhani Express',
                'priority_rank': 99,
                'scheduled_passage_time': (start_time + timedelta(hours=1, minutes=15)).isoformat(),
                'milestone_km': 206.0
            },
            'description': 'Heavy ballast cleaning near Tundla Junction crossing Rajdhani path.'
        }

        return {
            'scenario_type': 'TRAIN_PRECEDENCE_CONFLICT',
            'title': 'Block Collision with 12301 Howrah Rajdhani Express',
            'blocks': [conflicting_block],
            'ai_recommendation': 'Breathing Plan Activated: Advance block start by 90 minutes or divert freight loops.',
            'resolution_type': 'SCHEDULE_RETIMING_REQUIRED'
        }

    def inject_resource_double_booking_conflict(self, base_time=None):
        """
        Rule 3: Resource Exclusivity & 40 km/h Travel Physics Violation.
        Assigns same gang to two work sites 160 km apart within 1 hour gap (160 km/h required speed).
        """
        now = base_time or datetime.now(timezone.utc)
        site_a_start = now + timedelta(hours=2)
        site_a_end = site_a_start + timedelta(hours=2)

        # Site A: KM 120.0
        site_a = {
            'id': f"BLK-ENG-SITE-A-{int(now.timestamp())}",
            'block_code': 'BLK-ENG-SITE-A',
            'department': 'ENG',
            'department_code': 'ENG',
            'work_type': 'Emergency Rail Replacement',
            'start_km': 118.000,
            'end_km': 122.000,
            'scheduled_start_time': site_a_start,
            'scheduled_end_time': site_a_end,
            'gang_id': 'GANG-ENG-01',
            'equipment_id': 'CSM-09-32',
            'line_type': 'UP',
            'status': 'SANCTIONED',
        }

        # Site B: KM 280.0 (160 km away, starting only 1 hour later)
        site_b_start = site_a_end + timedelta(hours=1)
        site_b = {
            'id': f"BLK-ENG-SITE-B-{int(now.timestamp())}",
            'block_code': 'BLK-ENG-SITE-B',
            'department': 'ENG',
            'department_code': 'ENG',
            'work_type': 'Routine Tamping',
            'start_km': 278.000,
            'end_km': 282.000,
            'scheduled_start_time': site_b_start,
            'scheduled_end_time': site_b_start + timedelta(hours=3),
            'gang_id': 'GANG-ENG-01', # Same gang!
            'equipment_id': 'CSM-09-32', # Same machine!
            'line_type': 'UP',
            'status': 'PENDING',
            'conflict_flag': 'TRAVEL_PHYSICS_VIOLATION'
        }

        return {
            'scenario_type': 'RESOURCE_PHYSICS_VIOLATION',
            'title': 'Gang Double-Booking & Travel Physics Breach',
            'blocks': [site_a, site_b],
            'distance_km': 160.0,
            'available_gap_hours': 1.0,
            'required_speed_kmh': 160.0,
            'max_allowed_speed_kmh': 40.0,
            'ai_recommendation': 'Rule 3 Violation: Assign GANG-ENG-02 or delay Site B start by at least 4.0 hours.',
            'resolution_type': 'RESOURCE_REALLOCATION_REQUIRED'
        }
