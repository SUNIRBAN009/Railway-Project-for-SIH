# 06-assets.md

> **File Sequence:** 22/45  
> **Previous Document:** [03-service-blueprints/05-trains.md](05-trains.md)  
> **Next Document:** [03-service-blueprints/07-analytics.md](07-analytics.md)  
> **Context:** Authoritative specification for `SVC-AST` (Track Infrastructure, Catenary & Signaling Asset Telemetry & Health Monitoring Service).

---

# SVC-AST: Railway Physical Infrastructure & Asset Health Service

> **Service ID:** `SVC-AST`  
> **Django App:** `apps.assets`  
> **Owning Team:** Civil, Electrical & Telecommunications Asset Engineering Team  
> **Lead Architect:** Principal Asset Reliability Engineer  
> **Primary SLA:** 99.95% Availability, p95 Latency < 65ms  
> **Classification:** Physical Infrastructure & Predictive Maintenance Engine

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission
Tracks the physical condition, inspection logs, and telemetry degradation scores of permanent way assets (rails, sleepers, ballast, turnouts), traction power components (OHE masts, contact wires, sub-stations), and signaling units (axle counters, point machines, track circuits). Flags urgent maintenance needs and automatically nominates track segments requiring safety blocks before critical failure thresholds are breached.

### 1.2 Bounded Context Boundary
- **In-Scope Responsibilities:**
  - Asset inventory master registry with geospatial coordinates and linear km referencing.
  - Track Recording Car (TRC) and Ultrasonic Flaw Detection (USFD) inspection ingestion.
  - Calculation of Track Quality Index (TQI) and Asset Degradation Score (ADS, scale 0.0 to 100.0).
  - Predictive block recommendation engine when $ADS < 40.0$.
- **Explicit Exclusions:**
  - Gang dispatching (owned by `SVC-DEPT`).
  - Corridors deconfliction (owned by `SVC-BLK`).

---

## 2. Technical Stack & Runtime Topology

```
+-------------------------------------------------------------------------------+
|                       SVC-AST RUNTIME ARCHITECTURE                            |
+-------------------------------------------------------------------------------+
|  REST Handlers: apps.assets.views (DRF 3.15)                                  |
|  Degradation Scoring Engine: Scientific NumPy/Pandas Pipeline                 |
|  Database Engine: MySQL 8.0 `track_assets`, `asset_telemetry`, `defect_logs`  |
|  Cache Store: Redis 7.2 (DB 6) - Asset Health Scores by Corridor              |
|  Async Tasks: Celery Queue 'low' (Batch Telemetry Processing)                 |
+-------------------------------------------------------------------------------+
```

---

## 3. Database Schema & Persistence (MySQL 8.0)

### 3.1 Table Definitions

```sql
-- Physical Infrastructure Assets Master
CREATE TABLE `track_assets` (
  `id` CHAR(36) NOT NULL,
  `asset_tag` VARCHAR(50) NOT NULL,
  `asset_category` ENUM('PERMANENT_WAY', 'OHE_TRACTION', 'SIGNAL_INTERLOCKING', 'TELECOM', 'BRIDGES_STRUCTURES') NOT NULL,
  `sub_type` VARCHAR(80) NOT NULL COMMENT 'e.g. 60KG_UIC_RAIL, POINT_MACHINE_143, OHE_TENSION_REGULATOR',
  `corridor_id` CHAR(36) NOT NULL,
  `location_km` DECIMAL(8,3) NOT NULL,
  `line_type` ENUM('UP', 'DOWN', 'BIDIRECTIONAL', 'LOOP_1', 'LOOP_2', 'YARD') NOT NULL,
  `installation_date` DATE NOT NULL,
  `current_health_score` DECIMAL(5,2) NOT NULL DEFAULT 100.00 COMMENT '100.0 = Brand New, < 40.0 = Critical Maintenance Required',
  `last_inspected_at` DATETIME(6) NULL,
  `is_operational` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assets_tag` (`asset_tag`),
  KEY `idx_assets_corridor_km` (`corridor_id`, `location_km`),
  KEY `idx_assets_health` (`current_health_score`),
  CONSTRAINT `fk_assets_corridor` FOREIGN KEY (`corridor_id`) REFERENCES `corridors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Telemetry Readings & Flaw Records
CREATE TABLE `asset_defect_logs` (
  `id` CHAR(36) NOT NULL,
  `asset_id` CHAR(36) NOT NULL,
  `defect_type` ENUM('INTERNAL_RAIL_FRACTURE', 'WHEEL_BURN', 'OHE_SAG_EXCESSIVE', 'POINT_SLACK_TIMEOUT', 'INSULATION_BREAKDOWN') NOT NULL,
  `severity` ENUM('CRITICAL_IMMEDIATE_STOP', 'IMPAIRMENT_SPEED_RESTRICTION', 'MONITORING_REQUIRED') NOT NULL,
  `detected_by_source` VARCHAR(50) NOT NULL COMMENT 'e.g. USFD_CAR_04, MANUAL_TROLLEY_INSPECTION',
  `recommended_speed_restriction_kmh` INT UNSIGNED NULL,
  `block_recommended` TINYINT(1) NOT NULL DEFAULT 0,
  `is_rectified` TINYINT(1) NOT NULL DEFAULT 0,
  `detected_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `rectified_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_defects_asset_unrectified` (`asset_id`, `is_rectified`),
  KEY `idx_defects_block_rec` (`block_recommended`, `is_rectified`),
  CONSTRAINT `fk_defects_asset` FOREIGN KEY (`asset_id`) REFERENCES `track_assets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. API Endpoints Specification

| Method | Endpoint | Permissions | Query / Payload | Response DTO | SLA (p95) |
|---|---|---|---|---|:---:|
| `GET` | `/api/v1/assets/` | Authenticated | `?corridor=NDLS-CNB&health_below=60` | Paginated Asset Collection | < 60ms |
| `GET` | `/api/v1/assets/{tag}/` | Authenticated | URL parameter | Full Asset Detail with Defect History | < 35ms |
| `POST` | `/api/v1/assets/defects/` | `DEPT_ENGINEER` | Defect Ingestion Schema | Created Defect DTO + Recommended Action | < 80ms |
| `GET` | `/api/v1/assets/maintenance-recommendations/` | Controller/SE | `?division=DLI` | List of Track Segments Needing Blocks | < 75ms |

---

## 5. Event-Driven Contracts

### 5.1 Published Events (Redis `events:assets`)

```json
{
  "event_id": "c9920114-1182-4aa3-8822-491028304911",
  "event_type": "assets.critical_defect.detected",
  "timestamp": "2026-09-04T12:15:00.000000Z",
  "payload": {
    "asset_tag": "RAIL-NDLS-CNB-DN-KM-144.2",
    "defect_type": "INTERNAL_RAIL_FRACTURE",
    "severity": "CRITICAL_IMMEDIATE_STOP",
    "location_km": 144.200,
    "corridor_code": "NDLS-CNB-SEC04",
    "caution_speed_kmh": 30,
    "block_mandatory": true
  }
}
```
