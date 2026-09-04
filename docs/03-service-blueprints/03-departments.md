# 03-departments.md

> **File Sequence:** 19/45  
> **Previous Document:** [03-service-blueprints/02-blocks.md](02-blocks.md)  
> **Next Document:** [03-service-blueprints/04-ontology.md](04-ontology.md)  
> **Context:** Authoritative specification for `SVC-DEPT` (Departmental Coordination, Crew & Machinery Allocation Service) managing resources across Engineering, Electrical (TRD), and S&T.

---

# SVC-DEPT: Departmental Coordination & Resource Allocation Service

> **Service ID:** `SVC-DEPT`  
> **Django App:** `apps.departments`  
> **Owning Team:** Field Operations & Resource Logistics Team  
> **Lead Architect:** Principal Resource Logistics Architect  
> **Primary SLA:** 99.95% Availability, p95 Latency < 70ms  
> **Classification:** Operational Resource Management Service

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission
Manages the allocation, tracking, and certification of maintenance gangs (trackmen, linesmen, technicians) and heavy railway machinery (Track Tamping Machines, Ballast Cleaning Machines, OHE Tower Wagons, and Ultrasonic Rail Flaw Detectors). Coordinates multi-departmental co-possession workflows so that Engineering, Traction Distribution, and Signalling work concurrently on the same corridor slot to maximize track availability.

### 1.2 Bounded Context Boundary
- **In-Scope Responsibilities:**
  - Departmental division hierarchies (Engineering, TRD, S&T).
  - Maintenance gang rosters, crew competency certifications, and shift scheduling.
  - Heavy maintenance machinery allocation, depot home base tracking, and fitness status.
  - Work Order lifecycle from drafting, pre-inspection, execution, to site clearance sign-off.
- **Explicit Exclusions:**
  - Block spatial slot deconfliction (owned by `SVC-BLK`).
  - User authentication and login (owned by `SVC-AUTH`).
  - Real-time mobile alert SMS dispatching (owned by `SVC-NOTIF`).

---

## 2. Technical Stack & Runtime Topology

```
+-------------------------------------------------------------------------------+
|                       SVC-DEPT RUNTIME ARCHITECTURE                           |
+-------------------------------------------------------------------------------+
|  REST Handlers: apps.departments.views (DRF 3.15)                             |
|  Resource Scheduler: Greedy Heuristic & Knapsack Machine Allocation Solver    |
|  Database Engine: MySQL 8.0 (InnoDB) `gangs`, `equipment`, `work_orders`       |
|  Cache Store: Redis 7.2 (DB 3) - Gang Availability & Active Shift Roasters    |
|  Async Tasks: Celery Queue 'default' (Resource Conflict Sweep)                |
+-------------------------------------------------------------------------------+
```

---

## 3. Database Schema & Persistence (MySQL 8.0)

### 3.1 Table Definitions

```sql
-- Departments Metadata Table
CREATE TABLE `departments` (
  `id` CHAR(36) NOT NULL,
  `code` ENUM('ENG', 'TRD', 'SNT') NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `headquarters_division` VARCHAR(10) NOT NULL DEFAULT 'DLI',
  `contact_email` VARCHAR(255) NOT NULL,
  `escalation_phone` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dept_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Maintenance Gangs (Crews)
CREATE TABLE `gangs` (
  `id` CHAR(36) NOT NULL,
  `gang_number` VARCHAR(30) NOT NULL,
  `department_id` CHAR(36) NOT NULL,
  `supervisor_user_id` CHAR(36) NOT NULL,
  `headquarters_station` VARCHAR(10) NOT NULL,
  `crew_strength` INT UNSIGNED NOT NULL DEFAULT 12,
  `assigned_section_start_km` DECIMAL(8,3) NOT NULL,
  `assigned_section_end_km` DECIMAL(8,3) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gang_number` (`gang_number`),
  KEY `idx_gangs_dept_station` (`department_id`, `headquarters_station`),
  CONSTRAINT `fk_gangs_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Heavy Machinery & Special Equipment
CREATE TABLE `maintenance_equipment` (
  `id` CHAR(36) NOT NULL,
  `equipment_code` VARCHAR(50) NOT NULL,
  `equipment_type` ENUM('TRACK_TAMPER_CSM', 'BALLAST_CLEANER_BCM', 'DYNAMIC_TRACK_STABILIZER', 'OHE_TOWER_WAGON', 'RAIL_GRINDING_TRAIN', 'USFD_TROLLEY') NOT NULL,
  `department_id` CHAR(36) NOT NULL,
  `home_depot` VARCHAR(20) NOT NULL,
  `current_location_km` DECIMAL(8,3) NOT NULL,
  `operational_status` ENUM('AVAILABLE', 'ASSIGNED', 'MAINTENANCE_DUE', 'BREAKDOWN') NOT NULL DEFAULT 'AVAILABLE',
  `fitness_expiry_date` DATE NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_equipment_code` (`equipment_code`),
  KEY `idx_equipment_type_status` (`equipment_type`, `operational_status`),
  CONSTRAINT `fk_equipment_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Departmental Work Orders linked to Blocks
CREATE TABLE `work_orders` (
  `id` CHAR(36) NOT NULL,
  `order_number` VARCHAR(40) NOT NULL,
  `block_id` CHAR(36) NOT NULL,
  `department_id` CHAR(36) NOT NULL,
  `gang_id` CHAR(36) NOT NULL,
  `equipment_id` CHAR(36) NULL,
  `planned_work_scope` TEXT NOT NULL,
  `target_metric_units` DECIMAL(10,2) NOT NULL COMMENT 'e.g. 1500 meters of track tamped',
  `actual_metric_units` DECIMAL(10,2) NULL,
  `status` ENUM('PENDING', 'MOBILIZING', 'ON_SITE', 'WORK_COMPLETED', 'SAFETY_CLEARANCE_SIGNED') NOT NULL DEFAULT 'PENDING',
  `safety_clearance_timestamp` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_work_order_num` (`order_number`),
  KEY `idx_wo_block` (`block_id`),
  KEY `idx_wo_gang_status` (`gang_id`, `status`),
  CONSTRAINT `fk_wo_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_wo_gang` FOREIGN KEY (`gang_id`) REFERENCES `gangs` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_wo_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `maintenance_equipment` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. API Endpoints Specification

| Method | Endpoint | Permissions | Payload / Query | Response DTO | SLA (p95) |
|---|---|---|---|---|:---:|
| `GET` | `/api/v1/departments/gangs/` | Authenticated | `?department=ENG&available=true` | Paginated Gang List | < 60ms |
| `POST` | `/api/v1/departments/gangs/` | `DEPT_ENGINEER` | Gang Profile Schema | Created Gang DTO | < 90ms |
| `GET` | `/api/v1/departments/equipment/` | Authenticated | `?status=AVAILABLE&type=OHE_TOWER_WAGON` | Available Equipment DTOs | < 50ms |
| `POST` | `/api/v1/departments/work-orders/` | `DEPT_ENGINEER` | Work Order Generation Schema | Created Work Order DTO | < 90ms |
| `PATCH` | `/api/v1/departments/work-orders/{id}/clearance/` | `SITE_SUPERVISOR` | `{"safety_certified": true}` | Work Order DTO (`SAFETY_CLEARANCE_SIGNED`) | < 80ms |

---

## 5. Event-Driven Contracts

### 5.1 Published Events (Redis `events:departments`)

```json
{
  "event_id": "e4418f77-229b-4cd3-a120-77a829103982",
  "event_type": "departments.work_order.cleared",
  "timestamp": "2026-09-04T16:00:00.000000Z",
  "actor_id": "supervisor-uuid-99",
  "payload": {
    "work_order_id": "wo-uuid-0012",
    "order_number": "WO-20260904-ENG-08",
    "block_id": "block-uuid-4412",
    "department_code": "ENG",
    "actual_output": "1450 meters tamped",
    "track_cleared": true
  }
}
```

### 5.2 Consumed Events
- **`blocks.possession.sanctioned`:** Triggers automatic creation of draft `work_orders` for all participating departments and reserves corresponding machines in Redis.
