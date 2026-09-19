class AssetTripletValidator:
    """
    Rule 6: Unified Asset ID Triplet Mapping (TMS / SMMS / TDMS).
    Enforces cross-system digital twin mapping across Indian Railways engineering subsystems.
    Any asset or block referencing an asset must preserve valid triplet identifiers.
    """
    def validate(self, block, master_data, existing_blocks=None):
        from . import CoherenceViolation

        asset = block.get('asset') or block.get('asset_details')
        if not asset and isinstance(block.get('linked_asset'), dict):
            asset = block.get('linked_asset')

        if not asset:
            # Check if block has direct triplet fields
            tms = block.get('tms_id')
            smms = block.get('smms_id')
            tdms = block.get('tdms_id')
        else:
            tms = asset.get('tms_id')
            smms = asset.get('smms_id')
            tdms = asset.get('tdms_id')

        # Validate format prefixes if provided
        if tms and not tms.startswith('TMS-'):
            raise CoherenceViolation(f"Asset Triplet Error: Invalid TMS ID format '{tms}' (must start with 'TMS-')")
        if smms and not smms.startswith('SMMS-'):
            raise CoherenceViolation(f"Asset Triplet Error: Invalid SMMS ID format '{smms}' (must start with 'SMMS-')")
        if tdms and not tdms.startswith('TDMS-'):
            raise CoherenceViolation(f"Asset Triplet Error: Invalid TDMS ID format '{tdms}' (must start with 'TDMS-')")

        # Check for bogus or corrupted asset IDs
        asset_id = block.get('asset_id') or (asset.get('asset_tag') if asset else None)
        if asset_id and (asset_id.startswith('CORRUPT_') or asset_id == 'UNKNOWN'):
            raise CoherenceViolation(f"Asset Integrity Error: Unregistered or corrupt asset '{asset_id}'")
