class ResourceValidator:
    """
    Rule 3: Resource Exclusivity & 40km/h Travel Physics.
    Ensures gangs and machinery cannot be double-booked across overlapping times,
    and enforces maximum 40 km/h relocation physics between consecutive work sites.
    """
    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation

        gang_id = block.get('gang_id') or block.get('assigned_gang_id')
        equipment_id = block.get('equipment_id') or block.get('assigned_equipment_id')
        start_time = block.get('scheduled_start_time')
        end_time = block.get('scheduled_end_time')
        start_km = float(block.get('start_km', 0.0))
        end_km = float(block.get('end_km', 0.0))

        if not existing_blocks or (not gang_id and not equipment_id):
            return

        for ex in existing_blocks:
            ex_gang = ex.get('gang_id') or ex.get('assigned_gang_id')
            ex_eq = ex.get('equipment_id') or ex.get('assigned_equipment_id')
            ex_start = ex.get('scheduled_start_time')
            ex_end = ex.get('scheduled_end_time')
            ex_start_km = float(ex.get('start_km', 0.0))
            ex_end_km = float(ex.get('end_km', 0.0))

            if not ex_start or not ex_end:
                continue

            # Check Gang overlap & travel physics
            if gang_id and ex_gang == gang_id:
                # 1. Direct Time Overlap Check
                is_overlap = not (end_time <= ex_start or start_time >= ex_end)
                if is_overlap:
                    raise CoherenceViolation(
                        f"Resource Exclusivity Violation: Gang '{gang_id}' double-booked across overlapping block windows!",
                        rule_number=3
                    )

                # 2. 40 km/h Travel Physics Check
                # If block starts after existing block ends
                if start_time >= ex_end:
                    gap_hours = (start_time - ex_end).total_seconds() / 3600.0
                    distance_km = abs(start_km - ex_end_km)
                    if gap_hours > 0 and distance_km > 0:
                        speed_req = distance_km / gap_hours
                        if speed_req > 40.0:
                            raise CoherenceViolation(
                                f"Travel Physics Violation: Gang '{gang_id}' requires {speed_req:.1f} km/h "
                                f"to relocate {distance_km:.1f} km in {gap_hours:.2f}h (maximum permissible transfer speed is 40.0 km/h).",
                                rule_number=3
                            )

                # If existing block starts after block ends
                elif ex_start >= end_time:
                    gap_hours = (ex_start - end_time).total_seconds() / 3600.0
                    distance_km = abs(ex_start_km - end_km)
                    if gap_hours > 0 and distance_km > 0:
                        speed_req = distance_km / gap_hours
                        if speed_req > 40.0:
                            raise CoherenceViolation(
                                f"Travel Physics Violation: Gang '{gang_id}' requires {speed_req:.1f} km/h "
                                f"to relocate {distance_km:.1f} km in {gap_hours:.2f}h (maximum permissible transfer speed is 40.0 km/h).",
                                rule_number=3
                            )

            # Check Heavy Machinery overlap
            if equipment_id and ex_eq == equipment_id:
                is_overlap = not (end_time <= ex_start or start_time >= ex_end)
                if is_overlap:
                    raise CoherenceViolation(
                        f"Equipment Exclusivity Violation: Machinery '{equipment_id}' double-booked across overlapping windows!",
                        rule_number=3
                    )
