import json
import logging
import math
import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple

from django.conf import settings
from django.utils import timezone

from apps.assets.models import TrackAsset, AssetDefectLog, AssetCategory, DefectSeverity, DefectType
from apps.blocks.models import Block, BlockStatus, WorkType, DepartmentCode
from apps.blocks.conflict_engine import ConflictDetector

logger = logging.getLogger(__name__)


class AssetHealthService:
    """
    Asset Reliability & Condition Monitoring Service (SVC-AST).
    Calculates Track Quality Index (TQI), Asset Degradation Scores (ADS),
    and orchestrates automated Emergency Block Generation for critical safety flaws.
    References:
      - docs/03-service-blueprints/06-assets.md
      - docs/04-function-maps/06-assets-function-map.md
    """

    @staticmethod
    def calculate_tqi(
        unevenness_sd: float,
        alignment_sd: float,
        twist_sd: float,
        gauge_sd: float
    ) -> Dict[str, Any]:
        """
        Calculates Indian Railways Track Quality Index (TQI) from Track Recording Car (TRC)
        standard deviations of 4 geometric parameters.
        Formula: TQI = sigma_UI + sigma_AL + sigma_TW + sigma_GA
        Ratings:
          <= 28.0: VERY_GOOD (Track fit up to 160 km/h)
          28.0 - 36.0: GOOD (Fit up to 130 km/h)
          36.0 - 45.0: FAIR (Maintenance planning recommended)
          > 45.0: MAINTENANCE_REQUIRED (Urgent tamping / packing required)
        """
        tqi_value = round(float(unevenness_sd + alignment_sd + twist_sd + gauge_sd), 2)

        if tqi_value <= 28.0:
            rating = "VERY_GOOD"
            action_recommended = "Routine monitoring; track geometry within prestige train tolerance."
            tamping_needed = False
        elif tqi_value <= 36.0:
            rating = "GOOD"
            action_recommended = "Normal operational condition; scheduled track inspection."
            tamping_needed = False
        elif tqi_value <= 45.0:
            rating = "FAIR"
            action_recommended = "Nominate section for CSM track tamping within next 30 days."
            tamping_needed = True
        else:
            rating = "MAINTENANCE_REQUIRED"
            action_recommended = "Urgent track tamping required; speed restriction caution order advised."
            tamping_needed = True

        return {
            'tqi_value': tqi_value,
            'rating': rating,
            'unevenness_sd': unevenness_sd,
            'alignment_sd': alignment_sd,
            'twist_sd': twist_sd,
            'gauge_sd': gauge_sd,
            'tamping_needed': tamping_needed,
            'action_recommended': action_recommended,
        }

    @staticmethod
    def calculate_risk_matrix_score(cof: int, lof: int, corridor_is_critical: bool = True) -> Dict[str, Any]:
        """
        International Asset Management Standard: Risk = Consequence of Failure (1-5) * Likelihood (1-5).
        Scores range from 1 to 25. Critical corridors receive a 1.25 multiplier with a 25 cap.
        Reference: docs/03-service-blueprints/06-assets.md (Section 6.2)
        """
        cof = max(1, min(5, int(cof)))
        lof = max(1, min(5, int(lof)))
        base_risk = cof * lof
        multiplier = 1.25 if corridor_is_critical else 1.00
        final_score = round(min(25.0, float(base_risk) * multiplier), 2)

        if final_score >= 16.0:
            category = "EXTREME_RISK"
            action = "IMMEDIATE_BLOCK_MANDATORY"
        elif final_score >= 10.0:
            category = "HIGH_RISK"
            action = "SCHEDULE_IN_WEEKLY_PLAN"
        elif final_score >= 5.0:
            category = "MEDIUM_RISK"
            action = "SCHEDULE_IN_MONTHLY_PLAN"
        else:
            category = "LOW_RISK"
            action = "ROUTINE_MONITORING"

        return {
            "cof": cof,
            "lof": lof,
            "base_risk": base_risk,
            "corridor_multiplier": multiplier,
            "final_risk_score": final_score,
            "category": category,
            "recommended_action": action,
        }

    @staticmethod
    def calculate_defect_aging_score(base_severity_score: float, overdue_days: int) -> float:
        """
        Overdue sleeping defects gain exponential priority to prevent critical neglect (Feature #93).
        Formula: FinalScore = BaseSeverity * exp(k * min(overdue_days, max_cap_days))
        Damping constant k = 0.035 ensures ~3x escalation at 30 days overdue.
        Reference: docs/03-service-blueprints/06-assets.md (Section 6.3)
        """
        if overdue_days <= 0:
            return round(float(base_severity_score), 2)
        k = 0.035
        capped_days = min(int(overdue_days), 60)
        aging_factor = math.exp(k * capped_days)
        escalated_score = float(base_severity_score) * aging_factor
        return round(min(100.0, escalated_score), 2)

    @classmethod
    def generate_why_explanation(cls, defect: AssetDefectLog, risk_data: Dict[str, Any], aging_score: float) -> str:
        """
        Synthesizes Explainable AI rationale for priority rank #1 card (Feature #94).
        Combines flaw physics, overdue aging days, traffic density and CoF x LoF matrix.
        Reference: docs/06-testing-qa/03-data-seeding.md
        """
        asset = defect.asset
        corridor = asset.corridor
        flaw_desc = defect.get_defect_type_display()
        overdue_str = f"{defect.overdue_days} days latent risk accumulation" if defect.overdue_days > 0 else "immediate safety hazard"

        return (
            f"{flaw_desc} on {asset.asset_tag} at KM {float(asset.location_km):.1f} ({corridor.name}) — "
            f"{overdue_str} (Aging Score {aging_score:.1f}) on high-density corridor + "
            f"CoF({risk_data['cof']}) × LoF({risk_data['lof']}) = {risk_data['final_risk_score']} "
            f"({risk_data['category']}). Action: {risk_data['recommended_action']}."
        )

    @classmethod
    def calculate_health_score(
        cls,
        asset: TrackAsset,
        new_defect: Optional[AssetDefectLog] = None,
        inspection_tqi: Optional[float] = None
    ) -> Decimal:
        """
        Calculates Asset Health / Degradation Score (0.0 to 100.0).
        100.0 = Brand New, < 40.0 = Critical Maintenance Required.
        Penalties:
          - CRITICAL_IMMEDIATE_STOP: -70.0 (forces score below 30.0)
          - IMPAIRMENT_SPEED_RESTRICTION: -35.0
          - MONITORING_REQUIRED: -10.0
          - Flaw depth mm penalty: min(40.0, flaw_depth_mm * 2.5)
          - TQI excess over 36.0: (TQI - 36.0) * 1.5
        """
        base_score = 100.0

        # Query all active (unrectified) defects for this asset
        active_defects = list(asset.defects.filter(is_rectified=False))
        if new_defect and new_defect not in active_defects:
            active_defects.append(new_defect)

        total_penalty = 0.0
        has_critical = False

        for d in active_defects:
            if d.severity == DefectSeverity.CRITICAL_IMMEDIATE_STOP:
                total_penalty += 70.0
                has_critical = True
            elif d.severity == DefectSeverity.IMPAIRMENT_SPEED_RESTRICTION:
                total_penalty += 35.0
            else:
                total_penalty += 10.0

            if d.flaw_depth_mm:
                depth_penalty = min(40.0, float(d.flaw_depth_mm) * 2.5)
                total_penalty += depth_penalty

        # TQI Penalty for permanent way assets
        current_tqi = float(inspection_tqi if inspection_tqi is not None else asset.tqi_index)
        if asset.asset_category == AssetCategory.PERMANENT_WAY and current_tqi > 36.0:
            total_penalty += (current_tqi - 36.0) * 1.5

        final_score = max(0.0, base_score - total_penalty)

        # Ensure critical flaws cap health score strictly at 25.0
        if has_critical:
            final_score = min(25.0, final_score)

        return Decimal(str(round(final_score, 2)))

    @classmethod
    def generate_emergency_block(cls, defect: AssetDefectLog) -> Optional[Block]:
        """
        TSK-P3-009: Automated Emergency Block Generation.
        Automatically provisions an immediate emergency block proposal in SVC-BLK
        when a critical rail defect, contact wire snap or points failure is registered.
        """
        asset = defect.asset
        corridor = asset.corridor
        now = timezone.now()

        # Map Asset Category to Work Type and Department
        if asset.asset_category == AssetCategory.PERMANENT_WAY:
            dept = DepartmentCode.ENG
            work_type = WorkType.TURNOUT_OVERHAUL if 'TURNOUT' in asset.sub_type.upper() else WorkType.RAIL_RENEWAL
        elif asset.asset_category == AssetCategory.OHE_TRACTION:
            dept = DepartmentCode.TRD
            work_type = WorkType.CATENARY_MAINTENANCE
        elif asset.asset_category in [AssetCategory.SIGNAL_INTERLOCKING, AssetCategory.TELECOM]:
            dept = DepartmentCode.SNT
            work_type = WorkType.SIGNAL_INTERLOCKING_TEST
        else:
            dept = DepartmentCode.ENG
            work_type = WorkType.TRACK_TAMPING

        loc_km = float(asset.location_km)
        # Provision 500m safety span surrounding the defect milepost
        start_km = round(max(float(corridor.start_km), loc_km - 0.5), 3)
        end_km = round(min(float(corridor.end_km), loc_km + 0.5), 3)

        # Unique emergency block code
        short_id = str(uuid.uuid4())[:8].upper()
        block_code = f"BLK-EMG-{short_id}"

        speed_restriction = defect.recommended_speed_restriction_kmh or 30
        caution_id = f"CO-EMG-{short_id[:6]}"

        emergency_block = Block.objects.create(
            block_code=block_code,
            corridor=corridor,
            line_type=asset.line_type,
            department_code=dept,
            work_type=work_type,
            start_km=start_km,
            end_km=end_km,
            scheduled_start_time=now,
            scheduled_end_time=now + timedelta(hours=2),
            status=BlockStatus.PENDING_APPROVAL,
            traction_power_cutoff_required=(asset.asset_category == AssetCategory.OHE_TRACTION),
            caution_order_id=caution_id,
            work_description=(
                f"[AUTOMATED EMERGENCY BLOCK] {defect.get_defect_type_display()} on {asset.asset_tag} "
                f"at KM {asset.location_km}. Flaw depth: {defect.flaw_depth_mm or 'N/A'}mm. "
                f"Source: {defect.detected_by_source}. Caution speed restriction: {speed_restriction} km/h."
            ),
        )

        # Link emergency block ID back to defect log
        defect.emergency_block_id = str(emergency_block.id)
        defect.block_recommended = True
        defect.save(update_fields=['emergency_block_id', 'block_recommended'])

        # Execute immediate spatial-temporal sweep to detect approaching prestige trains
        try:
            detector = ConflictDetector(emergency_block)
            detector.run_sweep()
        except Exception as exc:
            logger.warning(f"Conflict sweep on emergency block {emergency_block.block_code} failed: {exc}")

        # Broadcast event to Redis pub/sub channel events:assets
        try:
            import redis
            redis_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/0')
            r = redis.from_url(redis_url)
            event_payload = {
                "event_type": "assets.critical_defect.detected",
                "defect_id": str(defect.id),
                "asset_tag": asset.asset_tag,
                "defect_type": defect.defect_type,
                "severity": defect.severity,
                "location_km": float(asset.location_km),
                "corridor_code": corridor.code,
                "emergency_block_id": str(emergency_block.id),
                "emergency_block_code": emergency_block.block_code,
                "caution_speed_kmh": speed_restriction,
            }
            r.publish('events:assets', json.dumps(event_payload))
        except Exception as pub_err:
            logger.debug(f"Redis publish skipped/non-fatal: {pub_err}")

        # Broadcast real-time WebSocket EMERGENCY_ALERT frame across Daphne ASGI (TSK-P3-03-BE)
        cls.broadcast_emergency_alert(defect, emergency_block)

        logger.info(f"Automated Emergency Block {emergency_block.block_code} created for defect {defect.defect_code}")
        return emergency_block

    @classmethod
    def broadcast_emergency_alert(cls, defect: AssetDefectLog, emergency_block: Block) -> Dict[str, Any]:
        """
        TSK-P3-03-BE: Real-Time WebSocket broadcast of EMERGENCY_ALERT payload
        across Daphne ASGI / Redis channel layer groups:
        - `corridor_{corridor_code.lower()}`
        - `corridor_all`
        - `emergency_all`
        - `notifications_general`
        - `role_coa`, `dept_eng`, `dept_trd`, `dept_snt`
        Also persists in-app notification in SVC-NOTIF with CRITICAL_ALARM priority.
        """
        asset = defect.asset
        corridor = asset.corridor
        speed_restriction = defect.recommended_speed_restriction_kmh or 30

        alert_id = f"EMG-{str(uuid.uuid4())[:8].upper()}"
        flaw_name = defect.get_defect_type_display() if hasattr(defect, 'get_defect_type_display') else defect.defect_type
        title = "CRITICAL USFD TRACK HALT DECLARED"
        message = (
            f"Ultrasonic Flaw Detector (USFD) confirmed {flaw_name} on {asset.asset_tag} "
            f"at KM {float(asset.location_km):.1f} ({corridor.name}). Automated emergency possession "
            f"{emergency_block.block_code} active with 500m safety buffer. Speed restricted to {speed_restriction} km/h."
        )

        payload = {
            "type": "EMERGENCY_ALERT",
            "priority": "CRITICAL_ALARM",
            "id": alert_id,
            "title": title,
            "message": message,
            "corridor": corridor.code,
            "corridor_code": corridor.code,
            "km_location": float(asset.location_km),
            "kmLocation": float(asset.location_km),
            "block_id": str(emergency_block.id),
            "block_code": emergency_block.block_code,
            "defect_id": str(defect.id),
            "defect_code": defect.defect_code,
            "defect_type": defect.defect_type,
            "severity": defect.severity,
            "caution_speed_kmh": speed_restriction,
            "flaw_depth_mm": float(defect.flaw_depth_mm) if defect.flaw_depth_mm else None,
            "risk_score": float(defect.final_risk_score) if defect.final_risk_score else 25.0,
            "risk_category": defect.risk_category or "EXTREME_RISK",
            "timestamp": timezone.now().isoformat(),
            "extra_data": {
                "caution_order_id": emergency_block.caution_order_id,
                "start_km": float(emergency_block.start_km),
                "end_km": float(emergency_block.end_km),
                "line_type": emergency_block.line_type,
            }
        }

        # 1. Broadcast via Django Channels / Daphne ASGI
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            if channel_layer:
                groups = [
                    f"corridor_{corridor.code.lower()}",
                    "corridor_all",
                    "emergency_all",
                    "notifications_general",
                    "role_coa",
                    "dept_eng",
                    "dept_trd",
                    "dept_snt",
                ]
                # Sub-corridor trunk prefix
                parts = corridor.code.lower().split('-')
                if len(parts) > 2:
                    groups.append(f"corridor_{'-'.join(parts[:-1])}")

                for group in set(groups):
                    try:
                        async_to_sync(channel_layer.group_send)(
                            group,
                            {
                                "type": "emergency_alert",
                                "data": payload,
                            }
                        )
                    except Exception as grp_err:
                        logger.warning(f"Error sending emergency_alert to group {group}: {grp_err}")
                logger.info(f"EMERGENCY_ALERT payload broadcasted to groups: {list(set(groups))}")
        except Exception as ch_err:
            logger.warning(f"Channel layer emergency broadcast failed: {ch_err}")

        # 2. Persist in-app Notification record in database
        try:
            from apps.notifications.models import Notification, NotificationPriority, NotificationCategory
            Notification.objects.create(
                recipient_role='ALL',
                priority=NotificationPriority.CRITICAL_ALARM,
                category=NotificationCategory.CRITICAL_DEFECT_DETECTED,
                title=title,
                message_body=message,
                target_entity_type='BLOCK',
                target_entity_id=str(emergency_block.id),
            )
        except Exception as notif_err:
            logger.warning(f"Failed to log in-app notification: {notif_err}")

        return payload

    @classmethod
    def register_defect(cls, asset: TrackAsset, defect_data: Dict[str, Any]) -> Tuple[AssetDefectLog, Optional[Block]]:
        """
        Registers a defect log, recalibrates asset health score, evaluates CoF x LoF risk matrix & aging score,
        and generates an emergency block if severity is CRITICAL_IMMEDIATE_STOP, flaw > 12mm, or final_risk_score >= 16.0.
        """
        defect_code = defect_data.get('defect_code') or f"DEF-{str(uuid.uuid4())[:8].upper()}"
        flaw_depth = defect_data.get('flaw_depth_mm')
        severity = defect_data.get('severity', DefectSeverity.IMPAIRMENT_SPEED_RESTRICTION)

        # Automatic severity escalation if ultrasonic flaw depth exceeds 12mm (IMR threshold)
        if flaw_depth and float(flaw_depth) > 12.0:
            severity = DefectSeverity.CRITICAL_IMMEDIATE_STOP

        # CoF and LoF default evaluation
        cof_input = defect_data.get('cof_score') or defect_data.get('cof')
        lof_input = defect_data.get('lof_score') or defect_data.get('lof')
        overdue_days = int(defect_data.get('overdue_days', 0))

        if cof_input is not None:
            cof = int(cof_input)
        else:
            cof = 5 if severity == DefectSeverity.CRITICAL_IMMEDIATE_STOP else (4 if severity == DefectSeverity.IMPAIRMENT_SPEED_RESTRICTION else 3)

        if lof_input is not None:
            lof = int(lof_input)
        else:
            lof = 5 if severity == DefectSeverity.CRITICAL_IMMEDIATE_STOP else (3 if severity == DefectSeverity.IMPAIRMENT_SPEED_RESTRICTION else 2)

        is_critical_corridor = getattr(asset.corridor, 'is_critical', True)
        risk_info = cls.calculate_risk_matrix_score(cof, lof, is_critical_corridor)

        defect = AssetDefectLog.objects.create(
            defect_code=defect_code,
            asset=asset,
            defect_type=defect_data.get('defect_type', DefectType.INTERNAL_RAIL_FRACTURE),
            severity=severity,
            detected_by_source=defect_data.get('detected_by_source', 'USFD_ULTRASONIC'),
            flaw_depth_mm=flaw_depth,
            recommended_speed_restriction_kmh=defect_data.get('recommended_speed_restriction_kmh'),
            block_recommended=defect_data.get('block_recommended', False) or (risk_info['final_risk_score'] >= 16.0),
            cof_score=cof,
            lof_score=lof,
            overdue_days=overdue_days,
            description=defect_data.get('description', ''),
        )

        # Recalculate health score
        new_health = cls.calculate_health_score(asset, new_defect=defect)
        asset.current_health_score = new_health
        asset.last_inspected_at = timezone.now()
        asset.save(update_fields=['current_health_score', 'last_inspected_at'])

        emergency_block = None
        is_critical = (
            (severity == DefectSeverity.CRITICAL_IMMEDIATE_STOP) or 
            (flaw_depth and float(flaw_depth) > 12.0) or
            (risk_info['final_risk_score'] >= 16.0)
        )
        if is_critical or defect.block_recommended:
            emergency_block = cls.generate_emergency_block(defect)

        return defect, emergency_block

    @classmethod
    def get_maintenance_recommendations(cls, corridor_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        FUNC-AST-003: Queries all assets with health_score < 40.0 or TQI > 45.0
        or active unrectified defects, returning structured maintenance block recommendations.
        """
        queryset = TrackAsset.objects.select_related('corridor').prefetch_related('defects')
        if corridor_id:
            queryset = queryset.filter(corridor__id=corridor_id)

        recommendations = []
        for asset in queryset:
            if asset.needs_maintenance or asset.defects.filter(is_rectified=False, block_recommended=True).exists():
                active_defects = list(asset.defects.filter(is_rectified=False))
                critical_defects = [d for d in active_defects if d.severity == DefectSeverity.CRITICAL_IMMEDIATE_STOP]

                urgency = "CRITICAL_EMERGENCY" if critical_defects else ("HIGH" if float(asset.current_health_score) < 40.0 else "MEDIUM")
                suggested_work = (
                    WorkType.RAIL_RENEWAL if asset.asset_category == AssetCategory.PERMANENT_WAY
                    else (WorkType.CATENARY_MAINTENANCE if asset.asset_category == AssetCategory.OHE_TRACTION else WorkType.TRACK_TAMPING)
                )

                recommendations.append({
                    'asset_id': str(asset.id),
                    'asset_tag': asset.asset_tag,
                    'corridor_code': asset.corridor.code,
                    'corridor_name': asset.corridor.name,
                    'location_km': float(asset.location_km),
                    'line_type': asset.line_type,
                    'asset_category': asset.asset_category,
                    'current_health_score': float(asset.current_health_score),
                    'tqi_index': float(asset.tqi_index),
                    'urgency': urgency,
                    'suggested_work_type': suggested_work,
                    'active_defects_count': len(active_defects),
                    'recommended_span': {
                        'start_km': round(max(float(asset.corridor.start_km), float(asset.location_km) - 0.5), 3),
                        'end_km': round(min(float(asset.corridor.end_km), float(asset.location_km) + 0.5), 3),
                    }
                })

        return recommendations
