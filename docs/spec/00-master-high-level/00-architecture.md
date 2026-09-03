# 00-architecture.md

> **File Order:** 1/45  
> **Next File:** `00-master-high-level/01-decision-log.md`  
> **Connection:** The Tech Stack, Architecture Pattern, and External Integration decisions made in this file will be documented as decisions in `01-decision-log.md`.

---

## 1. Project Summary

| Subject | Details |
|--------|--------|
| **Project ID** | PS 26027 |
| **Project Name** | AI-Powered Automatic Block Planning for Indian Railways |
| **One-Line Pitch** | A Unified Block Planning Platform integrating separate systems (TMS, TDMS, SMMS) of three departments (Engineering, Traction, and Signal & Telecom), enabling cross-department impact reasoning via a Semantic Digital Twin. |
| **Project Type** | Web Application + Real-time Dashboard + AI Decision Support System |
| **Target Users** | Junior Engineers (ENG/TRD/SNT), Section Engineers, Control Office Administrators (COA), and Maintenance Crew of Indian Railways |
| **Expected Scale** | MVP / Hackathon Demo (100 concurrent users), future Division-level deployment (10K+ users) |
| **Geographic Focus** | West Bengal Railway Network — Howrah, Sealdah, Asansol, Kharagpur Division |

**Core Value Proposition:**  
Currently, three departments (Engineering, Traction Distribution, Signal & Telecom) request blocks in separate systems (TMS, TDMS, SMMS). The Control Office (COA/BDMS) monitors corridors separately. This results in conflicts, train operation halts, and increased asset downtime. Our platform unifies data from these three systems to create AI-optimized block schedules, detects and auto-resolves real-time conflicts, and automatically reasons "which signals, trains, and OHE sections will be affected if a specific track is blocked" using a Semantic Digital Twin.

---

## 2. Directory Structure

```text
railway-ai-block-platform/
├── 📁 backend/                          # Django Monolith
│   ├── 📁 accounts/                     # JWT Auth + RBAC (4 roles)
│   ├── 📁 blocks/                       # Block CRUD, approval workflow, conflict
│   ├── 📁 departments/                  # Crew, material, shift management
│   ├── 📁 ontology/                     # Owlready2 Digital Twin + SPARQL
│   ├── 📁 trains/                       # Train schedules, routes, impact calc
│   ├── 📁 assets/                       # Track, Signal, OHE inventory & health
│   ├── 📁 analytics/                    # Reports, PDF, dashboards, KPI
│   ├── 📁 notifications/                # SMS, Email, Push, WhatsApp
│   ├── 📁 railway_ai/                   # Django project settings
│   ├── 📁 static/                       # Admin static files
│   ├── 📁 templates/                    # HTML templates (admin, reports)
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── 📁 frontend/                         # React 18 + Vite
│   ├── 📁 src/
│   │   ├── 📁 components/               # Reusable UI (Map, Cards, Tables)
│   │   ├── 📁 pages/                    # Department dashboards, Control Room
│   │   ├── 📁 hooks/                    # Custom React hooks (auth, websocket)
│   │   ├── 📁 stores/                   # Zustand global state
│   │   ├── 📁 services/                 # API clients (axios instances)
│   │   ├── 📁 utils/                    # Helpers, formatters
│   │   ├── 📁 assets/                   # Icons, images
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── 📁 ontology/                         # OWL files (version controlled)
│   └── railway_digital_twin.owl
├── 📁 scripts/                          # Demo data generators
│   ├── seed_users.py
│   ├── seed_sections.py
│   ├── seed_trains.py
│   ├── seed_blocks.py
│   └── seed_conflicts.py
├── 📁 docs/                             # Project documentation
│   └── spec/                            # This specification folder
├── 📁 docker/                           # Docker configs
│   ├── docker-compose.yml
│   └── nginx.conf
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. C4 Model

### 3.1 System Context Diagram (Level 1)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Indian Railways Ecosystem                          │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
│  │   ENG Dept   │    │   TRD Dept   │    │   SNT Dept   │                │
│  │   (TMS UI)   │    │  (TDMS UI)   │    │  (SMMS UI)   │                │
│  │  Engineers   │    │  Engineers   │    │  Engineers   │                │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                │
│         │                   │                   │                          │
│         └───────────────────┼───────────────────┘                          │
│                             │                                              │
│                             ▼                                              │
│              ┌──────────────────────────────┐                             │
│              │  AI Block Planning Platform   │                             │
│              │  (PS 26027)                   │                             │
│              │  • Unified Dashboard           │                             │
│              │  • Conflict Detection          │                             │
│              │  • AI Resolution               │                             │
│              │  • Semantic Digital Twin       │                             │
│              └──────────────┬───────────────┘                             │
│                             │                                              │
│         ┌───────────────────┼───────────────────┐                         │
│         ▼                   ▼                   ▼                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
│  │  COA/BDMS    │    │   Crew       │    │  Passengers  │                │
│  │  Control Room│    │   Members    │    │  (Alerts)    │                │
│  └──────────────┘    └──────────────┘    └──────────────┘                │
│                                                                             │
│  External Systems:                                                          │
│  • NTES (Train Status) ───────► Read-only API                             │
│  • Open-Meteo (Weather) ──────► REST API                                  │
│  • Twilio (SMS) ──────────────► REST API                                  │
│  • Google Gemini AI ──────────► REST API                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Container Diagram (Level 2)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI Block Planning Platform                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Web Browser (User)                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │   │
│  │  │ ENG Dashboard│  │ TRD Dashboard│  │ SNT Dashboard│  │Control Room│ │   │
│  │  │ (React/Vite)│  │ (React/Vite) │  │ (React/Vite) │  │(Big Screen)│ │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘ │   │
│  └─────────┼────────────────┼────────────────┼───────────────┼───────┘   │
│            │                │                │               │            │
│            └────────────────┴────────────────┘               │            │
│                              │                               │            │
│                              ▼                               ▼            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Django Application (Monolith)                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │   │
│  │  │Accounts │ │ Blocks  │ │Ontology │ │ Trains  │ │Notifications│  │   │
│  │  │ (Auth)  │ │(Engine) │ │(Reason) │ │(Impact) │ │   (Alert)   │  │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └──────┬──────┘  │   │
│  │       └─────────────┴───────────┴───────────┴─────────────┘         │   │
│  │                              │                                       │   │
│  │  ┌───────────────────────────▼───────────────────────────────────┐   │   │
│  │  │              Django Channels (WebSocket)                      │   │   │
│  │  │         Real-time Block Updates + Conflict Alerts            │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│            ┌─────────────────┼─────────────────┐                           │
│            ▼                 ▼                 ▼                           │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐          │
│  │  PostgreSQL  │   │    Redis     │   │  Owlready2           │          │
│  │  (Primary DB)│   │  (Cache/Queue│   │  (Semantic Graph     │          │
│  │              │   │   /PubSub)   │   │   SQLite Quadstore)  │          │
│  └──────────────┘   └──────────────┘   └──────────────────────┘          │
│                                                                             │
│  External:                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                  │
│  │Google Gemini │   │   Twilio     │   │  Open-Meteo  │                  │
│  │   AI API     │   │   SMS API    │   │  Weather API │                  │
│  └──────────────┘   └──────────────┘   └──────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Component Diagram (Level 3) — Block & Ontology Engine

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Blocks App (Django)                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API Layer (DRF)                              │   │
│  │  POST /api/v1/blocks/          ─────► BlockRequestViewSet          │   │
│  │  GET  /api/v1/blocks/pending/  ─────► PendingBlockView             │   │
│  │  POST /api/v1/blocks/approve/  ─────► ApprovalView                 │   │
│  │  GET  /api/v1/blocks/conflicts/ ────► ConflictListView             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌───────────────────────────▼───────────────────────────────────────┐     │
│  │                      Service Layer                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │   │
│  │  │BlockService  │  │ConflictEngine│  │  AIResolverService       │ │   │
│  │  │• CRUD        │  │• Overlap     │  │  • Rule-based split      │ │   │
│  │  │• Validation  │  │• Detection   │  │  • Alternative suggest   │ │   │
│  │  │• Workflow    │  │• Flagging    │  │  • Gemini explanation    │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌───────────────────────────▼───────────────────────────────────────┐     │
│  │                      Ontology Layer (Owlready2)                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │   │
│  │  │DigitalTwin   │  │  SPARQL      │  │  Reasoner                │ │   │
│  │  │Manager       │  │  • Query     │  │  (HermiT)                │ │   │
│  │  │• sync_block  │  │  • Update    │  │  • Class inference       │ │   │
│  │  │• sync_train  │  │  • Reason    │  │  • Property chain        │ │   │
│  │  │• sync_asset  │  │              │  │  • Impact propagation    │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌───────────────────────────▼───────────────────────────────────────┐     │
│  │                      Repository Layer                                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │   │
│  │  │BlockRepo     │  │CrewRepo      │  │  AssetRepo               │ │   │
│  │  │(PostgreSQL)  │  │(PostgreSQL)  │  │  (PostgreSQL)            │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Deployment Diagram (Level 4)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Production (Railway/Render)                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Docker Host                                  │   │
│  │                                                                     │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │   │
│  │  │   Nginx     │    │  Gunicorn   │    │      Daphne             │ │   │
│  │  │  (Reverse   │───►│  (HTTP      │    │   (WebSocket            │ │   │
│  │  │   Proxy)    │    │   WSGI)     │    │    ASGI)                │ │   │
│  │  └─────────────┘    └─────┬───────┘    └───────────┬─────────────┘ │   │
│  │                           │                        │                │   │
│  │                    ┌──────┴──────┐          ┌──────┴──────┐        │   │
│  │                    │ Django App  │          │ Django App  │        │   │
│  │                    │  (REST API) │          │  (WS Conns) │        │   │
│  │                    └──────┬──────┘          └──────┬──────┘        │   │
│  │                           │                        │                │   │
│  │  ┌────────────────────────┼────────────────────────┼────────────┐ │   │
│  │  │                        ▼                        ▼            │ │   │
│  │  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐ │ │   │
│  │  │  │PostgreSQL│   │  Redis   │   │Owlready2 │   │ Celery  │ │ │   │
│  │  │  │   15     │   │    7     │   │ Quadstore│   │ Workers │ │ │   │
│  │  │  └──────────┘   └──────────┘   └──────────┘   └─────────┘ │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  External APIs (Internet):                                                  │
│  • Google Gemini API (generativelanguage.googleapis.com)                    │
│  • Twilio API (api.twilio.com)                                              │
│  • Open-Meteo API (api.open-meteo.com)                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack

| Layer | Technology | Version | Purpose | Alternative Rejected |
|-------|-----------|---------|---------|-------------------|
| **Frontend** | React | 18.2 | UI Component Library | Vue (team has more React experience) |
| **Frontend Build** | Vite | 5.0 | Fast dev server & bundling | Webpack (slow) |
| **Frontend State** | Zustand | 4.5 | Global state management | Redux (too much boilerplate) |
| **Frontend Styling** | Tailwind CSS | 3.4 | Utility-first CSS | Bootstrap (less customizable) |
| **Frontend Map** | Mapbox GL JS | 2.15 | Interactive dark-themed rail map | Leaflet (less 3D building support) |
| **Backend** | Django | 5.0 | Full-stack Python framework | FastAPI (lacks admin panel, weak ORM) |
| **Backend API** | Django REST Framework | 3.14 | REST API scaffolding | FastAPI (Django ecosystem is more mature) |
| **Backend Real-time** | Django Channels | 4.0 | WebSocket support | Socket.io standalone (complex Django integration) |
| **Backend Async** | Celery | 5.3 | Background task queue | RQ (less monitoring) |
| **Auth** | djangorestframework-simplejwt | 5.3 | JWT token auth | OAuth2 (overkill for hackathon) |
| **Database** | PostgreSQL | 15 | Primary relational DB | MySQL (weak GIS support) |
| **Cache/Queue** | Redis | 7 | Session, cache, pub/sub, Channels layer | RabbitMQ (Redis is more native to Python) |
| **Semantic Layer** | Owlready2 | 0.46 | OWL 2 ontology + reasoning | Apache Jena (Java stack, separate server) |
| **Graph Query** | SPARQL (built-in) | 1.1 | Ontology query language | Cypher (Neo4j — not native OWL) |
| **AI Text** | Google Gemini API | 1.5 Flash | Bengali/Hindi explanation, report | OpenAI GPT-4 (paid, weaker in Bengali) |
| **AI Backup** | Ollama + Phi-3 | 3.8B | Offline LLM fallback | Local Llama (high RAM requirement) |
| **SMS** | Twilio | Latest | Crew notification demo | AWS SNS (complex setup) |
| **Weather** | Open-Meteo API | 1.0 | Free weather data | IMD API (restricted access) |
| **Container** | Docker | 24 | Local development | Podman (team prefers Docker) |
| **Orchestration** | Docker Compose | 2.24 | Local multi-container | Kubernetes (overkill for MVP) |
| **Cloud** | Railway / Render | Free Tier | Cloud deployment | AWS (cost, complexity) |
| **Version Control** | Git + GitHub | Latest | Source control | GitLab (team prefers GitHub) |

---

## 5. Data Flows (Top 3 Use Cases)

### Use Case 1: Complete Block Lifecycle (No Conflict)

```text
┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  ENG JE  │──►│ POST /api/v1/│──►│ BlockService │──►│ PostgreSQL   │
│  Login   │   │ blocks/      │   │ • Validate   │   │ blocks table │
└──────────┘   │ {section,    │   │ • Save       │   │ row created  │
               │  time, work} │   │ • Queue      │   └──────┬───────┘
               └──────────────┘   └──────────────┘          │
                                                            │
┌──────────┐   ┌──────────────┐   ┌──────────────┐          │
│ Django   │◄──│ConflictEngine│◄──│ Redis Queue  │◄─────────┘
│ Signal   │   │ • Check      │   │ (sorted set) │
│ Trigger  │   │ • No overlap │   │ priority score│
└────┬─────┘   └──────────────┘   └──────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Ontology Sync (Owlready2)                            │
│  BlockEvent_001 rdf:type BlockEvent                                     │
│  BlockEvent_001 affectsSection HWH_KGP                                  │
│  BlockEvent_001 hasDepartment ENG                                       │
│  HWH_KGP hasStatus "PENDING"                                            │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   COA    │──►│ GET /api/v1/ │──►│ Analytics    │──►│ Affected     │
│ Dashboard│   │blocks/pending│   │ • Impact     │   │ Trains List  │
│          │   │              │   │ • Passenger  │   │ (SPARQL)     │
└──────────┘   └──────────────┘   └──────────────┘   └──────────────┘
     │
     ▼
┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   COA    │──►│ POST /api/v1/│──►│ Status:      │──►│ WebSocket    │
│ Approves │   │ blocks/1/    │   │ APPROVED     │   │ Broadcast    │
│          │   │ approve/     │   │ • SMS queued │   │ • Map RED    │
└──────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

### Use Case 2: Conflict Detection & AI Resolution

```text
┌──────────┐   ┌──────────────┐
│   ENG    │──►│ Block on     │
│          │   │ 02:00-04:00  │
│          │   │ HWH-KGP      │
└──────────┘   └──────┬───────┘
                      │
┌──────────┐   ┌──────▼───────┐   ┌──────────────────────────────────┐
│   TRD    │──►│ Block on     │──►│ CONFLICT DETECTED!               │
│          │   │ 02:30-05:00  │   │ • Same section                   │
│          │   │ HWH-KGP      │   │ • Time overlap: 02:30-04:00      │
└──────────┘   └──────────────┘   │ • Depts: ENG vs TRD              │
                                  └──────────────────────────────────┘
                                                    │
                                  ┌─────────────────┘
                                  ▼
                                  ┌───────────────────────────────┐
                                  │ AI Resolver (Rule Engine)     │
                                  │ • Priority: ENG=100, TRD=75   │
                                  │ • Decision: ENG 02:00-04:00   │
                                  │             TRD 04:30-06:30   │
                                  └───────────────┬───────────────┘
                                                  │
                                  ┌───────────────┴───────────────┐
                                  ▼                               ▼
                                  ┌─────────────────────┐   ┌─────────────────────┐
                                  │ Gemini API          │   │ Notification Service│
                                  │ "Explain in Bengali │   │ • SMS to ENG crew   │
                                  │ why ENG priority"   │   │ • SMS to TRD crew   │
                                  └─────────────────────┘   └─────────────────────┘
```

### Use Case 3: Emergency Block Override

```text
┌──────────┐   ┌──────────────┐   ┌──────────────────────────────────┐
│ Field    │──►│ POST /api/v1/│──►│ Emergency Flag: True             │
│ Engineer │   │ blocks/      │   │ • Skip approval queue            │
│ (Photo   │   │ emergency/   │   │ • Instant broadcast              │
│ upload)  │   │              │   │ • All depts notified             │
└──────────┘   └──────────────┘   └──────────────────────────────────┘
                                                    │
                                  ▼
                                  ┌───────────────────────────────┐
                                  │ WebSocket Broadcast (Channels)│
                                  │ • Control Room: RED Alert     │
                                  │ • Map: Section flashing RED   │
                                  │ • Dashboard: Emergency banner │
                                  └───────────────────────────────┘
                                                    │
                                  ▼
                                  ┌───────────────────────────────┐
                                  │ Ontology: Emergency Block     │
                                  │ • Auto-find diversion route   │
                                  │ • List affected trains        │
                                  │ • Suggest nearest crew        │
                                  └───────────────────────────────┘
```

---

## 6. External Integrations

| Name | Purpose | Method | Auth | Rate Limits | Fallback |
|------|---------|--------|------|-------------|----------|
| **Google Gemini API** | Conflict explanation, Bengali/Hindi report generation, chatbot response | REST POST `generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` | API Key (Header: `x-goog-api-key`) | 15 requests/min (free tier) | Ollama + Phi-3 local (offline mode) |
| **Twilio SMS API** | Crew notification, emergency alert, passenger delay alert | REST POST `api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json` | Basic Auth (SID + Token) | 1 msg/sec (trial) | In-app push notification only |
| **Open-Meteo API** | Weather advisory, monsoon/flood alert, fog detection | REST GET `api.open-meteo.com/v1/forecast` | None (free) | No strict limit | Static weather data (demo mode) |
| **NTES (Train Status)** | Train current position, schedule, delay info | Static JSON import (no live API available for hackathon) | N/A | N/A | Mock train data generator |
| **Mapbox GL JS** | Dark-themed interactive rail map, 3D buildings, animated markers | Client-side JS SDK + Tile API | Public Token (`pk.eyJ1...`) | 50,000 loads/month (free) | Leaflet + CartoDB Dark Matter tiles |

---

## 7. Deployment Architecture

### Development Environment

```text
Developer Laptop
├── Docker Desktop
│   ├── postgres:15 container
│   ├── redis:7-alpine container
│   ├── backend container (Django runserver)
│   ├── frontend container (Vite dev server)
│   └── celery worker container
└── Local .env file
```

### Staging/Production Environment (Railway/Render)

```text
Internet
 │
 ▼
Cloudflare DNS (optional)
 │
 ▼
Railway/Render Proxy (HTTPS termination)
 │
 ▼
┌─────────────────────────────────────────┐
│ Docker Container: railway-ai-backend    │
│ • Gunicorn (WSGI) on port 8000          │
│ • Daphne (ASGI) on port 8001            │
│ • Nginx sidecar for static files        │
│ • Environment variables from Railway    │
└─────────────────────────────────────────┘
 │
 ├──► Railway PostgreSQL (managed)
 ├──► Railway Redis (managed)
 └──► Owlready2 quadstore (persistent volume)
```

### CI/CD Pipeline (GitHub Actions)
```yaml
Trigger: push to main branch
Steps:
1. Checkout code
2. Run pytest (unit + integration)
3. Build Docker image
4. Push to Railway container registry
5. Railway auto-deploy
Rollback: `railway rollback` or git revert + redeploy
```

---

## 8. Security Architecture

### Authentication Flow

```text
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ User     │────►│ POST /api/v1/│────►│ Django       │
│ Login    │     │ auth/login/  │     │ • Validate   │
│ (Username│     │              │     │ • Generate   │
│ + Pass)  │     │              │     │   JWT pair   │
└──────────┘     └──────────────┘     └──────┬───────┘
                                             │
┌──────────┐     ┌──────────────┐            │
│ React    │◄────│ Response:    │◄───────────┘
│ Store    │     │ access_token │
│ (memory) │     │ refresh_token│
└──────────┘     └──────────────┘
```

- **Access Token**: HS256, 60 min expiry, payload: `{user_id, role, dept}`
- **Refresh Token**: HS256, 1 day expiry, stored in httpOnly cookie (if browser) or secure storage (mobile)
- **Token Refresh**: `POST /api/v1/auth/refresh/` with refresh token
- **Token Blacklist**: On logout, token added to Redis blacklist (TTL = token expiry)

### Authorization (RBAC)

| Role | Create Block | Approve Block | View All Blocks | Emergency Override | Admin Panel |
|------|--------------|---------------|-----------------|--------------------|-------------|
| ENG (JE) | Own dept only | No | Own dept only | Yes | No |
| TRD (JE) | Own dept only | No | Own dept only | Yes | No |
| SNT (JE) | Own dept only | No | Own dept only | Yes | No |
| COA | All depts | Yes | All depts | Yes | Yes |
| Section Engineer | Own dept | Own dept (up to 4 hrs) | Own dept | Yes | No |

### Data Protection
- **Passwords**: Django PBKDF2 + Argon2 (Django 5 default)
- **API Keys**: Environment variables only, never committed
- **Phone Numbers**: Masked in logs (e.g., `+91*****1234`)
- **Photos**: Stored with UUID filename, access controlled by block ownership
- **Ontology File**: Read-only in container, version controlled in Git
- **HTTPS**: Enforced in production (Railway/Render auto-SSL)
- **CORS**: Whitelist-only (`localhost:5173` in dev, production domain in prod)

---

## 9. Scalability Strategy

### Current (MVP — 100 concurrent users)
- **Monolith**: Single Django app, single PostgreSQL instance
- **Caching**: Redis for session + block queue + WebSocket channel layer
- **Ontology**: File-based SQLite quadstore (Owlready2 default)
- **Media**: Local filesystem (Docker volume)

### Phase 2 (1,000 users — Division Level)
- **Database**: PostgreSQL read replica for analytics/reporting queries
- **Cache**: Redis Cluster for session distribution
- **Ontology**: Migrate to Neo4j or Apache Jena Fuseki (if reasoning load increases)
- **Celery**: Multiple worker nodes with dedicated queues (high/default/low)
- **Static Files**: AWS S3 + CloudFront CDN

### Phase 3 (10,000+ users — Zonal Level)
- **Architecture**: Extract high-load services to separate containers
  - `notification-service` (standalone)
  - `ontology-service` (standalone with Jena Fuseki)
  - `analytics-service` (ClickHouse for time-series)
- **Database**: PostgreSQL partitioning by division (Howrah, Sealdah, etc.)
- **CDN**: Mapbox tiles + static assets via Cloudflare
- **Load Balancer**: Nginx upstream with health checks

### Performance Budgets (Frontend)

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.0s | Lighthouse |
| Bundle Size (initial) | < 200 KB (gzipped) | `vite-bundle-visualizer` |
| Map Load Time | < 2.0s | Mapbox Performance API |
| WebSocket Connection | < 500ms | Browser DevTools |
