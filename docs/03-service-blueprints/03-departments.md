# 03-departments.md

> **ফাইল ক্রম:** ১৯/৪৫  
> **পূর্ববর্তী ফাইল:** [03-service-blueprints/02-blocks.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/02-blocks.md) (SVC-BLK: Block Planning & Intelligent Conflict Detection Service)  
> **পরবর্তী ফাইল:** [03-service-blueprints/04-ontology.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/04-ontology.md)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ডিপার্টমেন্টাল রিসোর্স ম্যানেজমেন্ট ও ফিল্ড কোঅর্ডিনেশন সার্ভিস **`SVC-DEPT` (Departmental Coordination, Crew & Machinery Allocation Service)**-এর পূর্ণাঙ্গ প্রোডাকশন আর্কিটেকচার ব্লুপ্রিন্ট সংজ্ঞায়িত করা হয়েছে। এতে ইঞ্জিনিয়ারিং (ENGG), ট্র্যাকশন (TRD), এবং সিগন্যাল ও টেলিকম (S&T) বিভাগের মেইনটেন্যান্স গ্যাং রোস্টার, হেভি ট্র্যাক মেশিনারি (BCM, CSM, DGS, Tower Wagon) ট্র্যাকিং, ওয়ার্ক অর্ডার লাইফসাইকেল এবং ফিল্ড সেফটি হ্যান্ডব্যাক প্রোটোকল বিস্তারিতভাবে সন্নিবেশিত হয়েছে।

---

# SVC-DEPT: Departmental Coordination & Resource Allocation Service

> **Service ID:** `SVC-DEPT`  
> **Bounded Context App:** `apps.departments`  
> **Owning Team:** Field Operations & Resource Logistics Engineering Team  
> **Business Criticality:** `Operational Resource Logistics & Site Safety Handback`  
> **Primary SLA:** Availability $\ge 99.95\%$, p95 REST Latency $< 70\text{ ms}$, p99 Latency $< 150\text{ ms}$  
> **Execution Runtime:** Gunicorn WSGI (:8000) + Celery 5.3 Default Queue (`default`)

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission & Railway Mandate
`SVC-DEPT` ভারতীয় রেলওয়ের রক্ষণাবেক্ষণ কার্যক্রমের জন্য প্রয়োজনীয় জনবল (Maintenance Gangs / ক্রু) এবং ভারী যন্ত্রপাতি (Heavy Track Machines & Special Equipment) বরাদ্দ, ট্র্যাক এবং প্রত্যয়ন নিশ্চিত করে। 

এটি মাল্টি-ডিপার্টমেন্টাল কম্বাইন্ড ব্লক উইন্ডোতে (Feature #98) সিঙ্ক্রোনাইজড ওয়ার্ক অর্ডার তৈরি করে যাতে ইঞ্জিনিয়ারিং (ট্র্যাক ট্যাম্পিং বা ডিপ স্ক্রিনিং), টিআরডি (OHE ক্যাটেনারি পরিদর্শন), এবং এসঅ্যান্ডটি (ইলেকট্রনিক ইন্টারলকিং পয়েন্ট রক্ষণাবেক্ষণ) একই সময়ে ফিল্ডে মোবিলাইজ হতে পারে। কাজ শেষে এটি সাইট সুপারভাইজারের মাধ্যমে ট্র্যাক গেজ ও ব্যালাস্ট প্রোফাইল ভেরিফিকেশনসহ সেফটি ক্লিয়ারেন্স সার্টিফিকেট প্রদান করে।

- **Problem Statement PS26027 Alignment:**
  - [x] Pillar 1: Automated AI Conflict Detection (Machine and crew conflict validation)
  - [x] Pillar 2: Joint Inter-Departmental Combined Block Windows (Multi-departmental gang mobilization)
  - [x] Pillar 3: Permissive Safety & Site Execution Compliance (Tool count, gauge check, safety handback)
  - [x] Pillar 4: Predictive Asset Twin & Minimum Operational Disruption (Machine fitness tracking)

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - Department divisions (`ENG`, `TRD`, `SNT`, `OPERATIONS`, `SAFETY`).
  - Maintenance gang roster tracking, gang mate/supervisor assignments, and station home bases.
  - Specialized heavy on-track machinery inventory: CSM Tampers, BCM Ballast Cleaners, DGS Stabilizers, OHE Tower Wagons, Rail Grinders, and USFD Trolleys.
  - Mechanical fitness certificate expiry tracking (`fitness_expiry_date >= today`).
  - Work Order lifecycle: `PENDING` $\rightarrow$ `MOBILIZING` $\rightarrow$ `ON_SITE` $\rightarrow$ `WORK_COMPLETED` $\rightarrow$ `SAFETY_CLEARANCE_SIGNED`.
- **Explicit Exclusions (Out of Scope):**
  - Track possession conflict solving and block approval (owned by `SVC-BLK`).
  - User credentials and spatial jurisdiction boundaries (owned by `SVC-AUTH`).
  - Physical track defect telemetry and ultrasonic flaw logs (owned by `SVC-AST`).

---

## 2. Technical Stack & Runtime Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SVC-DEPT RUNTIME ARCHITECTURE                                        │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Inbound Traffic: REST API (/api/v1/departments/*) via Gunicorn WSGI (:8000)                           │
│  Application Framework: Django 5.0 + Django REST Framework 3.15                                        │
│  Persistence: PostgreSQL 15 + PostGIS 3.3 (Tables: `departments_department`, `departments_gang`,       │
│               `departments_maintenanceequipment`, `departments_workorder`)                             │
│  In-Memory Layer: Redis 7.2 (DB 2: L1 Gang Availability Cache & Machine Mutex Locks)                   │
│  Background Dispatch: Celery 5.3 Worker Queue: `default` (Resource conflict sweeps & cron sync)        │
│  Instrumentation: Structlog JSON logger & Prometheus resource gauges                                  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Component | Technology | Version | Purpose & Railway Domain Justification |
|---|---|---|---|
| **Programming Language** | Python | 3.11.8 | Fast transactional logic with native mathematical resource solvers |
| **Framework** | Django / DRF | 5.0.x / 3.15.x | High-throughput relational queries with foreign key consistency |
| **Relational Database**| PostgreSQL | 15.6 | Strict ACID guarantees for machine reservations and work order audits |
| **Cache & Locks** | Redis | 7.2.4 | In-memory distributed mutex locks (`lock:equipment:{id}`) preventing double-allocation |
| **Task Queue** | Celery | 5.3.6 | Background processing of machine fitness rollups and dispatch alerts |

---

## 3. Database Schema & Persistence (PostgreSQL 15 + PostGIS 3.3)

### 3.1 Table Definitions & Data Dictionary

```sql
-- =============================================================================
-- SVC-DEPT PostgreSQL 15 + PostGIS 3.3 DDL Specification
-- =============================================================================

-- 1. Railway Department Master Table
CREATE TABLE departments_department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    headquarters_division VARCHAR(10) NOT NULL DEFAULT 'HWH',
    contact_email VARCHAR(255) NOT NULL,
    escalation_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_dept_code CHECK (
        code IN ('ENG', 'TRD', 'SNT', 'OPERATIONS', 'SAFETY')
    )
);

-- 2. Maintenance Gangs (Field Maintenance Crews)
CREATE TABLE departments_gang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gang_number VARCHAR(30) NOT NULL UNIQUE,
    department_id UUID NOT NULL,
    supervisor_id INT NULL,
    headquarters_station VARCHAR(10) NOT NULL DEFAULT 'HWH',
    crew_strength INT NOT NULL DEFAULT 12 CHECK (crew_strength > 0),
    assigned_section_start_km NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
    assigned_section_end_km NUMERIC(8, 3) NOT NULL DEFAULT 50.000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_gang_dept FOREIGN KEY (department_id) 
        REFERENCES departments_department(id) ON DELETE CASCADE,
    CONSTRAINT fk_gang_supervisor FOREIGN KEY (supervisor_id) 
        REFERENCES auth_user(id) ON DELETE SET NULL
);

-- 3. Heavy Track Machinery & Specialized Rolling Stock
CREATE TABLE departments_maintenanceequipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_code VARCHAR(50) NOT NULL UNIQUE,
    equipment_name VARCHAR(100) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL DEFAULT 'TRACK_TAMPER_CSM',
    department_id UUID NOT NULL,
    home_depot VARCHAR(20) NOT NULL DEFAULT 'BWN',
    current_location_km NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
    operational_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    fitness_expiry_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_equipment_dept FOREIGN KEY (department_id) 
        REFERENCES departments_department(id) ON DELETE RESTRICT,
    CONSTRAINT chk_equipment_type CHECK (
        equipment_type IN ('TRACK_TAMPER_CSM', 'BALLAST_CLEANER_BCM', 'DYNAMIC_TRACK_STABILIZER',
                           'OHE_TOWER_WAGON', 'RAIL_GRINDING_TRAIN', 'USFD_TROLLEY')
    ),
    CONSTRAINT chk_equipment_status CHECK (
        operational_status IN ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE_DUE', 'BREAKDOWN')
    )
);

-- 4. Departmental Work Orders Linked to Block Possessions
CREATE TABLE departments_workorder (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(40) NOT NULL UNIQUE,
    block_id UUID NOT NULL,
    department_id UUID NOT NULL,
    gang_id UUID NOT NULL,
    equipment_id UUID NULL,
    planned_work_scope TEXT NOT NULL,
    target_metric_units NUMERIC(10, 2) NOT NULL,     -- e.g. 1500.00 meters tamped
    actual_metric_units NUMERIC(10, 2) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    ballast_profile_verified BOOLEAN NOT NULL DEFAULT FALSE,
    track_gauge_checked BOOLEAN NOT NULL DEFAULT FALSE,
    safety_certified_by_id INT NULL,
    safety_clearance_timestamp TIMESTAMPTZ NULL,
    safety_remarks TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_wo_block FOREIGN KEY (block_id) 
        REFERENCES blocks_block(id) ON DELETE CASCADE,
    CONSTRAINT fk_wo_dept FOREIGN KEY (department_id) 
        REFERENCES departments_department(id) ON DELETE RESTRICT,
    CONSTRAINT fk_wo_gang FOREIGN KEY (gang_id) 
        REFERENCES departments_gang(id) ON DELETE RESTRICT,
    CONSTRAINT fk_wo_equipment FOREIGN KEY (equipment_id) 
        REFERENCES departments_maintenanceequipment(id) ON DELETE SET NULL,
    CONSTRAINT fk_wo_safety_certifier FOREIGN KEY (safety_certified_by_id) 
        REFERENCES auth_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_wo_status CHECK (
        status IN ('PENDING', 'MOBILIZING', 'ON_SITE', 'WORK_COMPLETED', 'SAFETY_CLEARANCE_SIGNED')
    )
);
```

### 3.2 Indexing & Performance Strategy
```sql
-- Composite B-tree Indexes for High-Frequency Queries
CREATE INDEX idx_departments_gang_dept_station ON departments_gang (department_id, headquarters_station);
CREATE INDEX idx_departments_eq_type_status ON departments_maintenanceequipment (equipment_type, operational_status);
CREATE INDEX idx_departments_wo_gang_status ON departments_workorder (gang_id, status);
CREATE INDEX idx_departments_wo_block ON departments_workorder (block_id);
```

### 3.3 Redis Caching & Distributed Mutex Strategy
- **Machine Allocation Lock:** `lock:equipment:{equipment_id}` with TTL = 10s to prevent concurrent assignment to two overlapping blocks.
- **Available Gangs Cache:** `cache:departments:gangs:available:{dept_code}` -> Cached ID list with TTL = 120s, invalidated on work order status change.
- **Machine Fitness Snapshot:** `cache:departments:equipment:fitness:{id}` -> JSON fitness snapshot with TTL = 3600s.

---

## 4. API Endpoints Specification

All endpoints return the standard platform JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-18T10:30:00.000Z",
  "correlation_id": "b35975f5-cc5c-4d55-90cf-e0e124b2c600"
}
```

### Master API Routing Contract

| Method | Endpoint Route | Permissions | Request DTO | Response DTO | SLA Target |
|---|---|---|---|---|:---:|
| `GET` | `/api/v1/departments/gangs/` | Authenticated | Filters: `department`, `station`, `available` | Paginated Gang List DTO | p95 < 60ms |
| `POST` | `/api/v1/departments/gangs/` | `DEPT_ENGINEER` | Gang Creation Payload Schema | Created Gang Record DTO | p95 < 90ms |
| `GET` | `/api/v1/departments/gangs/{id}/availability/` | Authenticated | Query: `?start_time=...&end_time=...` | `{"available": true, "conflicts": []}` | p95 < 40ms |
| `GET` | `/api/v1/departments/equipment/` | Authenticated | Filters: `type`, `status`, `depot` | Equipment Collection DTO | p95 < 50ms |
| `POST` | `/api/v1/departments/equipment/` | `ADMIN` / `DEPT_ENGINEER` | Equipment Registration Schema | Created Equipment DTO | p95 < 80ms |
| `GET` | `/api/v1/departments/work-orders/` | Authenticated | Filters: `block_id`, `status`, `gang_id` | Paginated Work Orders | p95 < 65ms |
| `POST` | `/api/v1/departments/work-orders/` | `DEPT_ENGINEER` | Work Order Generation Schema | Created Work Order DTO | p95 < 90ms |
| `PATCH`| `/api/v1/departments/work-orders/{id}/clearance/`| `SITE_SUPERVISOR` | `{"track_gauge_checked", "ballast_verified"}` | Work Order DTO (`SAFETY_CLEARANCE_SIGNED`) | p95 < 80ms |

---

## 5. Event-Driven Contracts

### 5.1 Published Events (Redis Outbox & Daphne Channels)

```json
{
  "event_id": "e4418f77-229b-4cd3-a120-77a829103982",
  "event_type": "departments.work_order.safety_cleared",
  "timestamp": "2026-09-18T10:35:00.000000Z",
  "actor_id": "SUPERVISOR-CHATTERJEE-1002",
  "payload": {
    "work_order_id": "wo-550e8400-e29b-41d4-a716-446655440000",
    "order_number": "WO-20260918-ENG-001",
    "block_id": "block-550e8400-e29b-41d4-a716-446655440000",
    "department_code": "ENG",
    "gang_number": "GANG-HWH-04",
    "equipment_code": "CSM-09-32-114",
    "actual_output": 1620.00,
    "track_gauge_checked": true,
    "ballast_profile_verified": true,
    "safety_remarks": "Track tamped and gauge certified fit for 110 km/h caution."
  }
}
```

### 5.2 Consumed Events
- **`blocks.possession.sanctioned`:** Triggers automatic creation of draft `work_orders` for all participating departments and reserves corresponding machines in Redis.
- **`blocks.possession.cancelled`:** Releases reserved gangs and machines back to `AVAILABLE` status.

---

## 6. Heavy Machinery Proximity Allocation Algorithm

When a maintenance block is proposed, `SVC-DEPT` solves a machine allocation optimization problem:

$$\text{Cost} = w_1 \cdot |\text{Location}_{\text{machine}} - \text{Start}_{\text{block}}| + w_2 \cdot (\text{DaysToFitnessExpiry})^{-1}$$

1. **Fitness Filter:** Excludes any machine where `is_fit == False` or `operational_status != 'AVAILABLE'`.
2. **Deadheading Distance Minimization:** Selects the qualified machine closest to the block's `start_km` along the corridor.
3. **Double-Allocation Prevention:** Acquires Redis distributed mutex `lock:equipment:{id}` for the required time window.

---

## 7. Field Safety Clearance & Handback Protocol

Prior to marking a work order as `SAFETY_CLEARANCE_SIGNED`, the Site Supervisor must confirm all of the following physical safety conditions:
1. **Crew Headcount Muster (Feature #72):** All gang trackmen accounted for and off the running track.
2. **Tool Count Reconciled (Feature #81):** Zero tools or fishplates left on rails.
3. **Track Gauge Verified:** Standard gauge tolerance ($1676\text{ mm} \pm 3\text{ mm}$) confirmed by manual gauge reading.
4. **Ballast & Catenary Clearance:** TRD OHE earthing bonds removed, catenary re-energization requested.

---

## 8. Configuration & Environment Variables

```env
# ==============================================================================
# SVC-DEPT Operational Environment Configuration
# ==============================================================================
DEPT_DEFAULT_DIVISION=HWH
DEPT_DEFAULT_ZONE=ER
DEPT_CREW_MINIMUM_STRENGTH=8
DEPT_EQUIPMENT_FITNESS_WARNING_DAYS=7

# Redis Lock & Cache TTL
DEPT_MACHINE_LOCK_TIMEOUT_SECONDS=10
DEPT_GANG_AVAILABILITY_CACHE_TTL_SECONDS=120
```

---

## 9. Observability & Health Probes

- **Liveness Probe:** `GET /api/v1/departments/health/liveness/` -> Returns `200 OK {"status": "UP"}`.
- **Readiness Probe:** `GET /api/v1/departments/health/readiness/` -> Validates PostgreSQL connection and Redis DB 2 availability.
- **Prometheus Custom Metrics:**
  - `departments_gangs_active_gauge{department}` (Gauge)
  - `departments_equipment_breakdown_total{equipment_type}` (Counter)
  - `departments_work_orders_cleared_total{department}` (Counter)
  - `departments_machine_deadheading_km_total` (Counter)

---

## 10. Testing & Quality Assurance Mandate

- **Gang Overlap Test (`tests/test_gang_roster.py`):** Verify `is_available_for_window()` correctly returns `False` if the gang is already assigned to an active block during that time span.
- **Equipment Fitness Test (`tests/test_equipment_fitness.py`):** Verify that equipment with an expired `fitness_expiry_date` cannot be assigned to any block.
- **Safety Clearance Sign-Off Test:** Verify that `work_orders` cannot transition to `SAFETY_CLEARANCE_SIGNED` unless `ballast_profile_verified` and `track_gauge_checked` are both `True`.

---

## 11. Next File Dependency Note

> **পরবর্তী ফাইল:** [03-service-blueprints/04-ontology.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/04-ontology.md)

`03-departments.md` (`SVC-DEPT`) সম্পূর্ণ প্রস্তুত। পরবর্তী ফাইল `04-ontology.md`-এ **Semantic Digital Twin & Symbolic AI Reasoning Service (`SVC-ONTO`)**-এর প্রোডাকশন ব্লুপ্রিন্ট (OWL 2 DL নলেজ গ্রাফ, Owlready2 + HermiT Reasoner, 4GB RAM সিলিং, এবং জিরো-হ্যালুসিনেশন সেফটি প্রুফ) সংজ্ঞায়িত করা হবে।
