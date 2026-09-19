# 05-trains.md

> **File Sequence:** 21/45  
> **Previous Document:** [03-service-blueprints/04-ontology.md](04-ontology.md)  
> **Next Document:** [03-service-blueprints/06-assets.md](06-assets.md)  
> **Context:** Authoritative specification for `SVC-TRN` (Train Operations, Timetable & Live Punctuality Engine) interfacing with COA, FOIS, and ICMS data sources.

---

# SVC-TRN: Train Operations, Timetable & Live Punctuality Service

> **Service ID:** `SVC-TRN`  
> **Django App:** `apps.trains`  
> **Owning Team:** Train Operations & Timetable Engineering Team  
> **Lead Architect:** Principal Traffic Management Architect  
> **Primary SLA:** 99.95% Availability, p95 Latency < 60ms  
> **Classification:** Core Traffic Data & Simulation Engine

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission
Manages master railway timetables, real-time train positions, dynamic delays, and headway separation calculations along the Delhi-Kanpur high-density corridor. Provides the operational ground-truth against which maintenance blocks are scheduled, and calculates delay-propagation penalties when passenger or freight paths must be regulated or diverted due to track possessions.

### 1.2 Bounded Context Boundary
- **In-Scope Responsibilities:**
  - Ingestion of timetable feeds from COA (Control Office Application) and FOIS (Freight Operations).
  - Train priority categorization (`PRESTIGE_SUPERFAST`, `PASSENGER_EXPRESS`, `SUBURBAN_EMU`, `CONTAINER_FREIGHT`, `COAL_RAKE`).
  - Real-time station arrival/departure event recording and delay calculation.
  - Delay cascade estimation: $D_{\text{total}} = D_{\text{initial}} + \sum (H_{\text{req}} - H_{\text{actual}})$.
- **Explicit Exclusions:**
  - Locomotive mechanical asset health (owned by `SVC-AST`).
  - Block possession approval workflow (owned by `SVC-BLK`).

---

## 2. Technical Stack & Runtime Topology

```
+-------------------------------------------------------------------------------+
|                       SVC-TRN RUNTIME ARCHITECTURE                            |
+-------------------------------------------------------------------------------+
|  REST Controllers: apps.trains.views (DRF 3.15)                               |
|  Ingestion Pipeline: Celery Queue 'high' polling simulated COA/FOIS APIs      |
|  Database Engine: MySQL 8.0 (InnoDB) `trains`, `train_schedules`, `live_status`|
|  Cache Store: Redis 7.2 (DB 5) - Corridor Live Train Geospatial Bounding Box   |
|  Real-Time Feed: Daphne WebSocket Server pushing positions to UI Train Graph  |
+-------------------------------------------------------------------------------+
```

---

## 3. Database Schema & Persistence (MySQL 8.0)

### 3.1 Table Definitions

```sql
-- Master Train Catalog
CREATE TABLE `trains` (
  `id` CHAR(36) NOT NULL,
  `train_number` VARCHAR(10) NOT NULL,
  `train_name` VARCHAR(150) NOT NULL,
  `train_type` ENUM('PRESTIGE_SUPERFAST', 'PASSENGER_EXPRESS', 'SUBURBAN_EMU', 'CONTAINER_FREIGHT', 'BULK_FREIGHT') NOT NULL,
  `priority_rank` INT UNSIGNED NOT NULL DEFAULT 100 COMMENT 'Lower number indicates higher traffic priority (e.g. Rajdhani = 1)',
  `source_station` VARCHAR(10) NOT NULL,
  `destination_station` VARCHAR(10) NOT NULL,
  `is_daily` TINYINT(1) NOT NULL DEFAULT 1,
  `operating_days_mask` VARCHAR(7) NOT NULL DEFAULT '1111111',
  `traction_type` ENUM('ELECTRIC', 'DIESEL', 'DUAL') NOT NULL DEFAULT 'ELECTRIC',
  `max_speed_kmh` INT UNSIGNED NOT NULL DEFAULT 130,
  `length_meters` DECIMAL(7,2) NOT NULL DEFAULT 650.00,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_trains_number` (`train_number`),
  KEY `idx_trains_type_priority` (`train_type`, `priority_rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scheduled Station Stoppages & Timetables
CREATE TABLE `train_schedules` (
  `id` CHAR(36) NOT NULL,
  `train_id` CHAR(36) NOT NULL,
  `station_code` VARCHAR(10) NOT NULL,
  `station_sequence` INT UNSIGNED NOT NULL,
  `scheduled_arrival_time` TIME NULL,
  `scheduled_departure_time` TIME NOT NULL,
  `platform_number` VARCHAR(5) NULL,
  `corridor_section_id` CHAR(36) NULL,
  `km_milestone` DECIMAL(8,3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schedule_train_seq` (`train_id`, `station_sequence`),
  KEY `idx_schedules_station` (`station_code`),
  CONSTRAINT `fk_schedules_train` FOREIGN KEY (`train_id`) REFERENCES `trains` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Real-Time Live Running Status
CREATE TABLE `train_live_status` (
  `id` CHAR(36) NOT NULL,
  `train_id` CHAR(36) NOT NULL,
  `journey_date` DATE NOT NULL,
  `current_station_code` VARCHAR(10) NOT NULL,
  `current_km` DECIMAL(8,3) NOT NULL,
  `delay_minutes` INT NOT NULL DEFAULT 0,
  `speed_kmh` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `last_reported_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_live_train_journey` (`train_id`, `journey_date`),
  KEY `idx_live_station_delay` (`current_station_code`, `delay_minutes`),
  CONSTRAINT `fk_live_train` FOREIGN KEY (`train_id`) REFERENCES `trains` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. API Endpoints Specification

| Method | Endpoint | Permissions | Query Params / Payload | Response DTO | SLA (p95) |
|---|---|---|---|---|:---:|
| `GET` | `/api/v1/trains/` | Authenticated | `?corridor=NDLS-CNB&type=PRESTIGE` | Paginated Train List | < 50ms |
| `GET` | `/api/v1/trains/{number}/schedule/` | Authenticated | URL param | Full Timetable Schedule DTO | < 35ms |
| `GET` | `/api/v1/trains/live/` | Authenticated | `?delay_greater_than=15` | Active Running Trains & Delay Status | < 45ms |
| `POST` | `/api/v1/trains/simulate-delay/` | Controller | `{"train_id", "delay_min", "block_id"}` | Delay Cascade Impact Assessment | < 110ms |

---

## 5. Event-Driven Contracts

### 5.1 Published Events (Redis `events:trains`)

```json
{
  "event_id": "f10928bb-7811-4de2-9844-012984501234",
  "event_type": "trains.delay.detected",
  "timestamp": "2026-09-04T12:10:00.000000Z",
  "payload": {
    "train_number": "12424",
    "train_name": "NDLS-DBRG DBRG RAJDHANI",
    "journey_date": "2026-09-04",
    "station_code": "ALJN",
    "current_delay_minutes": 22,
    "projected_corridor_entry": "2026-09-04T13:45:00Z"
  }
}
```
