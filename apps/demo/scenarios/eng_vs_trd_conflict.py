from .base_scenario import BaseScenario

class EngVsTrdConflictScenario(BaseScenario):
    name = "Scenario B: Conflict -> Combined Block (USP #98)"
    description = "Demonstrates AI detection of overlapping ENG and TRD block requests, resulting in a Combined Block recommendation."
    
    def setup(self):
        self.log("Setting up Eng vs TRD Conflict Scenario...")
        self.wait(1.0)
        
    def execute(self):
        self.log("1. ENG JE submits block request for KM 142.5 to 146.2 from 02:00 to 06:00 (Track Tamping).")
        self.wait(2.0)
        
        self.log("2. TRD JE submits block request for KM 143.0 to 145.5 from 03:00 to 07:00 (OHE Power Block).")
        self.wait(2.0)
        
        self.log("3. AI Conflict Engine detects Spatial-Temporal overlap!")
        self.broadcast_event("CONFLICT_DETECTED", {"level": "HIGH", "type": "DEPARTMENTAL_OVERLAP"})
        self.wait(3.0)
        
        self.log("4. AI Proposes Combined Block Window: 02:30 to 06:30 for both departments.")
        self.broadcast_event("AI_RECOMMENDATION", {"recommendation": "COMBINED_BLOCK", "savings_hours": 3.5})
        self.wait(3.0)
        
        self.log("5. Chief Controller sanctions the Combined Block.")
        self.broadcast_event("BLOCK_SANCTIONED", {"status": "SANCTIONED", "block_id": "COMB-98-01"})
        self.log("Scenario execution completed.")
