# 00-service-template.md

> **File Sequence:** 16/45  
> **Previous Document:** [02-microservices/01-dependency-matrix.md](../02-microservices/01-dependency-matrix.md)  
> **Next Document:** [03-service-blueprints/01-accounts.md](01-accounts.md)  
> **Context:** Standard canonical template specification defining the required architectural structure, interfaces, schemas, and runtime contracts for all domain services in the Indian Railways AI Block Planning Platform (PS 26027).

---

# [SVC-ID]: [Service Official Name]

> **Service ID:** `SVC-[IDENTIFIER]`  
> **Django Bounded Context App:** `apps.[app_name]`  
> **Owning Team:** [Responsible Engineering Team]  
> **Lead Architect:** [Principal Systems Architect]  
> **Primary SLA:** [Availability %, Latency Targets (p95, p99)]  
> **Execution Model:** Synchronous REST API (Django/Daphne) + Asynchronous Task Workers (Celery/Redis)

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission
- Primary mandate of the service within the Indian Railways block scheduling domain.
- Core operational problem addressed (e.g., track possession deconfliction, crew roster allocation, catenary de-energization).
- Business criticality classification: `Safety-Critical`, `Operational-Core`, `Analytical`, or `Support`.

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - Explicit business rules, entity life cycles, state machines, and calculations owned by this domain.
- **Explicit Exclusions (Out of Scope):**
  - Responsibilities delegated to neighboring bounded contexts (e.g., credential hashing delegated to `SVC-AUTH`, timetable ingestion delegated to `SVC-TRN`).

---

## 2. Technical Stack & Infrastructure Runtime

```
+-------------------------------------------------------------------------+
|                        SVC-[ID] RUNTIME ARCHITECTURE                    |
+-------------------------------------------------------------------------+
|  Inbound Traffic: HTTP / HTTPS (REST API) & WSS (WebSocket ASGI)        |
|  Container Process: Daphne ASGI / Gunicorn WSGI Worker                  |
|  Application Framework: Django 5.0 + Django REST Framework 3.15         |
|  Persistence Layer: MySQL 8.0 (InnoDB, utf8mb4_unicode_ci)              |
|  Cache & Session Store: Redis 7.2 (Isolated Database Index)             |
|  Asynchronous Processing: Celery 5.3 Distributed Workers                |
|  Instrumentation: OpenTelemetry SDK, Prometheus Client, structlog      |
+-------------------------------------------------------------------------+
```

| Component | Technology | Version | Justification & Role |
|---|---|---|---|
| **Runtime Language** | Python | 3.11.8 | High-performance async support, stable scientific stack for algorithms |
| **Web Framework** | Django REST Framework | 3.15.x | Enterprise ORM, robust serialization, declarative authentication/permissions |
| **Relational Store** | MySQL | 8.0.36 | InnoDB ACID transactions, native spatial GIS engine (`LINESTRING`), JSON support |
| **In-Memory Cache** | Redis | 7.2.4 | Key-value caching, rate limiting counters, task broker |
| **Task Queue** | Celery | 5.3.6 | Decoupled background task execution and scheduled heartbeat maintenance |

---

## 3. Database Schema & Persistence (MySQL 8.0)

### 3.1 Table Definitions & Data Dictionary
Each service blueprint must document its authoritative MySQL 8.0 schema definitions, including exact data types, constraints, indexes, and volumetric estimates.

```sql
CREATE TABLE `[table_name]` (
  `id` CHAR(36) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.2 Key Indexes & Query Performance
- Primary Key, Foreign Key, Composite, and Spatial Indexes required to satisfy the service's read/write access patterns.
- Read/Write frequency ratios and partition strategy (if applicable).

### 3.3 Redis Caching Architecture
- Cache key namespace convention: `[service]:[entity]:[identifier]`.
- TTL strategies, serialization formats, cache eviction policies, and cache-stampede prevention (e.g., probabilistic early expiration).

---

## 4. API Endpoints Specification

| Method | Route Path | Auth Required | Role Permissions | Request DTO | Response DTO | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `GET` | `/api/v1/[domain]/` | Yes | Authenticated | Query Params | Paginated Collection | p95 < 80ms |
| `POST` | `/api/v1/[domain]/` | Yes | Role-Specific | Creation Schema | Created Entity DTO | p95 < 120ms |
| `GET` | `/api/v1/[domain]/{id}/` | Yes | Authenticated | URL Parameter | Entity Detail DTO | p95 < 50ms |
| `PUT/PATCH` | `/api/v1/[domain]/{id}/` | Yes | Role-Specific | Update Schema | Updated Entity DTO | p95 < 100ms |
| `DELETE` | `/api/v1/[domain]/{id}/` | Yes | Admin / Controller | URL Parameter | 204 No Content | p95 < 70ms |

---

## 5. Event-Driven Interfaces & Message Contracts

### 5.1 Events Published (Outbox Pattern)
| Event Name | Broker / Channel | Trigger Mechanism | Schema / Key Attributes |
|---|---|---|---|
| `[domain].[entity].[action]` | Redis `events:[domain]` | Domain state transition committed | `{ event_id, timestamp, actor_id, payload: {...} }` |

### 5.2 Events Subscribed (Inbound Event Handlers)
| Inbound Event | Source Service | Consumption Trigger | Idempotency Key |
|---|---|---|---|
| `[upstream].[entity].[action]` | `SVC-[UPSTREAM]` | Redis Consumer Task | `idemp:[event_name]:[event_id]` |

---

## 6. Security, Threat Surface & Governance

- **Authentication & Authorization:** Enforced via `JWTAuthentication` and DRF permission classes (`IsSectionEngineer`, `IsController`).
- **Input Sanitization:** Strong schema validation using `pydantic` or DRF `Serializers` to prevent injection and payload corruption.
- **Audit Logging:** Every mutating transaction logs an immutable audit entry to `audit_logs` capturing `user_id`, `ip_address`, `previous_state`, and `new_state`.

---

## 7. Configuration & Environment Variables

| Variable Name | Type | Required | Default Value | Purpose |
|---|---|:---:|---|---|
| `[SERVICE]_[SETTING_NAME]` | String/Int | Yes | — | Operational parameter or external secret |

---

## 8. Observability & Diagnostics

- **Liveness Probe:** `GET /api/v1/[domain]/health/liveness/` -> Returns `200 OK {"status": "UP"}`.
- **Readiness Probe:** `GET /api/v1/[domain]/health/readiness/` -> Validates MySQL connection and Redis accessibility.
- **Prometheus Metrics:** Custom counters, histograms (`http_request_duration_seconds`), and gauges.
