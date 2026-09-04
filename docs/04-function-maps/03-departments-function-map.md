# 03-departments-function-map.md

> **File Sequence:** 28/45  
> **Service:** `SVC-DEPT` (`apps.departments`)  
> **Previous Document:** [04-function-maps/02-blocks-function-map.md](02-blocks-function-map.md)  
> **Next Document:** [04-function-maps/04-ontology-function-map.md](04-ontology-function-map.md)  
> **Context:** Exhaustive function mapping, schemas, handlers, and validation rules for Departmental Coordination & Resource Allocation.

---

## 1. Function Catalog

| Function ID | Function Name | HTTP Method | Path / Event | Input Schema | Output Schema | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-DEPT-001` | Query Gang Rosters & Availability | `GET` | `/api/v1/departments/gangs/` | Query Parameters | `PaginatedGangsResponseDTO` | < 60ms |
| `FUNC-DEPT-002` | Register Maintenance Gang Unit | `POST` | `/api/v1/departments/gangs/` | `GangCreateRequestDTO` | `GangDetailDTO` | < 90ms |
| `FUNC-DEPT-003` | Query Heavy Equipment Readiness | `GET` | `/api/v1/departments/equipment/` | Query Parameters | `PaginatedEquipmentResponseDTO` | < 50ms |
| `FUNC-DEPT-004` | Issue Departmental Work Order | `POST` | `/api/v1/departments/work-orders/` | `WorkOrderCreateRequestDTO` | `WorkOrderDetailDTO` | < 90ms |
| `FUNC-DEPT-005` | Sign Track Safety Clearance | `PATCH` | `/api/v1/departments/work-orders/{id}/clearance/` | `SafetyClearanceRequestDTO` | `WorkOrderDetailDTO` | < 80ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-DEPT-004`: Issue Departmental Work Order
- **Controller Class:** `apps.departments.views.WorkOrderCreateView`
- **Permissions:** `IsAuthenticated`, `IsDepartmentalEngineer`
- **Input Schema (`WorkOrderCreateRequestDTO`):**
```json
{
  "block_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "gang_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "equipment_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "planned_work_scope": "Continuous tamping of PSC sleeper track from KM 142.500 to KM 144.000 using CSM Tamper.",
  "target_metric_units": 1500.00
}
```
- **Validation Rules:**
  - `block_id` must reference a valid block in `status = 'SANCTIONED'`.
  - `gang_id` must belong to the same department as the block proposal.
  - Gang must have `is_active = 1` and no overlapping active work order during the block window.
  - `equipment_id` (if specified) must have `operational_status = 'AVAILABLE'` and `fitness_expiry_date >= TODAY`.
- **Processing Logic:**
  1. Verify gang and equipment availability via Redis reservation locks (`lock:resource:gang:{id}`, `lock:resource:equipment:{id}`).
  2. Generate unique `order_number`: `WO-YYYYMMDD-[DEPT]-[SEQ]`.
  3. Insert record into `work_orders` with status `'PENDING'`.
  4. Update `maintenance_equipment.operational_status = 'ASSIGNED'`.
  5. Publish event `departments.work_order.created` to Redis `events:departments`.
- **Output:** HTTP 201 Created with full `WorkOrderDetailDTO`.

---

### `FUNC-DEPT-005`: Sign Track Safety Clearance
- **Controller Class:** `apps.departments.views.WorkOrderSafetyClearanceView`
- **Permissions:** `IsAuthenticated`, `IsSiteSupervisor`
- **Input Schema:**
```json
{
  "safety_certified": true,
  "actual_metric_units": 1420.00,
  "ballast_profile_verified": true,
  "track_gauge_checked": true,
  "remarks": "Track tamped and packed. Safe for 30 km/h pilot passage."
}
```
- **Processing Logic:**
  1. Validate that supervisor belongs to the assigned gang.
  2. Transition `work_orders.status = 'SAFETY_CLEARANCE_SIGNED'`.
  3. Record `safety_clearance_timestamp = CURRENT_TIMESTAMP(6)`.
  4. Release equipment lock, update equipment status to `'AVAILABLE'`.
  5. Check if all work orders associated with the parent `block_id` have signed safety clearances:
     - If all departments cleared -> Publish `departments.all_work_orders_cleared` event to trigger readiness for block completion.
- **Output:** HTTP 200 OK with `WorkOrderDetailDTO`.
