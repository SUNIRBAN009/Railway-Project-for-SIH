class GeographyValidator:
    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation
        
        start_km = block.get('start_km')
        end_km = block.get('end_km')
        
        if start_km is None or end_km is None:
            raise CoherenceViolation("Missing chainage (start_km or end_km)", rule_number=1)
            
        corridor_start = 0.000
        corridor_end = 440.200
        
        # Rule 1: Geography
        if start_km < corridor_start or end_km > corridor_end or start_km >= end_km:
            raise CoherenceViolation(
                f"Rule 1 Geography Violation: Invalid KM range [{start_km} to {end_km}]. Must be within corridor bounds [0.0 to 440.2 KM] and start < end.",
                rule_number=1,
                details={'start_km': start_km, 'end_km': end_km, 'corridor_min': 0.0, 'corridor_max': 440.2}
            )

