from .base_scenario import BaseScenario

class RajdhaniDelayCascadeScenario(BaseScenario):
    name = "Scenario C: Live Disruption & Breathing Plan"
    description = "Demonstrates live train telemetry injection causing a schedule deviation, triggering the Delay Cascade Recalculator to adjust block windows."
    
    def setup(self):
        self.log("Setting up Rajdhani Delay Cascade Scenario...")
        self.wait(1.0)
        
    def execute(self):
        self.log("1. Live feed simulator injects: 12424 Dibrugarh Rajdhani Express is 45 minutes late approaching CNB.")
        self.broadcast_event("TRAIN_TELEMETRY_UPDATE", {"train_number": "12424", "delay_minutes": 45})
        self.wait(2.0)
        
        self.log("2. Schedule Deviation Detector flags anomaly.")
        self.broadcast_event("DEVIATION_DETECTED", {"type": "DELAY", "train_number": "12424"})
        self.wait(2.0)
        
        self.log("3. Delay Cascade Recalculator computes impact on downstream blocks.")
        self.wait(3.0)
        
        self.log("4. System automatically shifts sanctioned block window by +45 minutes to create a breathing plan.")
        self.broadcast_event("BLOCK_RESCHEDULED", {"block_id": "BLK-99", "new_start": "+45m", "reason": "Cascade impact from train 12424"})
        
        self.log("5. SMS alerts sent to field gangs regarding rescheduled block.")
        self.log("Scenario execution completed.")
