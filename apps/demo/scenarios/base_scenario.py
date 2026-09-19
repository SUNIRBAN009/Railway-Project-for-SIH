import time
from abc import ABC, abstractmethod
from typing import Dict, Any
from django.utils import timezone
# In a real setup, we would import the broadcaster
# from apps.notifications.services.ws_broadcaster import get_ws_broadcaster

class BaseScenario(ABC):
    """
    Base class for all demo presentation scenarios.
    Handles logging, delays for live feeling, and simulated broadcasting.
    """
    name: str = "Base Scenario"
    description: str = ""
    duration_minutes: int = 5

    def __init__(self, live_mode: bool = False, broadcast: bool = True):
        self.live_mode = live_mode
        self.broadcast = broadcast
        # self.broadcaster = get_ws_broadcaster() if broadcast else None

    @abstractmethod
    def setup(self):
        pass

    @abstractmethod
    def execute(self):
        pass

    def log(self, message: str):
        timestamp = timezone.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")

    def wait(self, seconds: float):
        if self.live_mode:
            time.sleep(seconds)

    def broadcast_event(self, event_type: str, payload: Dict[str, Any], corridor_code: str = "NDLS-CNB-MAIN"):
        if self.broadcast:
            # Simulate broadcasting
            # self.broadcaster.broadcast_to_corridor(...)
            self.log(f"[BROADCAST] {event_type} -> {payload}")
