class ResourceValidator:
    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation
        
        # Rule 3: Resource Exclusivity
        gang_id = block.get('gang_id')
        start_time = block.get('scheduled_start_time')
        end_time = block.get('scheduled_end_time')
        
        if gang_id and existing_blocks:
            for ex in existing_blocks:
                if ex.get('gang_id') == gang_id:
                    # Check for time overlap
                    if not (end_time <= ex['scheduled_start_time'] or start_time >= ex['scheduled_end_time']):
                        raise CoherenceViolation(f"Gang {gang_id} double-booked across overlapping blocks!")
