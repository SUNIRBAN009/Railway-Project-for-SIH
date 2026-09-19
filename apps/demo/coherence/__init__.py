class CoherenceViolation(Exception):
    """Exception raised for violations of railway operational rules."""
    pass

class BaseValidator:
    def validate(self, block, master_data, existing_blocks=None):
        raise NotImplementedError

from .geography_validator import GeographyValidator
from .time_validator import TimeValidator
from .resource_validator import ResourceValidator
from .train_block_validator import TrainBlockValidator

class CoherenceEngine:
    """
    Enforces the 7 immutable railway rules.
    Prevents invalid demo data from being seeded into the system.
    """
    def __init__(self, master_data):
        self.master_data = master_data
        self.validators = [
            GeographyValidator(),
            TimeValidator(),
            ResourceValidator(),
            TrainBlockValidator()
        ]

    def validate_block(self, block, existing_blocks=None):
        for validator in self.validators:
            validator.validate(block, self.master_data, existing_blocks)
        return True
