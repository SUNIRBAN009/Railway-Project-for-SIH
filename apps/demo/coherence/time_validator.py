from datetime import datetime

class TimeValidator:
    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation
        
        start_time = block.get('scheduled_start_time')
        end_time = block.get('scheduled_end_time')
        
        if not start_time or not end_time:
            raise CoherenceViolation("Missing scheduled_start_time or scheduled_end_time", rule_number=2)

        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        if isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            
        # Rule 2: Time Ordering
        if start_time >= end_time:
            raise CoherenceViolation("Start time must be strictly before end time", rule_number=2)
            
        duration = (end_time - start_time).total_seconds() / 3600
        if duration > 8.0:
            raise CoherenceViolation(f"Block duration {duration:.1f}h exceeds maximum allowed 8.0 hours", rule_number=2)
        if duration <= 0:
            raise CoherenceViolation(f"Block duration must be greater than 0 hours", rule_number=2)

