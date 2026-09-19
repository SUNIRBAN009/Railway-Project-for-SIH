class SeedValidator:
    """
    Rule 7: Fixed Seed Determinism (Seed 26027).
    Enforces deterministic reproducibility for SIH PS 26027 demonstration workflows.
    """
    GOLDEN_SEED = 26027

    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation

        seed = block.get('seed')
        if seed is not None:
            if not isinstance(seed, int) or seed < 0:
                raise CoherenceViolation(f"Seed Invariant Error: Seed must be a non-negative integer, got '{seed}'")
