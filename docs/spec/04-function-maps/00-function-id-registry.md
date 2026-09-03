# 00-function-id-registry.md

> **File Order:** 25/45  
> **Previous File:** `03-service-blueprints/08-notifications-service.md`  
> **Next File:** `04-function-maps/01-consolidated-function-map.md`  

---

### Function ID Registry

To maintain traceability between business requirements, test cases, and source code, we assign unique Function IDs (FIDs) to core operations.

**Format:** `FID-[SVC]-[NUM]`
- `[SVC]`: The 3-letter abbreviation of the Django app (e.g., `ACC`, `BLK`, `ONT`).
- `[NUM]`: A 3-digit sequence.

---

### Registered Functions

| Function ID | App | Function Name | Class/File | Priority |
|-------------|-----|---------------|------------|----------|
| **FID-ACC-001** | `accounts` | `authenticate_user()` | `AuthService` | High |
| **FID-ACC-002** | `accounts` | `blacklist_token()` | `AuthService` | Medium |
| **FID-BLK-001** | `blocks` | `create_block()` | `BlockService` | Critical |
| **FID-BLK-002** | `blocks` | `approve_block()` | `BlockService` | Critical |
| **FID-BLK-003** | `blocks` | `detect_overlaps()` | `ConflictEngine` | Critical |
| **FID-BLK-004** | `blocks` | `resolve_conflict_ai()` | `AIResolverService` | High |
| **FID-ONT-001** | `ontology` | `sync_block_event()` | `DigitalTwinManager` | High |
| **FID-ONT-002** | `ontology` | `run_reasoner()` | `DigitalTwinManager` | High |
| **FID-ONT-003** | `ontology` | `get_affected_trains()`| `SPARQLExecutor` | High |
| **FID-TRN-001** | `trains` | `calculate_impact()` | `TrainImpactService`| Medium |
| **FID-DEP-001** | `departments`| `find_nearest_available_crew()`| `CrewAssignmentService`| Medium |
| **FID-DEP-002** | `departments`| `lock_crew_for_block()`| `CrewAssignmentService`| Medium |
| **FID-AST-001** | `assets` | `validate_km_range()` | `AssetService` | High |
| **FID-ANA-001** | `analytics` | `calculate_block_impact()`| `ImpactCalculatorService`| Medium |
| **FID-NOT-001** | `notifications`| `send_sms()` | `TwilioService` | Critical |
| **FID-NOT-002** | `notifications`| `broadcast()` | `WebSocketService`| Critical |
