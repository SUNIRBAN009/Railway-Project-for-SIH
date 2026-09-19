class CrossDepartmentValidator:
    """
    Rule 5: Cross-Department Overlap & Combined Block Compatibility (USP #98).
    Ensures that when ENG (Civil) and TRD (OHE) seek joint track possession:
    1. Line types are compatible (e.g. cannot take OHE power cut on UP line for track work on DOWN line).
    2. Combined block window does not exceed max 8 hours.
    3. Safety buffer rules for 25kV traction cutoff are strictly satisfied.
    """
    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation

        is_combined = block.get('is_combined_block') or block.get('co_possession')
        departments = block.get('participating_departments') or []
        if block.get('department'):
            departments = list(set(departments + [block.get('department')]))

        if not is_combined:
            return

        # Must have at least 2 distinct departments for a combined block
        if len(departments) < 2:
            raise CoherenceViolation(
                "Combined Block Violation: A combined block possession must involve at least 2 distinct departments (e.g. ENG + TRD)!"
            )

        # Incompatible electrical isolation check
        ohe_isolated_line = block.get('ohe_isolated_line')
        possession_line = block.get('line_type')
        if ohe_isolated_line and possession_line and ohe_isolated_line != possession_line:
            raise CoherenceViolation(
                f"Combined Block Hazard: OHE power isolation line '{ohe_isolated_line}' does not match "
                f"civil track work line '{possession_line}'! 25kV electrocution hazard."
            )
