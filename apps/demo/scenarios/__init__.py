from .base_scenario import BaseScenario
from .morning_dashboard import MorningDashboardScenario
from .eng_vs_trd_conflict import EngVsTrdConflictScenario
from .rajdhani_delay_cascade import RajdhaniDelayCascadeScenario
from .zero_fatality_safety import ZeroFatalitySafetyScenario

SCENARIO_REGISTRY = {
    'morning_dashboard': MorningDashboardScenario,
    'eng_vs_trd_conflict': EngVsTrdConflictScenario,
    'rajdhani_delay_cascade': RajdhaniDelayCascadeScenario,
    'zero_fatality_safety': ZeroFatalitySafetyScenario,
}

def get_scenario(key: str, live_mode: bool = False, broadcast: bool = True) -> BaseScenario:
    scenario_cls = SCENARIO_REGISTRY.get(key)
    if not scenario_cls:
        raise ValueError(f"Scenario '{key}' not found. Available: {list(SCENARIO_REGISTRY.keys())}")
    return scenario_cls(live_mode=live_mode, broadcast=broadcast)
