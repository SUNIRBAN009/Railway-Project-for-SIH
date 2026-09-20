from typing import Dict, Any, List
from django.utils import timezone
from .base_scenario import BaseScenario
from apps.blocks.models import Block, BlockStatus, Corridor

class RajdhaniDelayCascadeScenario(BaseScenario):
    key = "rajdhani_delay_cascade"
    name = "Scenario C: Live Disruption & Breathing Plan"
    description = "Demonstrates live train telemetry injection causing a schedule deviation, triggering the Delay Cascade Recalculator to dynamically adjust block windows."
    duration_minutes = 3
    target_corridor = "NDLS-CNB-MAIN"

    def setup(self) -> Dict[str, Any]:
        self.log("Setting up Scenario C: Rajdhani Delay Cascade...")
        self.wait(0.5)
        # Ensure there is a sanctioned block in the downstream section to reschedule
        corridor = Corridor.objects.filter(code="NDLS-CNB-MAIN").first() or Corridor.objects.first()
        self.corridor = corridor

        if corridor:
            blk = Block.objects.filter(block_code="BLK-ENG-CNB-05").first()
            if not blk:
                from decimal import Decimal
                from apps.accounts.models import DepartmentCode
                from apps.blocks.models import LineType, WorkType
                Block.objects.create(
                    block_code="BLK-ENG-CNB-05",
                    corridor=corridor,
                    line_type=LineType.DOWN,
                    department_code=DepartmentCode.ENG,
                    work_type=WorkType.TRACK_TAMPING,
                    start_km=Decimal('314.0'),
                    end_km=Decimal('316.5'),
                    scheduled_start_time=timezone.now() + timezone.timedelta(hours=2),
                    scheduled_end_time=timezone.now() + timezone.timedelta(hours=5),
                    work_description="Track tamping with CSM-092 tamper at KM 315.0",
                    status=BlockStatus.SANCTIONED,
                )

        return {"status": "setup_complete", "corridor": corridor.code if corridor else None}

    def execute(self) -> List[Dict[str, Any]]:
        self.log("Executing Scenario C: Live Disruption & Breathing Plan...")
        self.wait(0.5)

        # Step 1: Telemetry injection
        self.log_step(
            step_number=1,
            title="Live Telemetry Ingestion: 12424 Rajdhani Delay",
            narrative="Real-time GPS telemetry feed detects Train 12424 (Dibrugarh Rajdhani Express) running 45 minutes late approaching CNB due to freight congestion in North Central Railway.",
            details={
                "train_number": "12424",
                "train_name": "Dibrugarh Rajdhani Express",
                "priority_rank": 1,
                "current_speed_kmh": 118,
                "recorded_delay_minutes": 45,
                "location_km": 312.4
            },
            event_type="TRAIN_TELEMETRY_UPDATE",
            event_payload={
                "train_number": "12424",
                "delay_minutes": 45,
                "status": "RUNNING_LATE",
                "location_km": 312.4
            },
            audio_cue="notification",
            map_focus={"km": 312.4, "zoom": 12}
        )
        self.wait(1.0)

        # Step 2: Schedule Deviation Detector (#116)
        self.log_step(
            step_number=2,
            title="Schedule Deviation Detector Alert (#116)",
            narrative="Automated Deviation Engine flags timetable disruption. 12424's revised estimated time of arrival (ETA) at Kanpur Central directly conflicts with planned maintenance block at KM 315.0.",
            details={
                "deviation_code": "DEV-2026-TRN-12424",
                "scheduled_slot": "02:15 IST",
                "predicted_slot": "03:00 IST (+45 min)",
                "conflicting_block": "BLK-ENG-CNB-05",
                "buffer_remaining_minutes": -30
            },
            event_type="DEVIATION_DETECTED",
            event_payload={"train_number": "12424", "deviation_type": "HEADWAY_COLLISION", "delay_min": 45},
            audio_cue="alert",
            map_focus={"km": 315.0, "zoom": 13}
        )
        self.wait(1.0)

        # Step 3: Delay Cascade Recalculator (#115)
        self.log_step(
            step_number=3,
            title="Delay Cascade Recalculator Computes Ripple Impact (#115)",
            narrative="HermiT reasoner and sweep-line recalculator evaluate downstream cascade impact: 3 following passenger services (12004 Shatabdi, 12280 Taj Express, 22436 Vande Bharat) would suffer cumulative 185 min delay if the block is held at original timing.",
            details={
                "downstream_impacted_trains": [
                    {"train": "12004 Shatabdi", "cascade_delay_min": 35},
                    {"train": "12280 Taj Express", "cascade_delay_min": 40},
                    {"train": "22436 Vande Bharat", "cascade_delay_min": 25}
                ],
                "cumulative_corridor_delay_min": 185,
                "optimal_action": "POSTPONE_BLOCK_WINDOW"
            },
            event_type="CASCADE_CALCULATED",
            event_payload={"cumulative_delay_saved": 185, "strategy": "DYNAMIC_BREATHING_WINDOW"},
            audio_cue="chime",
            map_focus={"km": 315.0, "zoom": 12}
        )
        self.wait(1.0)

        # Step 4: Breathing Plan Dynamic Window Adjustment
        # Update or record block shift in DB
        target_block = Block.objects.filter(block_code="BLK-ENG-CNB-05").first()
        if target_block:
            target_block.scheduled_start_time += timezone.timedelta(minutes=45)
            target_block.scheduled_end_time += timezone.timedelta(minutes=45)
            target_block.version += 1
            target_block.save()

        self.log_step(
            step_number=4,
            title="AI Dynamic Breathing Plan Re-allocates Window",
            narrative="System dynamically recalculates block schedule: BLK-ENG-CNB-05 start time shifted by +45 minutes (from 02:30 to 03:15 IST). High-priority Rajdhani clears section safely at full 130 km/h speed without speed restrictions.",
            details={
                "block_code": "BLK-ENG-CNB-05",
                "original_window": "02:30 to 05:30 IST",
                "adjusted_window": "03:15 to 06:15 IST",
                "breathing_shift_minutes": 45,
                "passenger_punctuality_index": "99.2% Preserved"
            },
            event_type="BLOCK_RESCHEDULED",
            event_payload={
                "block_code": "BLK-ENG-CNB-05",
                "shift_minutes": 45,
                "new_start": "03:15 IST",
                "reason": "12424 Rajdhani Delay Cascade"
            },
            audio_cue="success",
            map_focus={"km": 315.0, "zoom": 13}
        )
        self.wait(1.0)

        # Step 5: Automated Gang Alerts & SMS Dispatch
        try:
            from apps.notifications.models import (
                Notification, NotificationDeliveryLog, NotificationPriority,
                NotificationCategory, DeliveryChannel, DeliveryStatus
            )
            notif = Notification.objects.create(
                title="Schedule Shift Notice: BLK-ENG-CNB-05",
                message_body=(
                    "TIMETABLE UPDATE: Block BLK-ENG-CNB-05 (KM 314.0 to 316.5) shifted by +45 mins to 03:15 IST "
                    "due to Rajdhani Express 12424 headway priority. CSM-092 Tamper gang standby on siding."
                ),
                priority=NotificationPriority.URGENT_ACTION,
                category=NotificationCategory.TRAIN_DELAY_ALERT,
                target_entity_type="BLOCK",
                target_entity_id="BLK-ENG-CNB-05",
                recipient_role="ALL"
            )
            NotificationDeliveryLog.objects.create(
                notification=notif,
                channel=DeliveryChannel.SMS_GATEWAY,
                delivery_status=DeliveryStatus.DELIVERED,
                external_reference_id="CDAC-SMS-GANG-03",
                dispatched_at=timezone.now()
            )
        except Exception as e:
            self.log(f"Notification dispatch error (handled): {e}")

        self.log_step(
            step_number=5,
            title="Field Gang Dispatch & Timeline Gantt Resynchronization",
            narrative="Automated SMS and mobile app push dispatches sent to CNB Gang 03 supervisor: 'Block BLK-ENG-CNB-05 shifted to 03:15 IST. Standby on siding.' Corridor Gantt timeline updates live.",
            details={
                "sms_recipient": "Gang 03 Supervisor (Ram Singh)",
                "notification_status": "DELIVERED",
                "gantt_status": "RESYNCHRONIZED",
                "corridor_punctuality": "PRESERVED",
                "sms_reference": "CDAC-SMS-GANG-03"
            },
            event_type="GANG_ALERT_DISPATCHED",
            event_payload={"gang_id": "GANG-CNB-03", "status": "CONFIRMED", "shift": "+45m"},
            audio_cue="notification",
            map_focus={"km": 315.0, "zoom": 11}
        )

        self.log("Scenario C execution completed.")
        return self.steps_executed
