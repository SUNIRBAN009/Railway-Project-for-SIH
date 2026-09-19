# 02-blocks-function-map.md

> **File Sequence:** 27/45  
> **Service:** `SVC-BLK` (`apps.blocks`)  
> **Previous Document:** [04-function-maps/01-accounts-function-map.md](01-accounts-function-map.md)  
> **Next Document:** [04-function-maps/03-departments-function-map.md](03-departments-function-map.md)  
> **Context:** Exhaustive function mapping, schemas, algorithms, and controller specifications for Block Planning & Conflict Detection.

---

## 1. Function Catalog

| Function ID | Function Name | HTTP Method | Path / Event | Input Schema | Output Schema | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-BLK-001` | Submit Block Proposal | `POST` | `/api/v1/blocks/proposals/` | `BlockProposalRequestDTO` | `BlockDetailDTO` | < 120ms |
| `FUNC-BLK-002` | List Filtered Block Schedule | `GET` | `/api/v1/blocks/` | Query Parameters | `PaginatedBlocksResponseDTO` | < 75ms |
| `FUNC-BLK-003` | Retrieve Block Detail & Conflicts | `GET` | `/api/v1/blocks/{id}/` | URL parameter | `BlockFullAuditDTO` | < 40ms |
| `FUNC-BLK-004` | Execute Spatial-Temporal Sweep | Celery | `blocks.tasks.sweep_conflicts` | `{"block_id": "uuid"}` | `ConflictSweepSummaryDTO` | < 200ms |
| `FUNC-BLK-005` | Sanction Block Possession | `POST` | `/api/v1/blocks/{id}/sanction/` | `BlockSanctionRequestDTO` | `BlockDetailDTO` | < 90ms |
| `FUNC-BLK-006` | Activate Track Possession | `POST` | `/api/v1/blocks/{id}/activate/` | `BlockActivationRequestDTO` | `BlockDetailDTO` | < 80ms |
| `FUNC-BLK-007` | Clear & Complete Track Block | `POST` | `/api/v1/blocks/{id}/complete/` | `BlockCompletionRequestDTO` | `BlockDetailDTO` | < 80ms |
| `FUNC-BLK-008` | Cancel Proposed Block Window | `POST` | `/api/v1/blocks/{id}/cancel/` | `BlockCancelRequestDTO` | `BlockDetailDTO` | < 70ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-BLK-001`: Submit Block Proposal
- **Controller Class:** `apps.blocks.views.BlockProposalCreateView`
- **Permissions:** `IsAuthenticated`, `IsDepartmentalEngineer`
- **Input Schema (`BlockProposalRequestDTO`):**
```json
{
  "corridor_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "line_type": "DOWN",
  "department_code": "ENG",
  "work_type": "TRACK_TAMPING",
  "start_km": 142.500,
  "end_km": 146.200,
  "scheduled_start_time": "2026-09-05T02:00:00Z",
  "scheduled_end_time": "2026-09-05T06:00:00Z",
  "traction_power_cutoff_required": false
}
```
- **Validation Rules:**
  - `start_km < end_km`. Both within corridor boundaries (`corridors.start_km` to `corridors.end_km`).
  - `scheduled_start_time < scheduled_end_time`. Start time must be at least 12 hours in the future (unless emergency override flag set).
  - Maximum block window duration: 8 hours (480 minutes).
- **Processing Logic:**
  1. Retrieve `corridor` record from MySQL 8.0.
  2. Extract track sub-geometry using MySQL spatial function:
     $$\text{corridor\_geometry} = \text{ST\_LineSubstring}(\text{corridor.track\_geometry}, f_{\text{start}}, f_{\text{end}})$$
  3. Generate unique `block_code`: `BLK-YYYYMMDD-[DEPT]-[SEQ]`.
  4. Persist record to `blocks` with `status = 'PENDING_APPROVAL'`.
  5. Enqueue Celery task `blocks.tasks.sweep_conflicts.delay(block_id)` to high-priority queue.
  6. Enqueue Celery task `ontology.tasks.run_reasoning_job.delay(block_id)`.
  7. Broadcast WebSocket invalidation frame to React frontend.
- **Output:** HTTP 201 Created with full `BlockDetailDTO`.

---

### `FUNC-BLK-004`: Execute Spatial-Temporal Conflict Sweep (Celery Worker)
- **Task Signature:** `apps.blocks.tasks.sweep_conflicts(block_id: str) -> dict`
- **Queue:** `high`
- **Processing Logic:**
  1. Fetch block record with spatial geometry from MySQL.
  2. **Spatial-Temporal Database Query:** Find intersecting candidate train schedules:
     ```sql
     SELECT ts.id, ts.train_id, ts.scheduled_arrival_time, ts.scheduled_departure_time, t.train_number, t.train_type
     FROM train_schedules ts
     JOIN trains t ON ts.train_id = t.id
     WHERE ts.km_milestone BETWEEN :start_km AND :end_km
       AND ts.scheduled_departure_time >= TIME(:scheduled_start_time)
       AND ts.scheduled_arrival_time <= TIME(:scheduled_end_time);
     ```
  3. **Parallel Block Overlap Query:**
     ```sql
     SELECT id, block_code, department_code, work_type
     FROM blocks
     WHERE corridor_id = :corridor_id
       AND line_type = :line_type
       AND id != :block_id
       AND status IN ('PENDING_APPROVAL', 'COORDINATED', 'SANCTIONED', 'ACTIVE')
       AND scheduled_start_time < :scheduled_end_time
       AND scheduled_end_time > :scheduled_start_time
       AND ST_Intersects(corridor_geometry, :corridor_geom);
     ```
  4. For each conflict detected, evaluate severity:
     - If conflicting train is `PRESTIGE_SUPERFAST` (Rajdhani/Shatabdi) -> Severity: `CRITICAL`.
     - If conflicting train is `PASSENGER_EXPRESS` -> Severity: `HIGH`.
     - If parallel block is from another department -> Check if co-possession possible. If co-possession compatible (ENG tamping + TRD OHE inspection on same slot) -> Mark as `CO_POSSESSION_OPPORTUNITY`. Otherwise -> Severity: `HIGH`.
  5. Insert detected conflicts into `block_conflicts`.
  6. Emit `blocks.conflict.detected` event over Redis.

---

### `FUNC-BLK-005`: Sanction Block Possession
- **Controller Class:** `apps.blocks.views.BlockSanctionView`
- **Permissions:** `IsAuthenticated`, `IsChiefController`
- **Input Schema:** `{"action": "SANCTION", "remarks": "Approved with speed restriction 30 km/h on adjacent UP line"}`
- **Validation Rules:**
  - Verify block `status == 'PENDING_APPROVAL'` or `'COORDINATED'`.
  - Verify no unresolved `CRITICAL` severity conflicts exist in `block_conflicts`. If critical conflicts exist, reject with error `BLK-003` (HTTP 409 Conflict).
- **Processing Logic:**
  1. Acquire optimistic lock via version field (`WHERE id = :id AND version = :current_version`).
  2. Transition `status = 'SANCTIONED'`, set `sanctioned_by_user_id = request.user.id`.
  3. Generate and issue Caution Order reference ID in coordination with `SVC-TRN`.
  4. Publish `blocks.possession.sanctioned` event to Redis `events:blocks`.
- **Output:** HTTP 200 with updated `BlockDetailDTO`.
