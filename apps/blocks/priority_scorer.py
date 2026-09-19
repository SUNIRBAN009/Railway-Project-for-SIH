from apps.accounts.models import DepartmentCode
from apps.blocks.models import Block, WorkType

class PriorityScorer:
    """
    Expert System: Multi-factor heuristic engine for Priority Scoring.
    Assigns a priority score (0-100) based on Dept, Work Type, Urgency, and Passenger Impact.
    """
    
    DEPT_WEIGHTS = {
        DepartmentCode.ENG: 30,  # Track maintenance is highly critical
        DepartmentCode.TRD: 25,  # Overhead equipment is second
        DepartmentCode.SNT: 20,  # Signal and Telecom
    }

    WORK_TYPE_WEIGHTS = {
        WorkType.TRACK_TAMPING: 25,
        WorkType.BALLAST_CLEANING: 20,
        WorkType.RAIL_RENEWAL: 30,
        WorkType.OHE_INSPECTION: 15,
        WorkType.CATENARY_MAINTENANCE: 25,
        WorkType.SIGNAL_INTERLOCKING_TEST: 25,
        WorkType.TURNOUT_OVERHAUL: 30,
    }

    @classmethod
    def score_block(cls, block: Block) -> dict:
        """
        Calculates priority score for a maintenance block.
        Returns dict with score and rationale.
        """
        score = 0
        rationale = []

        # 1. Department Base Weight
        dept_score = cls.DEPT_WEIGHTS.get(block.department_code, 10)
        score += dept_score
        rationale.append(f"Department Base ({block.department_code}): +{dept_score}")

        # 2. Work Type Weight
        work_score = cls.WORK_TYPE_WEIGHTS.get(block.work_type, 10)
        score += work_score
        rationale.append(f"Work Type ({block.work_type}): +{work_score}")

        # 3. Urgency/Condition (Heuristic based on work description)
        desc = block.work_description.lower()
        if 'emergency' in desc or 'fracture' in desc or 'breakdown' in desc:
            score += 40
            rationale.append("Emergency Condition Detected: +40")
        elif 'urgent' in desc:
            score += 20
            rationale.append("Urgent Condition Detected: +20")
        else:
            score += 5
            rationale.append("Routine Maintenance: +5")
            
        # Cap score at 100
        final_score = min(score, 100)

        return {
            'score': final_score,
            'rationale': rationale
        }
    
    @classmethod
    def score_train(cls, train_type: str) -> dict:
        """
        Calculates priority score for a train path collision.
        """
        score = 0
        rationale = []

        if train_type == 'PRESTIGE':
            score = 100
            rationale.append("Prestige Train (Rajdhani/Shatabdi/Vande Bharat): +100")
        elif train_type == 'EXPRESS':
            score = 75
            rationale.append("Express Passenger Train: +75")
        elif train_type == 'FREIGHT':
            score = 40
            rationale.append("Freight/Goods Train: +40")
        else:
            score = 20
            rationale.append("Other Train: +20")

        return {
            'score': score,
            'rationale': rationale
        }
