# 02-blocks.md

> **File Sequence:** 18/45  
> **Previous Document:** [03-service-blueprints/01-accounts.md](01-accounts.md)  
> **Next Document:** [03-service-blueprints/03-departments.md](03-departments.md)  
> **Context:** Authoritative specification for `SVC-BLK` (Block Planning & Conflict Detection Engine), the core operational brain for Indian Railways Smart Block Scheduling under PS 26027.

---

# SVC-BLK: Block Planning & Intelligent Conflict Detection Service

> **Service ID:** `SVC-BLK`  
> **Django App:** `apps.blocks`  
> **Owning Team:** Train Operations & Traffic Planning Team  
> **Lead Architect:** Principal Optimization Systems Architect  
> **Primary SLA:** 99.99% Availability, p95 Latency < 85ms (REST), < 200ms (Conflict Detection Sweep)  
> **Classification:** Safety-Critical Rail Traffic Infrastructure

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission
Automates the lifecycle, validation, multi-departmental coordination, and mathematical deconfliction of railway track possession blocks (Engineering, TRD, and S&T). Prevents catastrophic train-maintenance collisions by enforcing spatial corridor locking using MySQL 8.0 Spatial GIS (`LINESTRING`, SRID 4326) and interval-tree temporal conflict detection against dynamic live train paths.

### 1.2 Bounded Context Boundary
- **In-Scope Responsibilities:**
  - Block possession proposal submission, amendment, validation, and multi-tier approval workflow.
  - Spatial-temporal conflict detection against active train timetables (`SVC-TRN`) and parallel maintenance blocks.
  - Multi-departmental co-possession optimization (grouping track, catenary, and signal maintenance into a unified possession window).
  - Track corridor possession locking and release state machine.
- **Explicit Exclusions:**
  - Gang personnel and tamping machine assignment (delegated to `SVC-DEPT`).
  - Semantic OWL axiom validation (delegated to `SVC-ONTO`).
  - Train headway and timetable calculation (delegated to `SVC-TRN`).

---

## 2. Technical Stack & Runtime Topology

```
+-------------------------------------------------------------------------------+
|                       SVC-BLK RUNTIME ARCHITECTURE                            |
+-------------------------------------------------------------------------------+
|  REST Controllers: apps.blocks.views (DRF 3.15)                               |
|  Spatial GIS Engine: MySQL 8.0 Spatial Functions (ST_Intersects, ST_Buffer)    |
|  Conflict Sweep Engine: Interval-Tree + Sweep-Line Algorithm (apps.blocks.core)|
|  Asynchronous Processing: Celery Queue 'high' (worker-high)                   |
|  Real-Time Invalidation: Django Channels Daphne WebSocket Broadcast           |
|  Cache Store: Redis 7.2 (DB 2) - Active Corridor Locks & GeoJSON Segments     |
+-------------------------------------------------------------------------------+
```

| Component | Technology | Version | Purpose & Rationale |
|---|---|---|---|
| **Web Layer** | Django 5.0 REST Framework | 5.0.3 / 3.15.1 | High-throughput transactional endpoints with atomic database locking |
| **Spatial Engine** | MySQL Spatial Extensions | 8.0.36 | `SPATIAL INDEX` on `LINESTRING` geometry representing track centerlines |
| **Conflict Solver** | Python IntervalTree | 3.1.0 | Sub-millisecond $O(\log n + k)$ interval intersection evaluation |
| **Real-Time Stream** | Redis Pub/Sub + Channels | 7.2 / 4.0 | Real-time push-to-invalidate block map layers to React frontend |

---

## 3. Database Schema & Persistence (MySQL 8.0)

### 3.1 Table Definitions

```sql
-- Track Corridor Geography & Physical Infrastructure
CREATE TABLE `corridors` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `zone` VARCHAR(10) NOT NULL DEFAULT 'NR',
  `division` VARCHAR(10) NOT NULL DEFAULT 'DLI',
  `start_km` DECIMAL(8,3) NOT NULL,
  `end_km` DECIMAL(8,3) NOT NULL,
  `track_geometry` LINESTRING NOT NULL /*!80003 SRID 4326 */,
  `is_electrified` TINYINT(1) NOT NULL DEFAULT 1,
  `max_permissible_speed_kmh` INT UNSIGNED NOT NULL DEFAULT 130,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_corridors_code` (`code`),
  SPATIAL KEY `spx_corridors_geometry` (`track_geometry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Block Possession Requests & Lifecycle State Machine
CREATE TABLE `blocks` (
  `id` CHAR(36) NOT NULL,
  `block_code` VARCHAR(40) NOT NULL,
  `corridor_id` CHAR(36) NOT NULL,
  `line_type` ENUM('UP', 'DOWN', 'BIDIRECTIONAL', 'LOOP_1', 'LOOP_2', 'YARD') NOT NULL,
  `requested_by_user_id` CHAR(36) NOT NULL,
  `department_code` ENUM('ENG', 'TRD', 'SNT') NOT NULL,
  `work_type` ENUM('TRACK_TAMPING', 'BALLAST_CLEANING', 'RAIL_RENEWAL', 'OHE_INSPECTION', 'CATENARY_MAINTENANCE', 'SIGNAL_INTERLOCKING_TEST', 'TURNOUT_OVERHAUL') NOT NULL,
  `start_km` DECIMAL(8,3) NOT NULL,
  `end_km` DECIMAL(8,3) NOT NULL,
  `corridor_geometry` LINESTRING NOT NULL /*!80003 SRID 4326 */,
  `scheduled_start_time` DATETIME(6) NOT NULL,
  `scheduled_end_time` DATETIME(6) NOT NULL,
  `actual_start_time` DATETIME(6) NULL,
  `actual_end_time` DATETIME(6) NULL,
  `traction_power_cutoff_required` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'COORDINATED', 'SANCTIONED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
  `rejection_reason` TEXT NULL,
  `sanctioned_by_user_id` CHAR(36) NULL,
  `version` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blocks_code` (`block_code`),
  KEY `idx_blocks_corridor_time` (`corridor_id`, `scheduled_start_time`, `scheduled_end_time`),
  KEY `idx_blocks_status_dept` (`status`, `department_code`),
  SPATIAL KEY `spx_blocks_geometry` (`corridor_geometry`),
  CONSTRAINT `fk_blocks_corridor` FOREIGN KEY (`corridor_id`) REFERENCES `corridors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Block Conflict Ledger
CREATE TABLE `block_conflicts` (
  `id` CHAR(36) NOT NULL,
  `block_id` CHAR(36) NOT NULL,
  `conflict_type` ENUM('TRAIN_PATH_COLLISION', 'PARALLEL_BLOCK_COLLISION', 'OHE_POWER_CONCURRENT_LOCK', 'SAFETY_MARGIN_VIOLATION') NOT NULL,
  `conflicting_entity_id` CHAR(36) NOT NULL,
  `severity` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL,
  `start_km` DECIMAL(8,3) NOT NULL,
  `end_km` DECIMAL(8,3) NOT NULL,
  `conflict_start_time` DATETIME(6) NOT NULL,
  `conflict_end_time` DATETIME(6) NOT NULL,
  `resolution_status` ENUM('UNRESOLVED', 'AUTO_RESOLVED', 'MANUALLY_OVERRIDDEN', 'DISMISSED') NOT NULL DEFAULT 'UNRESOLVED',
  `resolution_notes` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_conflicts_block` (`block_id`, `resolution_status`),
  CONSTRAINT `fk_conflicts_block` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. API Endpoints Specification

| Method | Endpoint | Permissions | Request Payload | Response DTO | SLA (p95) |
|---|---|---|---|---|:---:|
| `POST` | `/api/v1/blocks/proposals/` | `DEPT_ENGINEER` | Proposed Block Creation JSON | Created Block DTO + Detected Conflicts | < 120ms |
| `GET` | `/api/v1/blocks/` | Authenticated | Query Filters (`corridor`, `status`, `start`, `end`) | Paginated Block Collection | < 75ms |
| `GET` | `/api/v1/blocks/{id}/` | Authenticated | URL parameter | Detailed Block DTO with Conflicts & Gangs | < 40ms |
| `POST` | `/api/v1/blocks/{id}/validate/` | Authenticated | Empty | Validation Report (Spatial, Temporal, Ontology) | < 180ms |
| `POST` | `/api/v1/blocks/{id}/sanction/` | `CHIEF_CONTROLLER` | `{"action": "SANCTION", "remarks": "Approved"}` | Updated Block DTO (`status: SANCTIONED`) | < 90ms |
| `POST` | `/api/v1/blocks/{id}/activate/` | `SECTION_CONTROLLER` | `{"caution_order_id": "CO-291"}` | Updated Block DTO (`status: ACTIVE`) | < 80ms |
| `POST` | `/api/v1/blocks/{id}/complete/` | `SITE_SUPERVISOR` | `{"track_fit_certified": true}` | Updated Block DTO (`status: COMPLETED`) | < 80ms |

---

## 5. Event-Driven Contracts

### 5.1 Published Events (Redis `events:blocks`)

```json
{
  "event_id": "d8213e4b-9721-4fce-bc81-c3008915e478",
  "event_type": "blocks.possession.sanctioned",
  "timestamp": "2026-09-04T12:00:00.000000Z",
  "actor_id": "controller-uuid-1",
  "payload": {
    "block_id": "block-uuid-4412",
    "block_code": "BLK-20260904-ENG-001",
    "corridor_code": "NDLS-CNB-SEC04",
    "line_type": "DOWN",
    "start_km": 142.500,
    "end_km": 146.200,
    "scheduled_start_time": "2026-09-05T02:00:00Z",
    "scheduled_end_time": "2026-09-05T06:00:00Z",
    "traction_cutoff": false,
    "departments_involved": ["ENG", "TRD"]
  }
}
```

### 5.2 Consumed Events
- **`trains.timetable.updated`:** Triggers automatic re-run of conflict detection sweep over intersecting spatial corridors.
- **`ontology.inference.completed`:** Ingests semantic reasoning violations and creates corresponding entries in `block_conflicts`.

---

## 6. Mathematical Conflict Detection Workflow

```
+---------------------------------------------------------------------------------+
|                        SPATIAL-TEMPORAL CONFLICT PIPELINE                       |
+---------------------------------------------------------------------------------+
| 1. Spatial Filter: Query corridors where ST_Intersects(block.geom, target.geom) |
| 2. Temporal Filter: Filter timetable paths where [t_start, t_end] overlaps     |
| 3. Buffer Zone Calculation: Add safety buffer (15 min headway + 1.5 km margin)  |
| 4. Conflict Classification:                                                    |
|    - If train category is RAJDHANI / SHATABDI -> CRITICAL Severity              |
|    - If train category is FREIGHT -> MEDIUM Severity (eligible for rerouting)   |
| 5. Persist violations into `block_conflicts` with resolution recommendation    |
+---------------------------------------------------------------------------------+
```
