from .base_scenario import BaseScenario
from .eng_vs_trd_conflict import EngVsTrdConflictScenario
from .rajdhani_delay_cascade import RajdhaniDelayCascadeScenario

SCENARIO_REGISTRY = {
    'eng_vs_trd_conflict': EngVsTrdConflictScenario,
    'rajdhani_delay_cascade': RajdhaniDelayCascadeScenario
}
