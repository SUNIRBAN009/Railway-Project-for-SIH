# 00-service-index.md

> **ফাইল ক্রম:** ১৪/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/09-testing-strategy.md` (টেস্টিং ফ্রেমওয়ার্ক ও কোয়ালিটি গেট)  
> **পরবর্তী ফাইল:** `02-microservices/01-dependency-matrix.md`  
> **সংযোগ:** এই ফাইলে তালিকাভুক্ত প্রতিটি বাউন্ডেড সার্ভিস (`SVC-AUTH`, `SVC-BLK`, `SVC-DEPT`, `SVC-ONTO`, `SVC-TRN`, `SVC-AST`, `SVC-ANA`, `SVC-NOTIF`, `SVC-GATEWAY`)-এর রেসপনসিবিলিটি এবং ইন্টারফেস `01-dependency-matrix.md`-এ তাদের ইন্টার-সার্ভিস ডিপেনডেন্সি এবং বুট অর্ডার নির্ধারণে ব্যবহৃত হবে। পরবর্তীতে `03-service-blueprints/`-এ প্রতিটি সার্ভিসের বিস্তারিত ব্লুপ্রিন্ট তৈরি হবে।

---

## 1. Microservices Architecture Overview

PS 26027 প্রজেক্টটি একটি **Modular Monolith** প্যাটার্নে তৈরি হলেও এর প্রতিটি মডিউলকে কঠোরভাবে **Domain-Driven Design (DDD)** নীতিতে **Bounded Context** হিসেবে ডিজাইন করা হয়েছে। প্রতিটি সার্ভিসের নিজস্ব ডেটাবেজ টেবিল ও বিজনেস লজিক আইসোলেটেড, যাতে ভবিষ্যতে কোনো কোড রিরাইট ছাড়াই সহজে পৃথক ডকার কন্টেইনারাইজড মাইক্রোসার্ভিসে বিভক্ত করা যায়।

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API Gateway & Frontend                           │
│              SVC-GATEWAY (React 18 + Vite + Nginx Reverse Proxy)            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / WebSocket
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Railway SIH Bounded Contexts Services                  │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   SVC-AUTH   │  │   SVC-BLK    │  │   SVC-ONTO   │  │    SVC-TRN      │  │
│  │ User & RBAC  │  │ Block Engine │  │ Digital Twin │  │ Trains & Network│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                 │                 │                   │           │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌────────┴────────┐  │
│  │   SVC-DEPT   │  │   SVC-AST    │  │   SVC-NOTIF  │  │    SVC-ANA      │  │
│  │Crews & Stock │  │ Rail Assets  │  │ Alerts & SMS │  │ Reports & KPI   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
       ┌─────────────────────────┐           ┌─────────────────────────┐
       │     MySQL 8.0 Engine    │           │      Redis 7 Broker     │
       │   (Shared Logical DB,   │           │   (Pub/Sub, Caching,    │
       │    Isolated Tables)     │           │    Task Queue)          │
       └─────────────────────────┘           └─────────────────────────┘
```

---

## 2. Master Service Catalog Table

| Service ID | Service Name | Django App | Primary Responsibility | Owning Team | Tech Stack | Health Endpoint |
|------------|--------------|------------|------------------------|-------------|------------|-----------------|
| **SVC-AUTH** | Authentication & RBAC Service | `accounts` | ইউজার অথেনটিকেশন, JWT লাইফসাইকেল, পাসওয়ার্ড হ্যাশিং ও ৫টি রোলের RBAC পারমিশন এনফোর্সমেন্ট | Backend Security | Django 5, SimpleJWT, Argon2 | `/api/v1/auth/health/` |
| **SVC-BLK** | Block Management & Conflict Engine | `blocks` | ব্লক ক্রিয়েশন, ভ্যালিডেশন, রিয়েল-টাইম কনফ্লিক্ট ডিটেকশন (টাইম/স্প্যাশিয়াল ওভারল্যাপ), COA অ্যাপ্রুভাল ওয়ার্কফ্লো | Core Engine | Django 5, DRF, Celery | `/api/v1/blocks/health/` |
| **SVC-DEPT** | Department & Resource Service | `departments` | ইঞ্জিনিয়ারিং, ট্র্যাকশন ও সিগন্যাল বিভাগের গ্যাং ক্রু, শিফট রোস্টার এবং জরুরি সরঞ্জাম ইনভেন্টরি ম্যানেজমেন্ট | Operations | Django 5, MySQL 8.0 | `/api/v1/departments/health/` |
| **SVC-ONTO** | Semantic Digital Twin Service | `ontology` | Owlready2 OWL 2 DL রিপ্রেজেন্টেশন, HermiT রিজনার, ক্রস-ডিপার্টমেন্ট ইমপ্যাক্ট রিজনিং ও SPARQL কোয়েরি | AI & Semantic | Python, Owlready2, HermiT, RDFLib | `/api/v1/ontology/health/` |
| **SVC-TRN** | Train Operations & Network Service | `trains` | রেলওয়ে সেকশন টপোলজি, টাইমটেবিল রুট, সিমুলেটেড ট্রেন পজিশনিং ও যাত্রী বিলম্ব ক্যালকুলেশন | Train Ops | Django 5, MySQL Spatial, Celery | `/api/v1/trains/health/` |
| **SVC-AST** | Railway Infrastructure Asset Service | `assets` | ট্র্যাক, সিগন্যাল, OHE ওভারহেড তার ও পয়েন্টের স্বাস্থ্য পর্যবেক্ষণ এবং প্রিডিক্টিভ মেইনটেন্যান্স ট্র্যাকিং | Maintenance | Django 5, MySQL 8.0 | `/api/v1/assets/health/` |
| **SVC-ANA** | Analytics & Decision Support Service | `analytics` | করিডোর ইউটিলাইজেশন মেট্রিক্স, KPI ড্যাশবোর্ড, PDF/CSV রিপোর্ট জেনারেশন ও অডিট ভিজ্যুয়ালাইজেশন | Analytics | Django 5, ReportLab, Celery | `/api/v1/analytics/health/` |
| **SVC-NOTIF** | Notification & Dispatcher Service | `notifications` | মাল্টি-চ্যানেল নোটিফিকেশন (Twilio SMS, WebSocket ব্রডকাস্ট), বাংলা ট্রান্সলেশন (Gemini API) ও DLQ হ্যান্ডলিং | Platform | Celery, Twilio SDK, Channels | `/api/v1/notifications/health/` |
| **SVC-GATEWAY** | Web UI & API Gateway Service | `frontend` / Nginx | রিঅ্যাক্ট কন্ট্রোল রুম ইন্টারফেস, ইন্টারেক্টিভ ম্যাপবক্স রেল ম্যাপ এবং রিভার্স প্রক্সি রাউটিং | Frontend | React 18, Vite, Mapbox GL, Tailwind | `/health/` |

---

## 3. Detailed Service Specifications

### 3.1 SVC-AUTH: Authentication & RBAC Service
- **Service ID:** `SVC-AUTH`
- **Domain:** Identity & Access Management (IAM)
- **Tables Owned (MySQL 8.0):**
  - `users` (User credentials, role, department association, last login)
- **Redis Keys Owned:**
  - `session:{jwt_token_hash}` (Active sessions)
  - `blacklist:{jti}` (Revoked JWT refresh tokens)
- **Public API Endpoints:**
  - `POST /api/v1/auth/login/` — Authenticate and receive JWT pair
  - `POST /api/v1/auth/refresh/` — Rotate refresh token
  - `POST /api/v1/auth/logout/` — Invalidate token in Redis blacklist
  - `GET /api/v1/users/me/` — Fetch current user profile & role
- **Dependencies:**
  - Upstream: None
  - Downstream: `departments` (for user department assignment)
- **SLA:** 99.99% availability, p95 latency < 50ms

---

### 3.2 SVC-BLK: Block Management & Conflict Engine
- **Service ID:** `SVC-BLK`
- **Domain:** Railway Track Possession & Maintenance Planning
- **Tables Owned (MySQL 8.0):**
  - `block_requests` (Block details, status, KM range, work type, photos)
- **Redis Keys Owned:**
  - `cache:blocks:pending:{dept}` (Department pending list)
  - `cache:block:{id}` (Individual block details)
  - `conflict:active:{id}` (Unresolved conflict metadata)
  - `idemp:block:*` (Idempotency deduplication keys)
- **Public API Endpoints:**
  - `GET /api/v1/blocks/` — List blocks with role/department filters
  - `POST /api/v1/blocks/` — Submit new maintenance block proposal
  - `GET /api/v1/blocks/pending/` — Pending queue for COA / SE approval
  - `POST /api/v1/blocks/{id}/approve/` — SAGA approval orchestration
  - `POST /api/v1/blocks/{id}/reject/` — Reject block with reason
  - `POST /api/v1/blocks/emergency/` — Emergency instant block declaration
  - `GET /api/v1/blocks/conflicts/` — List detected schedule & track overlaps
  - `POST /api/v1/blocks/{id}/resolve/` — Apply AI-recommended conflict resolution
- **Events Published:**
  - `block.created`, `block.approved`, `block.rejected`, `block.completed`, `block.emergency`, `conflict.detected`, `conflict.resolved`
- **Dependencies:**
  - Upstream: `SVC-AUTH` (auth context), `SVC-TRN` (section validation), `SVC-DEPT` (crew assignment)
  - Downstream: `SVC-ONTO` (semantic graph sync), `SVC-NOTIF` (approval/emergency alerts), `SVC-ANA` (audit logs)
- **SLA:** 99.95% availability, p95 latency < 200ms

---

### 3.3 SVC-DEPT: Department & Resource Service
- **Service ID:** `SVC-DEPT`
- **Domain:** Department Workforce & Material Inventory
- **Tables Owned (MySQL 8.0):**
  - `departments` (ENG, TRD, SNT, COA)
  - `crews` (Maintenance gang units, rosters, shift timings)
  - `materials` (Spare rails, ballast, OHE wires, signal relays)
- **Redis Keys Owned:**
  - `cache:crews:available:{dept_id}`
- **Public API Endpoints:**
  - `GET /api/v1/departments/` — List railway departments
  - `GET /api/v1/crews/` — View maintenance gangs & availability
  - `POST /api/v1/crews/assign/` — Allocate crew gang to specific block
  - `GET /api/v1/materials/` — Check spare parts and machinery inventory
- **Events Published:**
  - `crew.assigned`, `material.low_stock`
- **Dependencies:**
  - Upstream: `SVC-AUTH`
  - Downstream: None
- **SLA:** 99.9% availability, p95 latency < 50ms

---

### 3.4 SVC-ONTO: Semantic Digital Twin Service
- **Service ID:** `SVC-ONTO`
- **Domain:** Knowledge Graph, Semantic Reasoning & Impact Analysis
- **Storage Owned:**
  - `ontology/railway_digital_twin.owl` (OWL 2 ontology file)
  - `ontology_sync` (MySQL sync status table)
  - SQLite Quadstore (Embedded RDF cache)
- **Redis Keys Owned:**
  - `cache:sparql:{hash}` (Cached SPARQL query results)
- **Public API Endpoints:**
  - `GET /api/v1/ontology/reason/?section={id}` — Infer affected trains, signals, and OHE power feeds
  - `GET /api/v1/ontology/sync/` — Current synchronization health between SQL and OWL
  - `POST /api/v1/ontology/query/` — Raw SPARQL analytical query (COA only)
- **Events Subscribed:**
  - `block.created`, `block.approved`, `block.completed`, `ontology.sync_requested`
- **Events Published:**
  - `ontology.reasoning_complete`
- **Dependencies:**
  - Upstream: `SVC-BLK`, `SVC-TRN`, `SVC-AST`
  - Downstream: `SVC-ANA`
- **SLA:** 99.9% availability, p95 reasoning latency < 1.5s

---

### 3.5 SVC-TRN: Train Operations & Network Service
- **Service ID:** `SVC-TRN`
- **Domain:** Network Infrastructure, Timetables & Passenger Traffic
- **Tables Owned (MySQL 8.0):**
  - `sections` (Corridor topology, stations, total KM, line type, Spatial LineString)
  - `trains` (Timetable schedules, priorities, live position simulation, delay minutes)
- **Redis Keys Owned:**
  - `cache:sections:all`
  - `cache:section:{id}:status`
  - `cache:train:{no}:schedule`
- **Public API Endpoints:**
  - `GET /api/v1/trains/sections/` — Network topology GeoJSON coordinates
  - `GET /api/v1/trains/` — List active trains and current delays
  - `GET /api/v1/trains/{id}/impact/` — Passenger and schedule impact of blocking a section
- **Events Published:**
  - `section.status_changed`, `train.position_updated`, `train.delayed`
- **Dependencies:**
  - Upstream: `SVC-AUTH`
  - Downstream: `SVC-GATEWAY` (Map markers), `SVC-NOTIF`
- **SLA:** 99.95% availability, p95 latency < 80ms

---

### 3.6 SVC-AST: Railway Infrastructure Asset Service
- **Service ID:** `SVC-AST`
- **Domain:** Physical Asset Health & Predictive Maintenance
- **Tables Owned (MySQL 8.0):**
  - `assets` (Tracks, Signals, OHE sections, Points, Bridges, Health Scores, Next Due)
- **Public API Endpoints:**
  - `GET /api/v1/assets/` — List assets with health scores
  - `GET /api/v1/assets/critical/` — Filter assets with health score < 50
  - `POST /api/v1/assets/{id}/inspection/` — Log inspection result and update health score
- **Dependencies:**
  - Upstream: `SVC-AUTH`, `SVC-TRN` (linked section)
  - Downstream: `SVC-ONTO`, `SVC-BLK` (maintenance block triggers)
- **SLA:** 99.9% availability, p95 latency < 100ms

---

### 3.7 SVC-ANA: Analytics & Decision Support Service
- **Service ID:** `SVC-ANA`
- **Domain:** Business Intelligence, Executive Reports & Audit
- **Tables Owned (MySQL 8.0):**
  - `audit_logs` (Immutable system change logs, partitioned by month)
- **Public API Endpoints:**
  - `GET /api/v1/reports/kpi/` — Block execution efficiency, conflict rate, downtime
  - `GET /api/v1/reports/pdf/` — Download formatted official division block report
  - `GET /api/v1/reports/audit/` — Filter audit logs by user, date, or entity ID
- **Events Subscribed:**
  - `audit.record_created`, `ontology.reasoning_complete`
- **Dependencies:**
  - Upstream: Reads from all services (via read-only aggregation queries)
  - Downstream: None
- **SLA:** 99.5% availability, p95 latency < 500ms

---

### 3.8 SVC-NOTIF: Notification & Dispatcher Service
- **Service ID:** `SVC-NOTIF`
- **Domain:** External Communication & Alerting
- **Tables Owned (MySQL 8.0):**
  - `notifications` (SMS and push message audit history)
- **Redis Queues Owned:**
  - Celery queue `notify`
  - `dlq:notify:sms` (Dead letter queue for failed SMS)
- **Public API Endpoints:**
  - `GET /api/v1/notifications/` — List unread and recent user alerts
  - `POST /api/v1/notifications/{id}/read/` — Mark alert as read
- **Events Subscribed:**
  - `block.approved`, `block.emergency`, `conflict.detected`, `train.delayed`
- **Events Published:**
  - `notification.sent`, `notification.failed`
- **External Integrations:**
  - Twilio SMS REST API, Google Gemini API (Bengali translations)
- **Dependencies:**
  - Upstream: `SVC-BLK`, `SVC-TRN`, `SVC-AUTH`
  - Downstream: None
- **SLA:** 99.9% availability, delivery latency < 10s

---

### 3.9 SVC-GATEWAY: Web UI & Client Gateway
- **Service ID:** `SVC-GATEWAY`
- **Domain:** User Interface & Reverse Proxy
- **Components:**
  - React 18 SPA (Control Room Dashboard, Department Portals, Live Rail Map)
  - Nginx Reverse Proxy (SSL termination, `/api/` and `/ws/` routing)
- **Public Endpoints:**
  - `http://localhost/` — Main Single Page Application
  - `http://localhost/api/v1/*` — Reverse proxied to Gunicorn backend
  - `ws://localhost/ws/blocks/` — Reverse proxied to Daphne ASGI WebSocket
- **Dependencies:**
  - Consumes APIs from all 8 backend bounded contexts
- **SLA:** 99.95% availability, FCP < 1.5s, TTI < 3.0s

---

## 4. Service Isolation & Resource Quotas

| Service | Runtime | CPU Quota (Local / Prod) | Memory Quota (Local / Prod) | Data Store |
|---------|---------|---------------------------|-----------------------------|------------|
| `SVC-AUTH` | Python 3.11 / Django | 0.25 CPU / 0.5 CPU | 128 MB / 256 MB | MySQL `users` |
| `SVC-BLK` | Python 3.11 / Django + Celery | 0.5 CPU / 1.0 CPU | 256 MB / 512 MB | MySQL `block_requests` |
| `SVC-DEPT` | Python 3.11 / Django | 0.2 CPU / 0.25 CPU | 128 MB / 128 MB | MySQL `departments`, `crews`, `materials` |
| `SVC-ONTO` | Python 3.11 / Owlready2 | 0.5 CPU / 1.0 CPU | 512 MB / 1024 MB | OWL File + SQLite Quadstore |
| `SVC-TRN` | Python 3.11 / Django + Spatial | 0.25 CPU / 0.5 CPU | 128 MB / 256 MB | MySQL `sections`, `trains` |
| `SVC-AST` | Python 3.11 / Django | 0.2 CPU / 0.25 CPU | 128 MB / 128 MB | MySQL `assets` |
| `SVC-ANA` | Python 3.11 / Celery Worker | 0.25 CPU / 0.5 CPU | 256 MB / 512 MB | MySQL `audit_logs` |
| `SVC-NOTIF`| Python 3.11 / Celery Worker | 0.25 CPU / 0.5 CPU | 128 MB / 256 MB | MySQL `notifications` + Redis DLQ |
| `SVC-GATEWAY`| Nginx + Vite SPA | 0.25 CPU / 0.5 CPU | 64 MB / 128 MB | Static dist + Proxy cache |

---

## 5. Next File Dependency Note

> পরবর্তী ফাইল: `02-microservices/01-dependency-matrix.md`

`00-service-index.md` থেকে `01-dependency-matrix.md`-এ নেওয়া হবে:

| Service Index Element | Dependency Matrix Impact |
|-----------------------|--------------------------|
| Service IDs (`SVC-AUTH` to `SVC-GATEWAY`) | Complete N x N cross-service dependency matrix |
| Database ownership | Verification that no service directly writes to another service's tables |
| Upstream/Downstream mappings | Determination of system build, database migration, and boot order |
| Event topic catalog | Asynchronous pub/sub dependency graph mapping |
| SLA and failure profiles | Cascade failure analysis and blast radius containment |

`01-dependency-matrix.md`-এ নিচের বিষয়গুলো থাকবে:
- Full Service Dependency Matrix (Synchronous, Asynchronous, Shared Resource)
- Service Initialization & Boot Order (Phase 0 to Phase 5)
- Circular Dependency Prevention Rules and code-level enforcement
- Failure Cascade Analysis, Circuit Breakers, and Blast Radius Mitigation
- Multi-service transaction boundaries and SAGA consistency rules
