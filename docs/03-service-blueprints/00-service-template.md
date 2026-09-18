# 00-service-template.md

> **ফাইল ক্রম:** ১৬/৪৫  
> **পূর্ববর্তী ফাইল:** [02-microservices/01-dependency-matrix.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/02-microservices/01-dependency-matrix.md) (Inter-Service Dependency Matrix, PostGIS Migration Sequencing, SAGA Protocol)  
> **পরবর্তী ফাইল:** [03-service-blueprints/01-accounts.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/01-accounts.md)  
> **সংযোগ ও উদ্দেশ্য:** এটি ভারতীয় রেলওয়ের এআই ব্লক প্ল্যানিং প্ল্যাটফর্মের (SIH PS26027) সকল বাউন্ডেড সার্ভিস ব্লুপ্রিন্টের জন্য **প্রমিত ক্যানোনিকাল আর্কিটেকচার টেমপ্লেট (Standard Canonical Architecture Template)**। ফোল্ডার `03-service-blueprints/`-এর প্রতিটি পরবর্তী সার্ভিস ফাইল (`01-accounts.md` থেকে `08-notifications.md`) এই কাঠামো, পোস্টজিআইএস ডেটা টাইপ, REST/WebSocket চুক্তি, ইভেন্ট স্কিমা এবং সেফটি গেট রুলস হুবহু অনুসরণ করবে।

---

# [SVC-TEMPLATE]: Canonical Service Blueprint Template

> **Service ID:** `SVC-[IDENTIFIER]` (e.g., `SVC-BLK`, `SVC-AUTH`, `SVC-TRN`)  
> **Bounded Context App:** `apps.[app_name]`  
> **Owning Team:** [Engineering Team: Core AI / Safety Suite / Platform Infrastructure / Train Operations]  
> **Business Criticality:** `Safety-Critical (SIL-2 equivalent)` / `Operational-Core` / `Analytical-Support`  
> **Primary SLA:** Availability $\ge 99.95\%$, p95 Latency $< 150\text{ ms}$, p99 Latency $< 300\text{ ms}$  
> **Execution Runtime:** Gunicorn WSGI (:8000) + Daphne ASGI (:8001) + Dedicated Celery 5.3 Worker Queue

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission & Railway Mandate
- **Mission Statement:** A concise, definitive statement of the service's primary responsibility within Indian Railways block scheduling and asset maintenance.
- **Problem Statement PS26027 Pillar Alignment:**
  - [ ] Pillar 1: Automated AI Conflict Detection & Deconfliction
  - [ ] Pillar 2: Joint Inter-Departmental Combined Block Windows (Feature #98)
  - [ ] Pillar 3: Permissive Safety & Site Execution Compliance (Features #71–#85)
  - [ ] Pillar 4: Predictive Asset Twin & Minimum Operational Disruption
- **Criticality Classification:**
  - `Safety-Critical`: Failure could cause physical train collision, electrocution (OHE live), or track derailment. Zero tolerance for unhandled errors.
  - `Operational-Core`: Failure delays block scheduling or real-time control room visibility.
  - `Analytical-Support`: Failure impacts post-operational reporting, KPIs, or audit archives.

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - Explicit list of business entities, life cycle state machines, domain invariants, and mathematical calculations owned exclusively by this service.
- **Explicit Exclusions (Out-of-Scope):**
  - Explicit list of delegated concerns handled by neighboring services (e.g., credential verification delegated to `SVC-AUTH`, physical track geometry owned by `SVC-TRN`, SMS delivery delegated to `SVC-NOTIF`).

---

## 2. Technical Stack & Infrastructure Runtime

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SVC-[ID] RUNTIME TOPOLOGY                                            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Inbound Traffic: HTTP REST API (:8000) & Real-Time Daphne WebSockets (:8001) via Nginx Proxy          │
│  Application Framework: Django 5.0 + Django REST Framework 3.15                                        │
│  Data Layer: PostgreSQL 15 + PostGIS 3.3 (SRID 4326 WGS84, GiST Spatial Indexing)                     │
│  In-Memory Layer: Redis 7.2 (DB 0: Celery Broker, DB 1: Channel Layer, DB 2: L1 Query Cache)           │
│  Worker Architecture: Celery 5.3 Worker on Queue: `[high | notify | ontology | default]`               │
│  Observability: OpenTelemetry Tracing, Prometheus Metrics Exporter, Structlog JSON Engine              │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Component | Technology | Version | Purpose & Railway Domain Justification |
|---|---|---|---|
| **Programming Language** | Python | 3.11.8 | High-performance async coroutines, stable geospatial C-bindings (GDAL/GEOS) |
| **Framework** | Django / DRF | 5.0.x / 3.15.x | Modular monolith clean architecture, robust ORM, declarative permissions |
| **Spatial Database** | PostgreSQL + PostGIS | 15.6 / 3.3 | ACID compliant, spatial intersection engine (`ST_Intersects`, `ST_DWithin`) |
| **Cache & Channel Broker** | Redis | 7.2.4 | In-memory distributed lock, Pub/Sub channel layer, Celery queue storage |
| **Worker Queue** | Celery | 5.3.6 | Dedicated queue assignment with isolated concurrency and memory ceiling |
| **ASGI Engine** | Daphne | 4.1.0 | Twisted-based asynchronous WebSocket streaming for control room telemetry |

---

## 3. Database Schema & Persistence (PostgreSQL 15 + PostGIS 3.3)

### 3.1 Table Definitions & Data Dictionary
Every service blueprint must declare its exact PostgreSQL 15 DDL with PostGIS spatial types, constraints, and audit timestamps:

```sql
-- =============================================================================
-- SVC-[ID] PostgreSQL 15 + PostGIS 3.3 DDL Specification
-- =============================================================================

CREATE TABLE [app_name]_[entity_name] (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Business Keys & Domain Attributes
    reference_code VARCHAR(32) NOT NULL UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    
    -- Geospatial PostGIS Column (SRID 4326 WGS-84)
    spatial_extent GEOMETRY(LineString, 4326) NOT NULL,
    center_point GEOMETRY(Point, 4326),
    
    -- Operational Attributes
    chainage_start_km NUMERIC(8, 3) NOT NULL CHECK (chainage_start_km >= 0),
    chainage_end_km NUMERIC(8, 3) NOT NULL CHECK (chainage_end_km > chainage_start_km),
    
    -- Optimistic Concurrency Control
    optimistic_version INT NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT chk_[entity]_status CHECK (status IN ('DRAFT', 'PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'))
);
```

### 3.2 Spatial & Composite Indexing Strategy
```sql
-- PostGIS Spatial Index for lightning-fast ST_Intersects evaluations
CREATE INDEX idx_[app]_[entity]_spatial_extent ON [app_name]_[entity_name] USING GIST (spatial_extent);
CREATE INDEX idx_[app]_[entity]_center_point ON [app_name]_[entity_name] USING GIST (center_point);

-- B-tree Composite Index for high-frequency queries
CREATE INDEX idx_[app]_[entity]_status_created ON [app_name]_[entity_name] (status, created_at DESC);
```

### 3.3 Redis Caching & Key Namespaces
- **Cache Key Pattern:** `railway:[service_id]:[entity_type]:[identifier]`
- **TTL Policies:**
  - Static Topology / Asset Metadata: TTL = 86,400s (24 hours).
  - Dynamic Block Possession Status: TTL = 300s (5 minutes) with proactive invalidation on state change.
  - Ephemeral Safety Tokens: TTL = 14,400s (4 hours) with strict single-use revocation.
- **Stampede Protection:** Probabilistic early expiration (XFetch algorithm) with Redis distributed mutex locks (`SET lock:entity NX EX 5`).

---

## 4. API Endpoints Specification

All REST APIs return the standard Indian Railways platform JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-18T10:00:00.000Z",
  "correlation_id": "b35975f5-cc5c-4d55-90cf-e0e124b2c600"
}
```

### Endpoint Routing Contract

| HTTP Method | Route Path | Auth Required | Role Permissions | Request DTO | Response DTO | SLA Target |
|---|---|:---:|---|---|---|:---:|
| `GET` | `/api/v1/[domain]/` | Yes | Authenticated | Pagination & Spatial Filters | Paginated Envelope List | p95 < 80ms |
| `POST` | `/api/v1/[domain]/` | Yes | `JUNIOR_ENGINEER`+ | Creation Payload Schema | Created Record DTO | p95 < 120ms |
| `GET` | `/api/v1/[domain]/{id}/` | Yes | Authenticated | URL UUID Parameter | Entity Detailed DTO | p95 < 40ms |
| `PATCH`| `/api/v1/[domain]/{id}/` | Yes | Role-Restricted | State Transition Payload | Updated Record DTO | p95 < 100ms |
| `POST` | `/api/v1/[domain]/{id}/[action]/` | Yes | `CHIEF_CONTROLLER` | Action Specific DTO | SAGA Execution Status | p95 < 150ms |

### Real-Time WebSocket Streaming Contract (Daphne Channels)
- **Channel Route:** `ws://[host]:8001/ws/[domain]/`
- **Broadcast Group:** `[domain]_[corridor_id]` (e.g., `control_room_HWH-BWN`)
- **Message Format:**
  ```json
  {
    "event": "[DOMAIN].[ACTION_TYPE]",
    "entity_id": "BLK-2026-0042",
    "timestamp": "2026-09-18T10:00:00Z",
    "payload": { ... }
  }
  ```

---

## 5. Event-Driven Message Contracts

### 5.1 Events Published (Transactional Outbox Pattern)

| Event Name | Queue / Group | Trigger Condition | JSON Payload Schema Summary |
|---|---|---|---|
| `[domain].[entity].created` | Redis DB 1 / Celery `default` | Database transaction committed | `{ "id": UUID, "code": STR, "corridor": STR, "timestamp": ISO8601 }` |
| `[domain].[entity].critical_alert` | Celery `high` | Safety threshold violated / conflict detected | `{ "alert_id": UUID, "severity": "CRITICAL", "km": FLOAT, "line": STR }` |

### 5.2 Events Subscribed (Inbound Event Handlers)

| Inbound Event Topic | Source Service | Consumption Trigger | Idempotency Key Pattern | Compensating Action on Failure |
|---|---|---|---|---|
| `[upstream].[entity].updated` | `SVC-[UPSTREAM]` | Celery Task Dispatch | `idemp:[event]:[uuid]` | Retry with exponential backoff; send to DLQ after 3 attempts |

---

## 6. Safety Compliance, Spatial RBAC & Security

### 6.1 Spatial RBAC Boundary Enforcement (Feature #112)
Every request modifying track possession or infrastructure state must pass spatial polygon intersection verification against the officer's authorized jurisdiction:
$$\text{ST\_Contains}(\text{Jurisdiction}_{\text{officer}}, \text{Location}_{\text{asset}}) = \text{TRUE}$$

### 6.2 Five Permissive Pre-Execution Safety Gates
For services managing physical track access, the following gates are mandatory before transitioning to `IN_PROGRESS`:
1. **Gate 1 (Digital Authority):** HMAC-SHA256 digital safety token verified (#71).
2. **Gate 2 (Biometric Muster):** Field gang headcount verification confirmed ($\ge 100\%$) (#72).
3. **Gate 3 (Traction Isolation):** TRD OHE catenary power cut and earthing confirmed (#73).
4. **Gate 4 (Physical LOTO):** Lock-Out / Tag-Out key interlocking switch confirmed (#74).
5. **Gate 5 (Environmental Clearance):** Real-time IMD weather check cleared (wind $< 60\text{ km/h}$, rain $< 50\text{ mm/h}$) (#75).

### 6.3 Audit Trail & Non-Repudiation
- Every mutating transaction writes to `analytics_audit_record` capturing:
  - `user_id`, `employee_id`, `client_ip`, `user_agent`.
  - `before_state_json` and `after_state_json` cryptographic diffs.
  - Strict append-only storage with zero `DELETE` privileges.

---

## 7. Configuration & Environment Variables

| Variable Name | Type | Required | Default Value | Security Level | Purpose |
|---|:---:|:---:|---|:---:|---|
| `[SERVICE]_DB_POOL_SIZE` | Int | Yes | `10` | Config | PostgreSQL connection pool size |
| `[SERVICE]_CACHE_TTL_SECONDS` | Int | Yes | `300` | Config | Redis L1 query cache TTL |
| `[SERVICE]_CIRCUIT_BREAKER_FAIL_MAX` | Int | Yes | `5` | Config | Consecutive failures before tripping breaker |
| `[SERVICE]_EXTERNAL_API_KEY` | String | If Ext | `None` | **Secret** | Cryptographic secret / API authentication key |

---

## 8. Observability & Health Check Protocol

- **Liveness Probe:** `GET /api/v1/[domain]/health/liveness/`
  - Returns: `200 OK {"status": "UP"}`. Verifies the WSGI/ASGI thread pool is responsive.
- **Readiness Probe:** `GET /api/v1/[domain]/health/readiness/`
  - Returns: `200 OK {"status": "READY", "postgres": "CONNECTED", "redis": "CONNECTED"}`.
- **Prometheus Metrics Exported:**
  - `[service]_requests_total{method, endpoint, status}` (Counter)
  - `[service]_request_duration_seconds{endpoint}` (Histogram, p50/p95/p99)
  - `[service]_active_operations{state}` (Gauge)
  - `[service]_conflict_rate{corridor}` (Counter)

---

## 9. Testing & Quality Assurance Mandate

Every service blueprint implementation must provide tests satisfying these gates:
- **Unit Tests:** $\ge 85\%$ line coverage on serializers, domain logic, and state machines.
- **Spatial PostGIS Tests:** 100% pass rate on `ST_Intersects` and boundary validation test suites.
- **Concurrency & Race Conditions:** Multi-threaded test verifying optimistic versioning and row-level locking (`select_for_update`).
- **Safety Gate Suite:** 100% branch coverage verifying that missing any permissive gate strictly aborts track possession.

---

## 10. Next File Dependency Note

> **পরবর্তী ফাইল:** [03-service-blueprints/01-accounts.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/01-accounts.md)

`00-service-template.md` স্পেসিফিকেশন সম্পূর্ণ প্রস্তুত। পরবর্তী ফাইল `01-accounts.md`-এ এই টেমপ্লেটের প্রতিটি ধারা অনুযায়ী **Identity, Spatial RBAC, User Profile, এবং Biometric Session Service (`SVC-AUTH`)**-এর প্রোডাকশন ব্লুপ্রিন্ট প্রণয়ন করা হবে।
