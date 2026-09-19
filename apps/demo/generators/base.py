import random
from apps.demo.coherence import CoherenceEngine

class BaseDataGenerator:
    """Base class for all demo data generators."""
    def __init__(self, master_data, seed=None):
        self.master_data = master_data
        if seed is not None:
            random.seed(seed)
        self.coherence_engine = CoherenceEngine(master_data)

    def generate(self, count=1, **kwargs):
        raise NotImplementedError
