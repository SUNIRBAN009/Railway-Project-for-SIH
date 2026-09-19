import time
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from django.utils import timezone

class BaseScenario(ABC):
    """
    Base class for all demo presentation scenarios.
    Handles step-by-step logging, DB state tracking, audio triggers,
    and simulated/real-time WebSocket broadcasting.
    """
    key: str = "base"
    name: str = "Base Scenario"
    description: str = ""
    duration_minutes: int = 3
    target_corridor: str = "NDLS-CNB-MAIN"

    def __init__(self, live_mode: bool = False, broadcast: bool = True):
        self.live_mode = live_mode
        self.broadcast = broadcast
        self.steps_executed: List[Dict[str, Any]] = []
        self.events_broadcasted: List[Dict[str, Any]] = []

    @abstractmethod
    def setup(self) -> Dict[str, Any]:
        """Initialize necessary preconditions and database records."""
        pass

    @abstractmethod
    def execute(self) -> List[Dict[str, Any]]:
        """Run the end-to-end scenario flow and record all steps."""
        pass

    def log(self, message: str):
        timestamp = timezone.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{self.key.upper()}] {message}")

    def wait(self, seconds: float):
        if self.live_mode:
            time.sleep(seconds)

    def log_step(
        self,
        step_number: int,
        title: str,
        narrative: str,
        details: Optional[Dict[str, Any]] = None,
        event_type: Optional[str] = None,
        event_payload: Optional[Dict[str, Any]] = None,
        audio_cue: Optional[str] = None,
        map_focus: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Record a structured step in the scenario execution history.
        Includes narration, UI state hints, map camera targets, and audio cues.
        """
        timestamp = timezone.now().isoformat()
        step_data = {
            "step": step_number,
            "title": title,
            "narrative": narrative,
            "timestamp": timestamp,
            "details": details or {},
            "event_type": event_type,
            "event_payload": event_payload or {},
            "audio_cue": audio_cue or "notification",
            "map_focus": map_focus or {"km": 14.8, "zoom": 13}
        }
        self.steps_executed.append(step_data)
        self.log(f"Step {step_number}: {title} — {narrative[:80]}...")

        if event_type and self.broadcast:
            self.broadcast_event(event_type, event_payload or {})

        return step_data

    def broadcast_event(self, event_type: str, payload: Dict[str, Any], corridor_code: Optional[str] = None):
        corridor = corridor_code or self.target_corridor
        event = {
            "event_type": event_type,
            "corridor": corridor,
            "payload": payload,
            "timestamp": timezone.now().isoformat()
        }
        self.events_broadcasted.append(event)
        self.log(f"[BROADCAST] {event_type} on {corridor} -> {str(payload)[:100]}")

        # Daphne ASGI channels / Redis pub-sub integration
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"corridor_{corridor}",
                    {
                        "type": "corridor.event",
                        "data": event
                    }
                )
        except Exception:
            pass

    def to_dict(self) -> Dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "description": self.description,
            "duration_minutes": self.duration_minutes,
            "target_corridor": self.target_corridor,
            "steps_count": len(self.steps_executed),
            "steps": self.steps_executed,
            "events_count": len(self.events_broadcasted),
            "events": self.events_broadcasted
        }
