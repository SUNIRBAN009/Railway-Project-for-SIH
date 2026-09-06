import math
from typing import List, Dict, Any, Optional
from decimal import Decimal
from apps.trains.models import Train, TrainType


class DelayCascadeEngine:
    """
    Mathematical Delay Cascade Propagation Simulator (FUNC-TRN-004).
    Authoritative reference: docs/04-function-maps/05-trains-function-map.md

    Models:
      1. Normal running time at standard line speed (V_0).
      2. Caution order / speed restriction travel time (V_caution).
      3. Lost time due to deceleration & acceleration (T_acc_dec = 3.0 min).
      4. Auto-signaling headway ripple (Headway_min = 5.0 min).
    """

    ACC_DEC_LOST_TIME_MINUTES = 3.0
    MIN_HEADWAY_MINUTES = 5.0
    DEFAULT_NORMAL_SPEED_KMH = 130.0

    def __init__(
        self,
        corridor_length_km: float,
        imposed_speed_restriction_kmh: float,
        affected_train_ids: Optional[List[str]] = None,
        block_id: Optional[str] = None
    ):
        self.corridor_length_km = float(corridor_length_km)
        self.imposed_speed_restriction_kmh = max(5.0, float(imposed_speed_restriction_kmh))
        self.affected_train_ids = affected_train_ids or []
        self.block_id = block_id

    def calculate_lead_delay(self, normal_speed_kmh: Optional[float] = None) -> float:
        """
        Calculates delta T for lead train traversing the speed restriction:
          T_0 = (L / V_0) * 60
          T_caution = (L / V_caution) * 60
          Delta_T = (T_caution - T_0) + T_acc_dec
        """
        v_0 = float(normal_speed_kmh) if normal_speed_kmh else self.DEFAULT_NORMAL_SPEED_KMH
        v_caution = self.imposed_speed_restriction_kmh

        t_0 = (self.corridor_length_km / v_0) * 60.0
        t_caution = (self.corridor_length_km / v_caution) * 60.0

        net_delay = (t_caution - t_0) + self.ACC_DEC_LOST_TIME_MINUTES
        return max(0.0, net_delay)

    def simulate(self) -> Dict[str, Any]:
        """
        Executes cascade simulation across lead train and trailing paths.
        Returns DelaySimulationResponseDTO data dictionary.
        """
        trains = []
        if self.affected_train_ids:
            # Query active affected trains in order of priority or appearance
            trains = list(
                Train.objects.filter(id__in=self.affected_train_ids)
                .order_by('priority_rank')
            )

        # If no explicit train IDs were passed or found, provide sample cohort
        if not trains:
            trains = list(Train.objects.all().order_by('priority_rank')[:4])

        lead_train_delay = self.calculate_lead_delay()
        train_breakdown = []
        total_passenger_delay = 0.0
        total_freight_delay = 0.0

        accumulated_cascade = lead_train_delay
        # Progressive headway separation between successive scheduled trains (minutes)
        simulated_headways = [0.0, 7.0, 4.0, 8.0, 3.5, 6.0]

        for idx, trn in enumerate(trains):
            is_lead = (idx == 0)
            if is_lead:
                added_delay = lead_train_delay
            else:
                hw = simulated_headways[idx] if idx < len(simulated_headways) else 6.0
                # Cascade delay formula: D_trailing = max(0, D_lead - (Headway_actual - 5.0))
                headway_slack = hw - self.MIN_HEADWAY_MINUTES
                added_delay = max(0.0, accumulated_cascade - headway_slack)
                accumulated_cascade = added_delay

            added_delay_rounded = round(added_delay, 1)

            # Categorize passenger vs freight
            if trn.is_freight:
                total_freight_delay += added_delay_rounded
                action = "Regulate freight rake on Loop Line / Siding to prioritize passenger paths."
            else:
                total_passenger_delay += added_delay_rounded
                if added_delay_rounded > 15.0:
                    action = "Caution Order emitted to Loco Pilot. Dispatch Section Controller alert."
                elif added_delay_rounded > 5.0:
                    action = "Minor regulation. Absorb within slack running time."
                else:
                    action = "Proceed at Caution Speed. Minimal timetable perturbation."

            train_breakdown.append({
                'train_id': str(trn.id),
                'train_number': trn.train_number,
                'train_name': trn.train_name,
                'train_type': trn.train_type,
                'priority_rank': trn.priority_rank,
                'added_delay_minutes': added_delay_rounded,
                'is_lead_train': is_lead,
                'recommended_action': action,
            })

        # Lead delay rounded
        lead_delay_rounded = round(lead_train_delay, 1)

        # Punctuality Index Drop: 0.15% drop per 2 minutes of passenger delay
        pct_drop = round(min(15.0, (total_passenger_delay / 2.0) * 0.15), 1)

        # Smart Dispatch Recommendation
        if total_freight_delay > 20.0:
            rec = "Recommendation: Divert trailing Freight Rakes via Loop Line 2 at Khurja Junction to safeguard Rajdhani/Vande Bharat paths."
        elif total_passenger_delay > 15.0:
            rec = "Recommendation: Impose speed restriction during 01:30 - 04:30 AM maintenance window to minimize passenger headway compression."
        else:
            rec = "Recommendation: Normal caution order adequate. Headway margins sufficient for automatic recovery."

        return {
            'block_id': self.block_id,
            'corridor_length_km': self.corridor_length_km,
            'imposed_speed_restriction_kmh': self.imposed_speed_restriction_kmh,
            'lead_train_delay_minutes': lead_delay_rounded,
            'total_passenger_delay_minutes': round(total_passenger_delay, 1),
            'total_freight_delay_minutes': round(total_freight_delay, 1),
            'punctuality_index_drop_percent': pct_drop,
            'rerouting_recommendation': rec,
            'train_breakdown': train_breakdown,
        }
