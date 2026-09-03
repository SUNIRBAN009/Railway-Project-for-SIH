# 01-consolidated-function-map.md

> **File Order:** 26/45  
> **Previous File:** `04-function-maps/00-function-id-registry.md`  
> **Next File:** `05-deep-dive-logs/00-readme.md`  

---

### Consolidated Function Map

To avoid redundant boilerplate files for all 8 microservices, this document provides the mapping between the functional requirements, the user roles that can trigger them, and the specific Python implementation class.

This map serves as a quick-reference guide for QA engineers to know which methods to test for which roles.

---

### 1. User & Identity (`accounts`)

| FID | Trigger | Method | Implementation | Permissions |
|-----|---------|--------|----------------|-------------|
| **FID-ACC-001** | User enters credentials | `POST /api/v1/auth/login/` | `AuthService.authenticate_user()` | Public |
| **FID-ACC-002** | User clicks Logout | `POST /api/v1/auth/logout/` | `AuthService.blacklist_token()` | Authenticated |

---

### 2. Block Lifecycle (`blocks`)

| FID | Trigger | Method | Implementation | Permissions |
|-----|---------|--------|----------------|-------------|
| **FID-BLK-001** | JE submits block form | `POST /api/v1/blocks/` | `BlockService.create_block()` | JE, SE, COA |
| **FID-BLK-002** | COA clicks 'Approve' | `POST /api/v1/blocks/<id>/approve/`| `BlockService.approve_block()` | COA only |
| **FID-BLK-003** | System (on block creation) | Internal Call | `ConflictEngine.detect_overlaps()`| System |
| **FID-BLK-004** | COA clicks 'Ask AI' | `POST /api/v1/blocks/resolve/`| `AIResolverService.resolve_conflict()` | COA only |

---

### 3. Semantic Graph (`ontology`)

| FID | Trigger | Method | Implementation | Permissions |
|-----|---------|--------|----------------|-------------|
| **FID-ONT-001** | Signal `block_approved` | Celery Task | `DigitalTwinManager.sync_block_event()`| System |
| **FID-ONT-002** | Celery Beat (Nightly) | Celery Task | `DigitalTwinManager.run_reasoner()` | System |
| **FID-ONT-003** | System (Impact calc) | Internal Call | `SPARQLExecutor.get_affected_trains()` | System |

---

### 4. Route & Delay (`trains`)

| FID | Trigger | Method | Implementation | Permissions |
|-----|---------|--------|----------------|-------------|
| **FID-TRN-001** | COA views Impact | `GET /api/v1/trains/impact/` | `TrainImpactService.calculate_impact()`| COA only |

---

### 5. Resources (`departments`)

| FID | Trigger | Method | Implementation | Permissions |
|-----|---------|--------|----------------|-------------|
| **FID-DEP-001** | System (Emergency) | Internal Call | `CrewAssignmentService.find_nearest_available_crew()`| System |
| **FID-DEP-002** | System (Block Start) | Internal Call | `CrewAssignmentService.lock_crew_for_block()`| System |

---

### 6. Physical Logic (`assets`)

| FID | Trigger | Method | Implementation | Permissions |
|-----|---------|--------|----------------|-------------|
| **FID-AST-001** | System (Block creation) | Internal Call | `AssetService.validate_km_range()` | System |

---

### 7. Reporting (`analytics`)

| FID | Trigger | Method | Implementation | Permissions |
|-----|---------|--------|----------------|-------------|
| **FID-ANA-001** | COA views Impact | `GET /api/v1/analytics/impact/`| `ImpactCalculatorService.calculate_block_impact()`| COA only |

---

### 8. Comms (`notifications`)

| FID | Trigger | Method | Implementation | Permissions |
|-----|---------|--------|----------------|-------------|
| **FID-NOT-001** | Signal `block_approved`| Celery Task | `TwilioService.send_sms()` | System |
| **FID-NOT-002** | Signal `block_requested`| Celery Task | `WebSocketService.broadcast()` | System |
