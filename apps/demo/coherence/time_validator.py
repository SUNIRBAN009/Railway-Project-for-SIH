class TimeValidator:
    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation
        
        start_time = block.get('scheduled_start_time')
        end_time = block.get('scheduled_end_time')
        
        if not start_time or not end_time:
            raise CoherenceViolation("Missing scheduled_start_time or scheduled_end_time")
            
        # Rule 2: Time Ordering
        if start_time >= end_time:
            raise CoherenceViolation("Start time must be before end time")
            
        duration = (end_time - start_time).total_seconds() / 3600
        if duration > 8.0:
            raise CoherenceViolation(f"Block duration {duration}h exceeds maximum allowed 8.0 hours")
