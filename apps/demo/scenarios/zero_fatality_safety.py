from typing import Dict, Any, List
from django.utils import timezone
from .base_scenario import BaseScenario
from apps.blocks.models import Block, BlockStatus, LineType, WorkType, Corridor
from apps.accounts.models import DepartmentCode

class ZeroFatalitySafetyScenario(BaseScenario):
    key = "zero_fatality_safety"
    name = "Scenario D: Zero-Fatality Digital Safety Protocol"
    description = "Demonstrates the complete cyber-physical safety lifecycle: Digital Safety Token (#71), Biometric Headcount (#72), 25kV OHE LOTO (#73), Geotagged Clearance Photo (#74), and Track Handback."
    duration_minutes = 2
    target_corridor = "NDLS-CNB-MAIN"

    def setup(self) -> Dict[str, Any]:
        self.log("Setting up Scenario D: Zero-Fatality Digital Safety Protocol...")
        self.wait(0.5)
        corridor = Corridor.objects.filter(code="NDLS-CNB-MAIN").first() or Corridor.objects.first()
        self.corridor = corridor
        now = timezone.now()
        
        # Ensure block BLK-SAF-01 exists for safety demonstration
        block = Block.objects.filter(block_code="BLK-SAF-01").first()
        if not block and corridor:
            block = Block.objects.create(
                block_code="BLK-SAF-01",
                corridor=corridor,
                line_type=LineType.UP,
                department_code=DepartmentCode.ENG,
                work_type=WorkType.TRACK_TAMPING,
                start_km=14.200,
                end_km=18.500,
                scheduled_start_time=now,
                scheduled_end_time=now + timezone.timedelta(hours=3),
                status=BlockStatus.SANCTIONED,
                equipment_required="CSM-092 Tamper",
                traction_power_cutoff_required=True,
                work_description="P-Way track realignment under zero-fatality safety protocol",
                version=1
            )
        self.block = block
        return {"status": "setup_complete", "block_code": "BLK-SAF-01"}

    def execute(self) -> List[Dict[str, Any]]:
        self.log("Executing Scenario D: Zero-Fatality Digital Safety Protocol...")
        self.wait(0.5)

        # Step 1: Digital Safety Token Issuance (#71)
        token_id = "TOK-BL-20260920-7F8E-ACD9"
        if hasattr(self, 'block') and self.block:
            self.block.status = BlockStatus.ACTIVE
            self.block.save(update_fields=['status'])

        self.log_step(
            step_number=1,
            title="Digital Safety Token Issuance (#71)",
            narrative=f"Chief Controller activates possession for BLK-SAF-01. Cryptographic Digital Safety Token {token_id} issued via SHA-256 handshake to P-Way Field Supervisor tablet.",
            details={
                "safety_token": token_id,
                "block_code": "BLK-SAF-01",
                "supervisor": "Rajesh Kumar (SSE/P-Way/NDLS)",
                "terminal_id": "TAB-ENG-DLI-04",
                "status": "POSSESSION_ACTIVE"
            },
            event_type="SAFETY_TOKEN_ISSUED",
            event_payload={"token": token_id, "block_code": "BLK-SAF-01", "status": "ACTIVE"},
            audio_cue="notification",
            map_focus={"km": 16.0, "zoom": 13}
        )
        self.wait(1.0)

        # Step 2: Biometric Headcount & Tool Reconciliation (#72)
        self.log_step(
            step_number=2,
            title="Biometric Headcount & Heavy Tool Reconciliation (#72)",
            narrative="Field terminal completes digital muster roll: 12/12 trackmen biometric check-in verified. RFID tool tracker confirms 24/24 hydraulic track jacks, rail tongs, and torque wrenches logged into track section.",
            details={
                "personnel_count": "12 / 12 Verified",
                "rfid_tools_accounted": "24 / 24 Logged",
                "gps_geofence": "Enforced (KM 14.2 to 18.5)",
                "biometric_hash": "a8f9c0e2...319d"
            },
            event_type="HEADCOUNT_VERIFIED",
            event_payload={"personnel": 12, "tools": 24, "geofence_status": "LOCKED"},
            audio_cue="chime",
            map_focus={"km": 16.0, "zoom": 14}
        )
        self.wait(1.0)

        # Step 3: OHE 25kV Traction De-energization & LOTO (#73)
        self.log_step(
            step_number=3,
            title="25kV OHE Power Isolation & Lockout-Tagout (LOTO) (#73)",
            narrative="TRD Remote Control Center initiates SCADA breaker trip. Feeder CB-NDLS-04 opened, earthing switches closed. Physical Lockout-Tagout (LOTO) key verified on supervisor's interlock unit.",
            details={
                "feeder_breaker": "CB-NDLS-04",
                "scada_status": "DE_ENERGIZED_25KV",
                "discharge_rods_placed": 4,
                "loto_key_verified": "LOTO-TRD-NDLS-88",
                "safety_status": "DEAD_SECTION_VERIFIED"
            },
            event_type="OHE_LOTO_CONFIRMED",
            event_payload={"breaker": "CB-NDLS-04", "voltage_kv": 0.0, "loto": "CONFIRMED"},
            audio_cue="alert",
            map_focus={"km": 16.0, "zoom": 13}
        )
        self.wait(1.0)

        # Step 4: Geotagged True-Clearance Photo Upload (#74)
        photo_hash = "SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        self.log_step(
            step_number=4,
            title="Geotagged True-Clearance Photographic Verification (#74)",
            narrative=f"Track work completed. Field Supervisor captures geotagged EXIF-verified photo at KM 16.350 showing track completely clear of workers, tools, and ballast regulators. Cryptographic hash recorded: {photo_hash[:24]}...",
            details={
                "photo_evidence": "CLEARANCE_KM16_350.JPG",
                "geotag_lat_lon": "28.6421° N, 77.2410° E",
                "integrity_hash": photo_hash,
                "personnel_clearance": "12/12 Exited Track Buffer",
                "tools_clearance": "24/24 Stowed on Siding"
            },
            event_type="CLEARANCE_PHOTO_UPLOADED",
            event_payload={"photo_hash": photo_hash, "clearance_verified": True},
            audio_cue="notification",
            map_focus={"km": 16.3, "zoom": 14}
        )
        self.wait(1.0)

        # Step 5: Digital Safety Handback & Power Restoral (#80)
        if hasattr(self, 'block') and self.block:
            self.block.status = BlockStatus.COMPLETED
            self.block.track_fit_certified = True
            self.block.save(update_fields=['status', 'track_fit_certified'])

        # Dispatch Safety Clearance Certificate Notification
        try:
            from apps.notifications.models import (
                Notification, NotificationDeliveryLog, NotificationPriority,
                NotificationCategory, DeliveryChannel, DeliveryStatus
            )
            cert_id = "CERT-SAFE-2026-0920-DLI-01"
            notif = Notification.objects.create(
                title=f"Zero-Fatality Track Handback Certified: {cert_id}",
                message_body=(
                    f"SAFETY PROTOCOL COMPLETE: Block BLK-SAF-01 verified clear at KM 16.350. "
                    f"12/12 workers and 24/24 tools safely evacuated. 25kV OHE power restored (25.0 kV). "
                    f"Track Fit Certified. Track speed restored to 130 km/h (GREEN)."
                ),
                priority=NotificationPriority.CRITICAL_EMERGENCY,
                category=NotificationCategory.WORK_ORDER_ASSIGNED,
                target_entity_type="BLOCK",
                target_entity_id="BLK-SAF-01",
                recipient_role="ALL"
            )
            NotificationDeliveryLog.objects.create(
                notification=notif,
                channel=DeliveryChannel.WEBSOCKET_INAPP,
                delivery_status=DeliveryStatus.DELIVERED,
                external_reference_id="WS-SEC-HANDBACK-01",
                dispatched_at=timezone.now()
            )
        except Exception as e:
            self.log(f"Notification dispatch error (handled): {e}")

        self.log_step(
            step_number=5,
            title="Digital Safety Certificate & Track Handback (#80)",
            narrative="Digital Safety Handback Certificate issued. SCADA re-energizes 25kV OHE catenary. Chief Controller clears caution orders. Track color turns bright green on 3D GIS radar with full 130 km/h line speed restored.",
            details={
                "certificate_id": "CERT-SAFE-2026-0920-DLI-01",
                "track_fit_certified": True,
                "ohe_restored_kv": 25.0,
                "max_speed_restored_kmh": 130,
                "zero_fatality_audit": "PASSED (100% PROTOCOL COMPLIANCE)"
            },
            event_type="TRACK_HANDBACK_COMPLETE",
            event_payload={
                "certificate": "CERT-SAFE-2026-0920-DLI-01",
                "block_status": "COMPLETED",
                "speed_kmh": 130
            },
            audio_cue="success",
            map_focus={"km": 16.0, "zoom": 11}
        )

        self.log("Scenario D execution completed.")
        return self.steps_executed
