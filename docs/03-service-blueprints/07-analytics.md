# 07-analytics.md

> **File Sequence:** 23/45  
> **Previous Document:** [03-service-blueprints/06-assets.md](06-assets.md)  
> **Next Document:** [03-service-blueprints/08-notifications.md](08-notifications.md)  
> **Context:** Authoritative specification for `SVC-ANA` (Operations Analytics, Block Efficiency & Punctuality KPI Intelligence Engine).

---

# SVC-ANA: Railway Operations Analytics & KPI Intelligence Service

> **Service ID:** `SVC-ANA`  
> **Django App:** `apps.analytics`  
> **Owning Team:** Business Intelligence & Executive Analytics Team  
> **Lead Architect:** Principal Data & Analytics Architect  
> **Primary SLA:** 99.90% Availability, p95 Latency < 100ms (Dashboard KPI Queries), < 3000ms (Heavy Aggregate Reports)  
> **Classification:** Executive Decision Support & Performance Monitoring

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission
Synthesizes operational records across blocks, train running logs, gang productivity, and asset reliability to compute key railway KPIs: Track Possession Utilization Rate ($U = \frac{T_{\text{actual}}}{T_{\text{sanctioned}}}$), Train Punctuality Loss ($P_{\text{loss}}$), Multi-Department Co-Possession Index ($MCI$), and Maintenance Delay Mitigation Ratio. Generates executive dashboards for Railway Board and Divisional Railway Managers (DRMs).

### 1.2 Bounded Context Boundary
- **In-Scope Responsibilities:**
  - Aggregation of historical block execution telemetry into OLAP summary marts.
  - Calculation of co-possession efficiency (time saved by bundling ENG + TRD + S&T work).
  - Punctuality impact modeling and train delay attribution reporting.
  - Periodic rollup materialization (Hourly, Daily, Monthly).
- **Explicit Exclusions:**
  - Live transactional block authorization (owned by `SVC-BLK`).
  - Active train tracking (owned by `SVC-TRN`).

---

## 2. Technical Stack & Runtime Topology

```
+-------------------------------------------------------------------------------+
|                       SVC-ANA RUNTIME ARCHITECTURE                            |
+-------------------------------------------------------------------------------+
|  REST Controllers: apps.analytics.views (DRF 3.15)                            |
|  Aggregation Engine: MySQL 8.0 Window Functions & Aggregation Queries         |
|  Rollup Pipeline: Celery Beat periodic tasks running nightly / hourly rollups |
|  Database Engine: MySQL 8.0 `corridor_daily_kpis`, `block_efficiency_records` |
|  Cache Store: Redis 7.2 (DB 7) - Cached Dashboard KPI Cards (TTL 15 min)       |
+-------------------------------------------------------------------------------+
```

---

## 3. Database Schema & Persistence (MySQL 8.0)

### 3.1 Table Definitions

```sql
-- Daily Division & Corridor KPI Mart
CREATE TABLE `corridor_daily_kpis` (
  `id` CHAR(36) NOT NULL,
  `metric_date` DATE NOT NULL,
  `division_code` VARCHAR(10) NOT NULL,
  `corridor_code` VARCHAR(50) NOT NULL,
  `total_blocks_requested` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_blocks_sanctioned` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_blocks_executed` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_sanctioned_duration_minutes` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_actual_duration_minutes` INT UNSIGNED NOT NULL DEFAULT 0,
  `co_possession_blocks_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Blocks where 2 or more depts worked simultaneously',
  `total_train_delay_minutes_incurred` INT UNSIGNED NOT NULL DEFAULT 0,
  `corridor_punctuality_percentage` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  `computed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_daily_kpi_corridor_date` (`metric_date`, `division_code`, `corridor_code`),
  KEY `idx_daily_kpi_date` (`metric_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Granular Block Utilization Audit Records
CREATE TABLE `block_efficiency_records` (
  `id` CHAR(36) NOT NULL,
  `block_id` CHAR(36) NOT NULL,
  `planned_hours` DECIMAL(5,2) NOT NULL,
  `actual_hours` DECIMAL(5,2) NOT NULL,
  `burst_hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Duration exceeded beyond sanctioned window',
  `gang_utilization_score` DECIMAL(5,2) NOT NULL COMMENT 'Output per worker hour',
  `trains_delayed_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_delay_minutes` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_eff_block` (`block_id`),
  KEY `idx_eff_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. API Endpoints Specification

| Method | Endpoint | Permissions | Query Params | Response DTO | SLA (p95) |
|---|---|---|---|---|:---:|
| `GET` | `/api/v1/analytics/dashboard/summary/` | Authenticated | `?division=DLI&range=7d` | High-Level KPI Summary (Utilization, Punctuality, Co-Possessions) | < 80ms |
| `GET` | `/api/v1/analytics/corridors/comparison/` | Authenticated | `?start_date=2026-09-01` | Multi-Corridor Performance Matrix | < 120ms |
| `GET` | `/api/v1/analytics/reports/export/` | Controller/SE | `?type=MONTHLY_PDF` | Async Download URL for Generated Report | < 250ms |

---

## 5. Event-Driven Contracts

### 5.1 Consumed Events
- **`blocks.possession.completed`:** Ingests block end metrics and immediately updates `block_efficiency_records`.
- **`trains.delay.detected`:** Attributes delays occurring inside active block zones to corridor KPI tallies.
