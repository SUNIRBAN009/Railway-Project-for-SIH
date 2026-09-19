from typing import Dict, Any, List
from django.utils import timezone
from .base_scenario import BaseScenario
from apps.blocks.models import Block, BlockStatus, LineType, WorkType
from apps.accounts.models import DepartmentCode

class MorningDashboardScenario(BaseScenario):
    key = "morning_dashboard"
    name = "Scenario A: Morning Dashboard"
    description = "Chief Controller opens central command room. Overview of 8 scheduled blocks, 3 pending requests, and AI 'Why #1?' Risk Card explaining the top critical rail fracture at KM 144.2."
    duration_minutes = 2
    target_corridor = "NDLS-CNB-MAIN"

    def setup(self) -> Dict[str, Any]:
        self.log("Setting up Scenario A: Morning Dashboard...")
        self.wait(0.5)
        # Ensure there is an emergency pending block in DB for the rail flaw if not already present
        block_code = "BLK-EMG-NDLS-144"
        existing = Block.objects.filter(block_code=block_code).first()
        if not existing:
            from apps.blocks.models import Corridor
            corridor = Corridor.objects.filter(code="NDLS-CNB-MAIN").first()
            if corridor:
                now = timezone.now()
                Block.objects.create(
                    block_code=block_code,
                    corridor=corridor,
                    line_type=LineType.DOWN,
                    department_code=DepartmentCode.ENG,
                    work_type=WorkType.RAIL_RENEWAL,
                    start_km=144.000,
                    end_km=144.800,
                    scheduled_start_time=now + timezone.timedelta(hours=2),
                    scheduled_end_time=now + timezone.timedelta(hours=4),
                    status=BlockStatus.PENDING_APPROVAL,
                    work_description="Emergency Rail Replacement & Tamping due to critical USFD Flaw (0.88 CoF x LoF Risk Score)",
                    version=1
                )
        return {"status": "setup_complete", "target_corridor": self.target_corridor}

    def execute(self) -> List[Dict[str, Any]]:
        self.log("Executing Scenario A: Morning Dashboard...")
        self.wait(0.5)

        # Step 1: Initialization
        self.log_step(
            step_number=1,
            title="Chief Controller Morning Initialization",
            narrative="Chief Controller accesses the central operations theater. NDLS–CNB trunk corridor (440.2 KM) initialized with 8 sanctioned maintenance windows and 3 pending departmental submissions.",
            details={
                "corridor_code": "NDLS-CNB-MAIN",
                "length_km": 440.2,
                "active_blocks_count": 8,
                "pending_blocks_count": 3,
                "active_trains": 12
            },
            event_type="CORRIDOR_INITIALIZED",
            event_payload={"corridor": "NDLS-CNB-MAIN", "status": "GREEN", "mode": "OPERATIONAL"},
            audio_cue="notification",
            map_focus={"km": 28.5, "zoom": 11}
        )
        self.wait(1.0)

        # Step 2: USFD Flaw Detection
        self.log_step(
            step_number=2,
            title="AI Track Defect Prioritization Sweep",
            narrative="Automated ultrasonic USFD defect engine processes 51 corridor track assets. A severe rail fracture anomaly is pinpointed at KM 144.200 on the DOWN Main Line.",
            details={
                "asset_id": "AST-TRK-144-DN",
                "defect_type": "TRANSVERSE_FISSURE_USFD",
                "chainage_km": 144.200,
                "depth_mm": 18.5,
                "aging_days": 38
            },
            event_type="DEFECT_DETECTED",
            event_payload={"defect_id": "DEF-144-USFD", "severity": "CRITICAL", "km": 144.2},
            audio_cue="alert",
            map_focus={"km": 144.2, "zoom": 14}
        )
        self.wait(1.0)

        # Step 3: "Why #1?" AI Explainability Card (#94)
        self.log_step(
            step_number=3,
            title="AI 'Why #1?' Criticality Proof Card (#94)",
            narrative="System displays 'Why #1?' AI Explanation Card: Consequence of Failure (CoF 0.95) × Likelihood of Failure (LoF 0.92) = 0.88 Critical Composite Index. High-density passenger route carrying 130 km/h Rajdhani trains with 38 days latent aging.",
            details={
                "rank": 1,
                "composite_risk_score": 0.88,
                "consequence_of_failure": 0.95,
                "likelihood_of_failure": 0.92,
                "gmt_annual": 42.8,
                "prestige_trains_affected": ["12424 Dibrugarh Rajdhani", "12004 Lucknow Shatabdi"],
                "justification": "Catastrophic derailment probability exceeds threshold (>0.75). Immediate 2-hour rail renewal mandated under IR P-Way Manual Section 6.4."
            },
            event_type="WHY_NUMBER_ONE_EXPLANATION",
            event_payload={"asset": "AST-TRK-144-DN", "score": 0.88, "urgency": "EMERGENCY"},
            audio_cue="chime",
            map_focus={"km": 144.2, "zoom": 14}
        )
        self.wait(1.0)

        # Step 4: Automated Emergency Block Proposal
        self.log_step(
            step_number=4,
            title="Automated Emergency Block Proposal Generated",
            narrative="Platform automatically drafts emergency 2-hour rail renewal block BLK-EMG-NDLS-144 (KM 144.0 to 144.8) and alerts Divisional Civil Track Engineer (Sr.DEN).",
            details={
                "block_code": "BLK-EMG-NDLS-144",
                "department": "ENG",
                "span_km": "144.000 to 144.800",
                "recommended_window": "02:00 to 04:00 IST",
                "status": "PENDING_APPROVAL"
            },
            event_type="BLOCK_PROPOSED",
            event_payload={"block_code": "BLK-EMG-NDLS-144", "status": "PENDING_APPROVAL", "km": 144.2},
            audio_cue="notification",
            map_focus={"km": 144.2, "zoom": 13}
        )
        self.wait(1.0)

        # Step 5: Corridor Status Synchronized
        self.log_step(
            step_number=5,
            title="Corridor Health & Priority Matrix Broadcast",
            narrative="Synchronized corridor telemetry pushed to Chief Controller, P-Way Engineer, and S&T panels. Big screen wallboard updates with live possession indicators.",
            details={
                "status": "SYNCHRONIZED",
                "connected_clients": 6,
                "refresh_latency_ms": 14
            },
            event_type="WALLBOARD_SYNCED",
            event_payload={"corridor_health": "YELLOW_ALERT", "pending_actions": 1},
            audio_cue="success",
            map_focus={"km": 50.0, "zoom": 10}
        )

        self.log("Scenario A execution completed.")
        return self.steps_executed
