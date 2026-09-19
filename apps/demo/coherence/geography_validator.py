class GeographyValidator:
    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation
        
        start_km = block.get('start_km')
        end_km = block.get('end_km')
        
        if start_km is None or end_km is None:
            raise CoherenceViolation("Missing chainage (start_km or end_km)")
            
        corridor_start = 0.000
        corridor_end = 440.200
        
        # Rule 1: Geography
        if start_km < corridor_start or end_km > corridor_end or start_km >= end_km:
            raise CoherenceViolation(f"Invalid KM Range: {start_km} to {end_km}")
