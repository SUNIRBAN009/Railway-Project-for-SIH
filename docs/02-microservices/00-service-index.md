# 00-service-index.md

> **ফাইল ক্রম:** ১৪/৪৫  
> **পূর্ববর্তী ফাইল:** [01-tech-infra/09-testing-strategy.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/01-tech-infra/09-testing-strategy.md) (Safety-Critical Test Pyramid, PostGIS Spatial Tests, HermiT Proofs)  
> **পরবর্তী ফাইল:** [02-microservices/01-dependency-matrix.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/02-microservices/01-dependency-matrix.md)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে ভারতীয় রেলওয়ের এআই ব্লক প্ল্যানিং প্ল্যাটফর্মের (SIH PS26027) ১০টি কোর বাউন্ডেড সার্ভিস (Domain-Driven Design Bounded Contexts) ক্যাটালগ করা হয়েছে। প্রতিটি সার্ভিসের ডেটাবেজ স্কিমা ওনারশিপ (PostgreSQL 15 + PostGIS 3.3), সিঙ্ক্রোনাস REST API এবং অ্যাসিনক্রোনাস ইভেন্ট ইন্টারফেস, স্পেশিয়াল আরব্যাক স্কোপ এবং সার্ভিস-লেভেল SLA সুনির্দিষ্ট করা হয়েছে, যা পরবর্তী ফাইলে ইন্টার-সার্ভিস ডিপেনডেন্সি ও বুট অর্ডার ম্যাপিংয়ে ব্যবহৃত হবে।

---

## 1. Microservices Architecture & Bounded Contexts Overview

The platform is designed following **Domain-Driven Design (DDD)** principles as a high-performance **Modular Clean Monolith** with clear bounded contexts under `apps/`. Each service maintains strict schema isolation, domain encapsulation, and explicit contract boundaries.

This architecture enables frictionless in-process execution with zero network serialization overhead during normal operations, while ensuring that any service can be extracted into an independent microservice container (e.g., in a Kubernetes cluster or dedicated CRIS zonal server) without refactoring domain logic.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       API Gateway & Edge Layer                                         │
│                      SVC-GW (Nginx Reverse Proxy + React 18 Control Room SPA)                          │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │ HTTPS / WSS
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         Railway AI Platform Bounded Contexts (apps/)                                   │
│                                                                                                        │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐                    │
│  │        SVC-AUTH        │  │        SVC-BLK         │  │        SVC-TRN         │                    │
│  │ Identity & Spatial RBAC│  │ Block Engine & SAGA    │  │ Train Ops & Timetable  │                    │
│  │ `apps.accounts`        │  │ `apps.blocks`          │  │ `apps.trains`          │                    │
│  └───────────┬────────────┘  └───────────┬────────────┘  └───────────┬────────────┘                    │
│              │                           │                           │                                 │
│  ┌───────────┴────────────┐  ┌───────────┴────────────┐  ┌───────────┴────────────┐                    │
│  │        SVC-AST         │  │        SVC-DEPT        │  │        SVC-ONTO        │                    │
│  │ Asset Digital Twin & GIS│ │ Crews, Roster, Machine │  │ Symbolic AI & HermiT   │                    │
│  │ `apps.assets`          │  │ `apps.departments`     │  │ `apps.ontology`        │                    │
│  └───────────┬────────────┘  └───────────┬────────────┘  └───────────┬────────────┘                    │
│              │                           │                           │                                 │
│  ┌───────────┴────────────┐  ┌───────────┴────────────┐  ┌───────────┴────────────┐                    │
│  │        SVC-SAFE        │  │        SVC-NOTIF       │  │        SVC-ANA         │                    │
│  │ 15 Safety Gates (#71-85│  │ Multi-Channel Alerting │  │ Operational Analytics  │                    │
│  │ `apps.emergency`       │  │ `apps.notifications`   │  │ `apps.analytics`       │                    │
│  └────────────────────────┘  └────────────────────────┘  └────────────────────────┘                    │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
             ┌──────────────────────────────────────┴──────────────────────────────────────┐
             ▼                                                                             ▼
┌─────────────────────────────────────────┐                         ┌─────────────────────────────────────────┐
│     PostgreSQL 15 + PostGIS 3.3         │                         │             Redis 7 Broker              │
│   • Isolated Schemas per Bounded Context│                         │   • DB 0: Celery Task Queues (4 Queues) │
│   • GiST Spatial Track Geometries       │                         │   • DB 1: Daphne Channel Layer (WS)     │
│   • ACID Transactions & SAGA State      │                         │   • DB 2: L1 Query & Token Cache        │
└─────────────────────────────────────────┘                         └─────────────────────────────────────────┘
```

---

## 2. Master Service Catalog

| Service ID | Service Name | Django App | Primary Business Responsibility | Data Store Ownership (PostgreSQL 15 / PostGIS) | Primary Interface & Health Endpoint |
|---|---|---|---|---|---|
| **SVC-AUTH** | Identity & Spatial RBAC Service | `apps.accounts` | User authentication, JWT lifecycle, Argon2 hashing, 5 user roles, Spatial RBAC (#112), and biometric session sync | `accounts_user`, `accounts_userprofile`, `accounts_jurisdiction` | REST (`/api/v1/accounts/`)<br>`/api/v1/accounts/health/` |
| **SVC-BLK** | Block Planning & Conflict Engine | `apps.blocks` | Block proposal lifecycle, spatial/temporal conflict detection, Combined Block Windows (#98), 4-step SAGA orchestration | `blocks_corridor`, `blocks_block`, `blocks_conflict`, `blocks_saga_state` | REST & WS (`/api/v1/blocks/`)<br>`/api/v1/blocks/health/` |
| **SVC-TRN** | Train Operations & Punctuality | `apps.trains` | Network topology (GIS LineStrings), live timetable tracking, punctuality loss calculation, section clearance (#80) | `trains_section`, `trains_schedule`, `trains_position_log` | REST (`/api/v1/trains/`)<br>`/api/v1/trains/health/` |
| **SVC-AST** | Railway Infrastructure Asset Service | `apps.assets` | Track, Point, OHE line, Signal asset health records, USFD ultrasonic rail flaw alerts, predictive degradation | `assets_trackasset`, `assets_defect`, `assets_inspection` | REST (`/api/v1/assets/`)<br>`/api/v1/assets/health/` |
| **SVC-DEPT** | Department & Resource Service | `apps.departments` | ENGG, TRD, S&T, and OPTG gang crew rosters, heavy track machine (BCM/TTM) inventory, tool availability | `departments_dept`, `departments_gang`, `departments_equipment` | REST (`/api/v1/departments/`)<br>`/api/v1/departments/health/` |
| **SVC-ONTO** | Semantic Digital Twin & Symbolic AI | `apps.ontology` | OWL 2 DL knowledge graph, HermiT Reasoner physical safety proofs, zero-hallucination track interlocking validation | `ontology_sync_record`, `railway_digital_twin.owl` (SQLite Quadstore) | REST & SPARQL (`/api/v1/ontology/`)<br>`/api/v1/ontology/health/` |
| **SVC-SAFE** | Safety Compliance & Interlock Suite | `apps.emergency` | 15 safety suite gates (#71–#85): Digital Token, Headcount, Power Cut, LOTO, Weather, Tool Count, Geo-photos, PTW | `emergency_safety_token`, `emergency_loto_log`, `emergency_ptw` | REST (`/api/v1/emergency/`)<br>`/api/v1/emergency/health/` |
| **SVC-NOTIF** | Notification & Dispatcher Service | `apps.notifications`| Real-time WebSocket push, SMS alerts, Gemini 1.5 Flash bilingual translation (#94), escalations | `notifications_notification`, `notifications_delivery_log` | REST & WS (`/api/v1/notifications/`)<br>`/api/v1/notifications/health/` |
| **SVC-ANA** | Operational Analytics & Decision Support | `apps.analytics` | Corridor asset availability KPIs, block utilization efficiency, PDF/CSV divisional reports, audit compliance | `analytics_corridor_kpi`, `analytics_audit_record` | REST (`/api/v1/analytics/`)<br>`/api/v1/analytics/health/` |
| **SVC-GW** | API Gateway & Control Room UI | `frontend` / Nginx | Control room operator portal, interactive dark-mode Mapbox GIS rail map, Gantt timeline, reverse proxy routing | Static frontend bundle (`dist/`), Nginx edge cache | HTTP (:80/:443)<br>`/health/` |

---

## 3. Detailed Service Specifications

### 3.1 SVC-AUTH: Identity & Spatial RBAC Service
- **Service ID:** `SVC-AUTH`
- **Bounded Context:** User Identity, Authentication, and Spatial Authorization
- **Owning Module:** `apps.accounts`
- **PostgreSQL 15 / PostGIS Tables Owned:**
  - `accounts_user`: Django core user credentials, email, Argon2 password hash, active status.
  - `accounts_userprofile`: Employee ID, department code (`ENGG`, `TRD`, `SNT`, `OPERATIONS`), assigned role (`JUNIOR_ENGINEER`, `SECTION_CONTROLLER`, `CHIEF_CONTROLLER`, `DIVISIONAL_OFFICER`, `ADMIN`).
  - `accounts_jurisdiction`: Spatial polygon (`geometry(MultiPolygon, 4326)`) defining the divisional geographical boundary authorized for the officer (Feature #112).
- **Redis Keys Owned (DB 2):**
  - `auth:session:{user_id}`: Active session token hash (TTL: 8 hours).
  - `auth:blacklist:{jti}`: Blacklisted JWT token IDs on logout.
- **Public API Endpoints:**
  - `POST /api/v1/accounts/login/` — Issues access JWT (15-min) and refresh JWT (7-day).
  - `POST /api/v1/accounts/refresh/` — Rotates JWT token pair.
  - `POST /api/v1/accounts/logout/` — Adds token to Redis blacklist.
  - `GET /api/v1/accounts/profile/` — Returns current officer profile, department, and spatial boundaries.
- **SLA:** 99.99% Availability, p95 latency < 40ms.

---

### 3.2 SVC-BLK: Block Planning & Conflict Engine
- **Service ID:** `SVC-BLK`
- **Bounded Context:** Railway Track Possession, Planning, and Conflict Resolution
- **Owning Module:** `apps.blocks`
- **PostgreSQL 15 / PostGIS Tables Owned:**
  - `blocks_corridor`: Railway corridor definition (e.g. HWH-BWN), zone, division, PostGIS `track_geometry` (`geometry(LineString, 4326)`).
  - `blocks_block`: Possession request, status (`DRAFT`, `SUBMITTED`, `APPROVED`, `IN_PROGRESS`, `CLEARED`, `CANCELLED`), start/end KM chainage, `spatial_extent` (`geometry(LineString, 4326)`), proposed time window, work type.
  - `blocks_conflict`: Detected spatial/temporal overlap details, severity (`CRITICAL`, `WARNING`), resolution recommendations.
  - `blocks_saga_state`: 4-step compensating transaction state machine log.
- **Redis Keys Owned (DB 0 & DB 2):**
  - `cache:block:active:{corridor_id}`: Active approved and in-progress blocks.
  - `lock:track:segment:{corridor_id}:{km_start}_{km_end}`: Distributed track lock during approval.
- **Public API Endpoints:**
  - `GET /api/v1/blocks/` — List blocks with spatial, status, and department filters.
  - `POST /api/v1/blocks/` — Propose new maintenance block.
  - `POST /api/v1/blocks/{id}/approve/` — SAGA orchestration for block approval.
  - `POST /api/v1/blocks/{id}/reject/` — Reject proposal with mandatory remarks.
  - `POST /api/v1/blocks/{id}/commence/` — Verify 5 safety gates and mark `IN_PROGRESS`.
  - `POST /api/v1/blocks/{id}/clear/` — Section clearance certification and mark `CLEARED`.
  - `GET /api/v1/blocks/{id}/conflicts/` — Evaluate and return spatial/temporal collision matrix.
- **Events Published:**
  - `block.submitted`, `block.approved`, `block.rejected`, `block.commenced`, `block.cleared`, `conflict.detected`
- **SLA:** 99.95% Availability, p95 conflict evaluation latency < 150ms.

---

### 3.3 SVC-TRN: Train Operations & Network Service
- **Service ID:** `SVC-TRN`
- **Bounded Context:** Train Schedules, Movement Simulation, and Punctuality
- **Owning Module:** `apps.trains`
- **PostgreSQL 15 / PostGIS Tables Owned:**
  - `trains_section`: Station-to-station block section metadata, speed restriction, PostGIS line geometry.
  - `trains_schedule`: Timetabled train runs, train category (`RAJDHANI`, `EXPRESS`, `EMU_SUBURBAN`, `FREIGHT`), priority weighting.
  - `trains_position_log`: Real-time or simulated GPS/TMS train coordinates (`geometry(Point, 4326)`).
- **Public API Endpoints:**
  - `GET /api/v1/trains/sections/` — GeoJSON corridor section topology.
  - `GET /api/v1/trains/active/` — Real-time train positions and delay minutes.
  - `POST /api/v1/trains/impact-assessment/` — Calculates passenger delay minutes and punctuality loss for a candidate block window.
- **Events Published:**
  - `train.delayed`, `train.position_updated`, `section.cleared`
- **SLA:** 99.95% Availability, p95 latency < 80ms.

---

### 3.4 SVC-AST: Railway Infrastructure Asset Service
- **Service ID:** `SVC-AST`
- **Bounded Context:** Fixed Physical Infrastructure & Predictive Degradation
- **Owning Module:** `apps.assets`
- **PostgreSQL 15 / PostGIS Tables Owned:**
  - `assets_trackasset`: Track segments, Turnouts/Points, OHE Cantilever posts, Signals, Bridges. PostGIS location geometry.
  - `assets_defect`: USFD rail flaw reports, track geometry car (OMS) readings, defect severity (`IMMEDIATE_ATTENTION`, `OBSERVED`).
  - `assets_inspection`: Historical inspection logs, ultrasonic testing logs, asset health score (0–100).
- **Public API Endpoints:**
  - `GET /api/v1/assets/` — Query assets by corridor, chainage, and health category.
  - `POST /api/v1/assets/defects/` — Log ultrasonic rail defect (triggers automated emergency block proposal #105).
  - `GET /api/v1/assets/critical/` — List assets with health score < 40 requiring immediate block possession.
- **Events Published:**
  - `asset.defect_flagged`, `asset.health_degraded`
- **SLA:** 99.9% Availability, p95 latency < 100ms.

---

### 3.5 SVC-DEPT: Department & Resource Service
- **Service ID:** `SVC-DEPT`
- **Bounded Context:** Department Workforce, Machinery, and Materials
- **Owning Module:** `apps.departments`
- **PostgreSQL 15 / PostGIS Tables Owned:**
  - `departments_dept`: Department master (Engineering, Traction/TRD, Signal & Telecom/S&T, Operating/COA).
  - `departments_gang`: Maintenance gangs, Gang Leader (Mate/JE), assigned station base, crew headcount.
  - `departments_equipment`: Heavy on-track machines (BCM, TTM, Unimat, Tower Wagon), maintenance status, fitness certs.
- **Public API Endpoints:**
  - `GET /api/v1/departments/crews/` — Available maintenance gangs and rosters.
  - `POST /api/v1/departments/crews/assign/` — Allocate gang and track machine to a scheduled block.
  - `GET /api/v1/departments/machines/` — Operational status of specialized track machines.
- **Events Published:**
  - `crew.assigned`, `equipment.mobilized`
- **SLA:** 99.9% Availability, p95 latency < 60ms.

---

### 3.6 SVC-ONTO: Semantic Digital Twin Service
- **Service ID:** `SVC-ONTO`
- **Bounded Context:** Physical Ontology, OWL 2 DL Knowledge Graph, and Symbolic AI Reasoning
- **Owning Module:** `apps.ontology`
- **Storage Owned:**
  - `ontology/railway_digital_twin.owl` (Authoritative OWL 2 DL knowledge graph).
  - SQLite Quadstore (`/app/ontology/quadstore.db` - Embedded RDF triple cache).
  - `ontology_sync_record` in PostgreSQL (Tracks SQL $\leftrightarrow$ OWL synchronization state).
- **Public API Endpoints:**
  - `POST /api/v1/ontology/validate-interlocking/` — Executes HermiT Reasoner to prove zero safety contradictions.
  - `GET /api/v1/ontology/impact-query/` — SPARQL query returning all downstream affected signals and traction feeds for a given track block.
  - `GET /api/v1/ontology/status/` — Reasoner execution status, memory footprint, and OWL consistency flag.
- **Events Subscribed:**
  - `block.submitted`, `block.approved`, `block.cleared`
- **Events Published:**
  - `ontology.reasoning_passed`, `ontology.reasoning_failed`
- **SLA:** 99.9% Availability, p95 reasoning latency < 1200ms (Hard timeout: 30s).

---

### 3.7 SVC-SAFE: Safety Compliance & Interlock Suite
- **Service ID:** `SVC-SAFE`
- **Bounded Context:** 15 Permissive Safety Gates, Tokens, and Site Clearances (#71–#85)
- **Owning Module:** `apps.emergency`
- **PostgreSQL 15 / PostGIS Tables Owned:**
  - `emergency_safety_token`: Cryptographic HMAC-SHA256 digital authority tokens (#71).
  - `emergency_loto_log`: Lock-Out / Tag-Out electrical switch keys and photos (#74).
  - `emergency_ptw`: Digital Permit-to-Work issuance records with electronic sign-offs (#84).
  - `emergency_site_verification`: Geo-tagged timestamped photographs with PostGIS proximity check ($\pm 50$ meters) (#82).
- **Public API Endpoints:**
  - `POST /api/v1/emergency/tokens/issue/` — Issues HMAC-SHA256 digital safety token.
  - `POST /api/v1/emergency/gates/verify/` — Evaluates all 5 permissive pre-start safety gates.
  - `POST /api/v1/emergency/clearance/verify/` — Evaluates post-maintenance section clearance, tool counts, and track fitness.
- **Events Published:**
  - `safety.token_issued`, `safety.gates_verified`, `safety.clearance_certified`
- **SLA:** 99.99% Availability, p95 latency < 50ms (Zero-tolerance for downtime).

---

### 3.8 SVC-NOTIF: Notification & Dispatcher Service
- **Service ID:** `SVC-NOTIF`
- **Bounded Context:** Real-Time Push, Emergency SMS Broadcasts, and Bilingual Translation
- **Owning Module:** `apps.notifications`
- **PostgreSQL 15 Tables Owned:**
  - `notifications_notification`: User alerts, priority level (`CRITICAL`, `WARNING`, `INFO`), read status.
  - `notifications_delivery_log`: Twilio/Kavach SMS delivery receipts, WebSocket recipient tracking.
- **Public API Endpoints:**
  - `GET /api/v1/notifications/` — Unread alerts for the logged-in officer.
  - `POST /api/v1/notifications/{id}/acknowledge/` — Confirms receipt of critical safety alert.
  - `POST /api/v1/notifications/translate/` — AI bilingual explanation generation via Google Gemini 1.5 Flash (Feature #94).
- **Events Subscribed:**
  - `conflict.detected`, `block.approved`, `asset.defect_flagged`, `emergency.declared`
- **SLA:** 99.9% Availability, WebSocket delivery latency < 100ms, SMS dispatch < 5s.

---

### 3.9 SVC-ANA: Operational Analytics & Decision Support
- **Service ID:** `SVC-ANA`
- **Bounded Context:** Business Intelligence, KPIs, and Regulatory Reporting
- **Owning Module:** `apps.analytics`
- **PostgreSQL 15 Tables Owned:**
  - `analytics_corridor_kpi`: Daily/monthly corridor availability metrics, granted block vs requested hours.
  - `analytics_audit_record`: Immutable security and operational audit trail with user ID, IP address, and payload diff.
- **Public API Endpoints:**
  - `GET /api/v1/analytics/kpi/` — Executive KPI summary (Block Success Rate, Delay Savings).
  - `GET /api/v1/analytics/reports/pdf/` — Generates official Indian Railways Joint Block Program PDF.
  - `GET /api/v1/analytics/audit-trail/` — Query immutable system audit logs.
- **SLA:** 99.5% Availability, p95 query latency < 300ms.

---

### 3.10 SVC-GW: API Gateway & Control Room UI
- **Service ID:** `SVC-GW`
- **Bounded Context:** Presentation, Edge Routing, and Client Experience
- **Owning Module:** `frontend` + Nginx Edge Proxy
- **Components:**
  - React 18 SPA (Control Room Dark Mode, Gantt Chart Timeline, Mapbox GIS Rail Visualizer).
  - Nginx 1.25+ Reverse Proxy (TLS 1.3, Rate-limiting, Gzip compression, WebSocket Upgrade).
- **Public Ports:**
  - `:80` / `:443` (External WAN / Railnet).
  - Proxies to Gunicorn `:8000` (`/api/v1/`, `/admin/`) and Daphne `:8001` (`/ws/`).
- **SLA:** 99.99% Availability, First Contentful Paint (FCP) < 1.2s.

---

## 4. Service Isolation & Resource Quota Matrix

The platform guarantees strict resource ceilings across both local development (Docker Compose) and Zonal production environments:

| Service ID | Runtime Environment | Local CPU / Prod CPU | Local RAM / Prod RAM | Primary Database / State Store | Concurrency / Workers |
|---|---|:---:|:---:|---|:---:|
| **SVC-AUTH** | Python 3.11 / WSGI | 0.25 / 0.5 CPU | 128 MB / 256 MB | PostgreSQL `accounts_*` | In-process WSGI threads |
| **SVC-BLK** | Python 3.11 / WSGI + Celery | 0.50 / 1.5 CPU | 256 MB / 512 MB | PostgreSQL `blocks_*` + PostGIS | 4 Celery workers (`high`) |
| **SVC-TRN** | Python 3.11 / WSGI | 0.25 / 0.75 CPU| 128 MB / 256 MB | PostgreSQL `trains_*` + PostGIS | In-process WSGI threads |
| **SVC-AST** | Python 3.11 / WSGI | 0.25 / 0.5 CPU | 128 MB / 256 MB | PostgreSQL `assets_*` + PostGIS | In-process WSGI threads |
| **SVC-DEPT**| Python 3.11 / WSGI | 0.20 / 0.5 CPU | 128 MB / 256 MB | PostgreSQL `departments_*` | In-process WSGI threads |
| **SVC-ONTO**| Python 3.11 / HermiT (Java) | 0.75 / 2.0 CPU | 1.0 GB / 4.0 GB | OWL File + SQLite Quadstore | 2 Celery workers (`ontology`)|
| **SVC-SAFE**| Python 3.11 / WSGI + Celery | 0.25 / 0.75 CPU| 128 MB / 256 MB | PostgreSQL `emergency_*` | 4 Celery workers (`high`) |
| **SVC-NOTIF**| Python 3.11 / Channels + Celery | 0.25 / 0.75 CPU| 128 MB / 256 MB | PostgreSQL `notifications_*` | 4 Celery workers (`notify`)|
| **SVC-ANA** | Python 3.11 / Celery Beat | 0.25 / 0.5 CPU | 256 MB / 512 MB | PostgreSQL `analytics_*` | 4 Celery workers (`default`) |
| **SVC-GW**  | Nginx + Static Assets | 0.25 / 0.5 CPU | 64 MB / 128 MB | In-Memory Ephemeral Cache | Nginx Event Epoll |

---

## 5. Next File Dependency Note

> **পরবর্তী ফাইল:** [02-microservices/01-dependency-matrix.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/02-microservices/01-dependency-matrix.md)

`00-service-index.md` থেকে `01-dependency-matrix.md`-এ হ্যান্ডঅফ করা উপাদানসমূহ:

| Service Index Element | Dependency Matrix Processing in File 15 |
|---|---|
| **Service IDs (`SVC-AUTH` to `SVC-GW`)** | Construction of full $10 \times 10$ cross-service synchronous & asynchronous dependency matrix |
| **Schema Isolation Rules** | Verification that no service directly executes cross-context SQL JOINs or table writes |
| **Upstream / Downstream Graphs** | Algorithmic derivation of cold-boot container startup sequencing (Phases 0 through 4) |
| **Asynchronous Event Catalog** | Event topic subscriber graph, dead-letter queue routing, and idempotency key registry |
| **Cascade Failure Profiles** | Circuit breaker blast radius containment and SAGA compensating transaction rollbacks |
