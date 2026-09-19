class CoherenceViolation(Exception):
    """Exception raised for violations of immutable railway operational rules."""
    def __init__(self, message, rule_number=None, details=None):
        super().__init__(message)
        self.message = message
        self.rule_number = rule_number
        self.details = details or {}


class BaseValidator:
    def validate(self, block, master_data, existing_blocks=None):
        raise NotImplementedError


from .geography_validator import GeographyValidator
from .time_validator import TimeValidator
from .resource_validator import ResourceValidator
from .train_block_validator import TrainBlockValidator
from .cross_department_validator import CrossDepartmentValidator
from .asset_triplet_validator import AssetTripletValidator
from .seed_validator import SeedValidator


class CoherenceEngine:
    """
    Enforces the 7 immutable railway rules for SIH PS 26027.
    Guarantees that 100% of generated and submitted maintenance block requests
    are physically feasible, temporally coherent, and safe.
    """
    def __init__(self, master_data=None):
        self.master_data = master_data or {}
        self.validators = [
            GeographyValidator(),        # Rule 1: Geography Bounds (0.0 to 440.2 km)
            TimeValidator(),             # Rule 2: Time Ordering (start < end, duration <= 8h)
            ResourceValidator(),         # Rule 3: Resource Exclusivity & 40km/h travel physics
            TrainBlockValidator(),       # Rule 4: Train-Block Exclusion for Sanctions
            CrossDepartmentValidator(),  # Rule 5: Cross-Department Combined Block (USP #98)
            AssetTripletValidator(),     # Rule 6: Unified Asset ID Triplets (TMS/SMMS/TDMS)
            SeedValidator(),             # Rule 7: Fixed Seed 26027 Determinism
        ]

    def validate_block(self, block, existing_blocks=None):
        for validator in self.validators:
            validator.validate(block, self.master_data, existing_blocks)
        return True

    def validate_all(self, blocks, existing_blocks=None):
        curr_existing = list(existing_blocks or [])
        for block in blocks:
            self.validate_block(block, curr_existing)
            curr_existing.append(block)
        return True
