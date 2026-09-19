import os
import json
import random
from django.conf import settings
from apps.demo.coherence import CoherenceEngine

DEFAULT_SEED = 26027

class OperationalMode:
    SEED = 'SEED'
    RANDOM = 'RANDOM'
    STREAM = 'STREAM'
    SCENARIO = 'SCENARIO'


class BaseDataGenerator:
    """
    Base class for all demo data generators in the Indian Railways AI Platform (PS 26027).
    Enforces operational modes: SEED (26027), RANDOM, STREAM, and SCENARIO,
    with guaranteed adherence to the 7 Coherence Rules.
    """
    def __init__(self, master_data=None, mode=OperationalMode.SEED, seed=DEFAULT_SEED):
        self.mode = mode
        self.seed = seed if mode == OperationalMode.SEED else None
        self.rng = random.Random(self.seed) if self.seed is not None else random.Random()
        
        self.master_data = master_data or self._load_master_data()
        self.coherence_engine = CoherenceEngine(self.master_data)

    def _load_master_data(self):
        """Loads the authoritative master data from apps/demo/master_data/"""
        base_dir = None
        try:
            base_dir = getattr(settings, 'BASE_DIR', None)
        except Exception:
            pass

        if not base_dir:
            # Compute 3 levels up from apps/demo/generators/base.py
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

        master_dir = os.path.join(base_dir, 'apps', 'demo', 'master_data')
        data = {

            'stations': [],
            'trains': [],
            'users': [],
            'assets': [],
            'corridor': {
                'code': 'NDLS-CNB-MAIN',
                'start_km': 0.0,
                'end_km': 440.2,
                'total_length_km': 440.2
            }
        }
        for key in ['stations', 'trains', 'users', 'assets']:
            filepath = os.path.join(master_dir, f'{key}.json')
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data[key] = json.load(f)
                except Exception:
                    data[key] = []
        return data

    def set_mode(self, mode, seed=None):
        """Switches the generator operational mode."""
        self.mode = mode
        if mode == OperationalMode.SEED:
            self.seed = seed or DEFAULT_SEED
            self.rng = random.Random(self.seed)
        else:
            self.seed = None
            self.rng = random.Random()

    def generate(self, count=1, **kwargs):
        raise NotImplementedError("Subclasses must implement generate()")
