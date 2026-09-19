from typing import Dict, Any, List
from django.utils import timezone
from .base_scenario import BaseScenario
from apps.blocks.models import Block, BlockStatus, LineType, WorkType, Corridor
from apps.accounts.models import DepartmentCode

class EngVsTrdConflictScenario(BaseScenario):
    key = "eng_vs_trd_conflict"
    name = "Scenario B: Conflict -> Combined Block (USP #98)"
    description = "Demonstrates AI detection of overlapping ENG and TRD block requests, resulting in an automated Combined Block recommendation that saves 3.5h of line capacity."
    duration_minutes = 3
    target_corridor = "NDLS-CNB-MAIN"

    def setup(self) -> Dict[str, Any]:
        self.log("Setting up Scenario B: ENG vs TRD Conflict...")
        self.wait(0.5)
        # Ensure corridor exists
        corridor = Corridor.objects.filter(code="NDLS-CNB-MAIN").first()
        if not corridor:
            corridor = Corridor.objects.first()
        self.corridor = corridor
        return {"status": "setup_complete", "corridor": corridor.code if corridor else None}

    def execute(self) -> List[Dict[str, Any]]:
        self.log("Executing Scenario B: Conflict -> Combined Block (USP #98)...")
        self.wait(0.5)
        now = timezone.now()

        # Step 1: ENG JE submits block proposal
        eng_start = now.replace(hour=2, minute=0, second=0, microsecond=0) + timezone.timedelta(days=1)
        eng_end = now.replace(hour=6, minute=0, second=0, microsecond=0) + timezone.timedelta(days=1)
        
        eng_block = Block.objects.filter(block_code="BLK-SCEN-ENG-142").first()
        if not eng_block and self.corridor:
            eng_block = Block.objects.create(
                block_code="BLK-SCEN-ENG-142",
                corridor=self.corridor,
                line_type=LineType.UP,
                department_code=DepartmentCode.ENG,
                work_type=WorkType.TRACK_TAMPING,
                start_km=142.500,
                end_km=146.200,
                scheduled_start_time=eng_start,
                scheduled_end_time=eng_end,
                equipment_required="CSM-092 Tamper",
                status=BlockStatus.PENDING_APPROVAL,
                work_description="Track Tamping & ballast profiling on UP Main Line",
                version=1
            )

        self.log_step(
            step_number=1,
            title="ENG Submits Heavy Track Tamping Block Proposal",
            narrative="Civil Engineering (P-Way) Junior Engineer submits proposal BLK-SCEN-ENG-142 for KM 142.500 to 146.200 from 02:00 to 06:00 IST (4.0 hrs) using CSM-092 Tamper.",
            details={
                "block_code": "BLK-SCEN-ENG-142",
                "department": "ENG",
                "span": "KM 142.500 to 146.200 (3.7 KM)",
                "window": "02:00 to 06:00 IST",
                "machine": "CSM-092 High-Output Tamper",
                "status": "PENDING_APPROVAL"
            },
            event_type="BLOCK_SUBMITTED",
            event_payload={"block_code": "BLK-SCEN-ENG-142", "department": "ENG", "start_km": 142.5, "end_km": 146.2},
            audio_cue="notification",
            map_focus={"km": 144.0, "zoom": 13}
        )
        self.wait(1.0)

        # Step 2: TRD JE submits overlapping OHE block proposal
        trd_start = now.replace(hour=3, minute=0, second=0, microsecond=0) + timezone.timedelta(days=1)
        trd_end = now.replace(hour=7, minute=0, second=0, microsecond=0) + timezone.timedelta(days=1)
        
        trd_block = Block.objects.filter(block_code="BLK-SCEN-TRD-143").first()
        if not trd_block and self.corridor:
            trd_block = Block.objects.create(
                block_code="BLK-SCEN-TRD-143",
                corridor=self.corridor,
                line_type=LineType.UP,
                department_code=DepartmentCode.TRD,
                work_type=WorkType.CATENARY_MAINTENANCE,
                start_km=143.000,
                end_km=145.500,
                scheduled_start_time=trd_start,
                scheduled_end_time=trd_end,
                equipment_required="TW-104 Tower Wagon",
                traction_power_cutoff_required=True,
                status=BlockStatus.PENDING_APPROVAL,
                work_description="25kV AC Catenary dropper replacement & contact wire height tuning",
                version=1
            )

        self.log_step(
            step_number=2,
            title="TRD Submits 25kV OHE Isolation Block Proposal",
            narrative="Electrical Traction (TRD) submits proposal BLK-SCEN-TRD-143 for KM 143.000 to 145.500 from 03:00 to 07:00 IST (4.0 hrs) requiring 25kV OHE de-energization.",
            details={
                "block_code": "BLK-SCEN-TRD-143",
                "department": "TRD",
                "span": "KM 143.000 to 145.500 (2.5 KM)",
                "window": "03:00 to 07:00 IST",
                "traction_power_cut": True,
                "status": "PENDING_APPROVAL"
            },
            event_type="BLOCK_SUBMITTED",
            event_payload={"block_code": "BLK-SCEN-TRD-143", "department": "TRD", "start_km": 143.0, "end_km": 145.5},
            audio_cue="notification",
            map_focus={"km": 144.2, "zoom": 13}
        )
        self.wait(1.0)

        # Step 3: Sweep-Line AI Conflict Detection
        if eng_block:
            eng_block.status = BlockStatus.CONFLICT_DETECTED
            eng_block.save(update_fields=['status'])
        if trd_block:
            trd_block.status = BlockStatus.CONFLICT_DETECTED
            trd_block.save(update_fields=['status'])

        self.log_step(
            step_number=3,
            title="AI Sweep-Line Spatial-Temporal Conflict Detected",
            narrative="AI Conflict Engine flags critical cross-departmental collision: Spatial overlap of 2.500 KM (KM 143.0 to 145.5) and Temporal overlap of 3.0 hrs (03:00 to 06:00 IST). Dual independent blocks would shut down track for 5.0 cumulative hours.",
            details={
                "conflict_type": "PARALLEL_BLOCK_COLLISION",
                "spatial_overlap_km": 2.500,
                "temporal_overlap_hrs": 3.0,
                "independent_downtime_hrs": 5.0,
                "status": "CONFLICT_DETECTED"
            },
            event_type="CONFLICT_DETECTED",
            event_payload={
                "type": "CROSS_DEPARTMENTAL_OVERLAP",
                "blocks": ["BLK-SCEN-ENG-142", "BLK-SCEN-TRD-143"],
                "overlap_km": 2.5,
                "severity": "HIGH"
            },
            audio_cue="alert",
            map_focus={"km": 144.2, "zoom": 14}
        )
        self.wait(1.0)

        # Step 4: AI Combined Block Recommendation (USP #98)
        self.log_step(
            step_number=4,
            title="AI Recommendation: Formulate Combined Block (USP #98)",
            narrative="AI Engine computes unified shadow possession: 02:30 to 06:30 IST (4.0 hrs) across KM 142.500 to 146.200. Civil tamping and OHE catenary works occur concurrently under a single power-block permit, saving 3.5 hrs of corridor capacity!",
            details={
                "recommendation": "COMBINED_BLOCK_POSSESSION",
                "proposed_window": "02:30 to 06:30 IST (4.0 hrs)",
                "span_km": "KM 142.500 to 146.200",
                "track_capacity_saved_hours": 3.5,
                "train_delay_prevented_minutes": 140,
                "shadow_bundling_efficiency": "+87.5%"
            },
            event_type="AI_RECOMMENDATION",
            event_payload={
                "recommendation": "COMBINED_BLOCK",
                "savings_hours": 3.5,
                "unified_window": "02:30 to 06:30 IST"
            },
            audio_cue="chime",
            map_focus={"km": 144.0, "zoom": 13}
        )
        self.wait(1.0)

        # Step 5: Sanctioning & Dispatch
        combined_code = "BLK-COMB-98-01"
        comb_start = now.replace(hour=2, minute=30, second=0, microsecond=0) + timezone.timedelta(days=1)
        comb_end = now.replace(hour=6, minute=30, second=0, microsecond=0) + timezone.timedelta(days=1)
        
        comb_block = Block.objects.filter(block_code=combined_code).first()
        if not comb_block and self.corridor:
            comb_block = Block.objects.create(
                block_code=combined_code,
                corridor=self.corridor,
                line_type=LineType.UP,
                department_code=DepartmentCode.ENG,
                work_type=WorkType.TRACK_TAMPING,
                start_km=142.500,
                end_km=146.200,
                scheduled_start_time=comb_start,
                scheduled_end_time=comb_end,
                equipment_required="CSM-092 Tamper + TW-104 Tower Wagon",
                traction_power_cutoff_required=True,
                status=BlockStatus.SANCTIONED,
                sanctioned_at=now,
                caution_order_id="CO-2026-DLI-98",
                work_description="AI Combined Block: Concurrent Track Tamping (ENG) & OHE Catenary Maintenance (TRD) [USP #98 - 3.5h Saved]",
                version=2
            )
        elif comb_block:
            comb_block.status = BlockStatus.SANCTIONED
            comb_block.save(update_fields=['status'])

        self.log_step(
            step_number=5,
            title="Chief Controller Sanctions Combined Block BLK-COMB-98-01",
            narrative="Chief Controller executes 1-click sanction. Unified block BLK-COMB-98-01 is officially issued with Caution Order CO-2026-DLI-98. SMS dispatches sent to ENG and TRD gangs. Track throughput preserved.",
            details={
                "combined_block_code": "BLK-COMB-98-01",
                "caution_order_id": "CO-2026-DLI-98",
                "status": "SANCTIONED",
                "sms_notifications_sent": 2,
                "capacity_dividend": "3.5 hrs track time reclaimed"
            },
            event_type="BLOCK_SANCTIONED",
            event_payload={
                "block_code": "BLK-COMB-98-01",
                "status": "SANCTIONED",
                "savings_hours": 3.5
            },
            audio_cue="success",
            map_focus={"km": 144.0, "zoom": 12}
        )

        self.log("Scenario B execution completed.")
        return self.steps_executed
