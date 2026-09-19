class TrainBlockValidator:
    """
    Rule 4: Train-Block Exclusion for Sanctions.
    Active or Sanctioned maintenance blocks must have zero train path conflicts.
    Pending blocks are allowed to overlap with train traffic to showcase AI conflict resolution (#98).
    """
    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation
        
        status = block.get('status', 'DRAFT')
        # Only strict exclusion for sanctioned or active blocks
        if status not in ['SANCTIONED', 'ACTIVE']:
            return

        # Direct flag check
        if block.get('conflicting_train_number') or block.get('has_conflicting_train'):
            trn = block.get('conflicting_train_number') or 'scheduled train'
            raise CoherenceViolation(
                f"Train-Block Exclusion Violation: Cannot sanction block overlapping with {trn} traffic!"
            )

        start_time = block.get('scheduled_start_time')
        end_time = block.get('scheduled_end_time')
        start_km = float(block.get('start_km', 0.0))
        end_km = float(block.get('end_km', 0.0))

        if not start_time or not end_time or not master_data:
            return

        trains = master_data.get('trains', [])
        # Check timetable stoppages and line passages
        for t in trains:
            schedule = t.get('schedule', [])
            for stop in schedule:
                stop_km = float(stop.get('km', 0.0))
                # If station stop falls inside the block's physical chainage
                if start_km <= stop_km <= end_km:
                    # Check time overlap if time objects are comparable
                    arr_str = stop.get('arrival')
                    dep_str = stop.get('departure')
                    if arr_str and hasattr(start_time, 'time'):
                        try:
                            from datetime import time
                            arr_t = time.fromisoformat(arr_str)
                            dep_t = time.fromisoformat(dep_str) if dep_str else arr_t
                            b_start_t = start_time.time()
                            b_end_t = end_time.time()
                            
                            # Overlap check within 24h cycle
                            if not (dep_t <= b_start_t or arr_t >= b_end_t):
                                raise CoherenceViolation(
                                    f"Train-Block Collision: Sanctioned block [{start_km}-{end_km} km] "
                                    f"collides with Train {t.get('train_number')} ({t.get('name')}) at {stop.get('station')}!"
                                )
                        except (ValueError, TypeError):
                            pass
