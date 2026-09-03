# PS 26027 - AI-Powered Automatic Block Planning for Indian Railways
## Master Project Blueprint & Understanding

### 1. 🎯 Project Core Objective (Problem Statement PS 26027)
Indian Railways currently manages maintenance block requests in silos across three main departments:
- **Engineering (ENG):** Track maintenance (uses TMS)
- **Traction Distribution (TRD):** OHE/Power maintenance (uses TDMS)
- **Signal & Telecom (SNT):** Signal maintenance (uses SMMS)

The **Control Office Administrator (COA)** manually resolves time and spatial conflicts and allocates sections. This leads to block rejections, train delays, and unoptimized "shadow block" opportunities (multiple departments doing work simultaneously on a closed track).

**The Solution:** A unified AI-Powered Block Planning System. It ingests block requests from all departments, uses a Conflict Engine to detect overlaps, leverages an AI Resolver (Rule-based + Gemini) to suggest optimal time splits, and uses a **Semantic Digital Twin (Owlready2 / OWL 2)** to logically reason out the impact on connected trains, signals, and assets. 

---

### 2. 🧩 Key Features & Capabilities
- **Multi-Role RBAC:** Dedicated dashboards for ENG, TRD, SNT Junior Engineers (JE), Section Engineers (SE), and COA.
- **Unified Block Request Workflow:** Submission -> Conflict Check -> COA Approval/Rejection -> Emergency Override.
- **AI Conflict Detection & Resolution:** Detects overlap in time & track section (e.g., `HWH-KGP`); AI suggests resolutions like splitting blocks or shifting schedules.
- **Semantic Digital Twin:** Built on Python's `Owlready2` and `RDFLib` (Quadstore). Maps physical relationships (e.g., *if Track A is blocked, Signal B is degraded, Train C is delayed*).
- **Geospatial Real-time Map:** Mapbox GL JS (with dark theme for control room). Shows track sections dynamically changing colors (FREE=Green, BLOCKED=Red, PENDING=Yellow).
- **Real-time Engine:** Django Channels + Redis for WebSocket broadcasts (instant alerts to control rooms).
- **Cross-SIH Integration:** 
  - AI predictions for train impact.
  - Crew & Material management modules.
  - Automated SMS/Push notifications (Twilio) to on-duty crews and affected passengers.
  - Gemini API integration for generating block rejection explanations in native languages (Bengali/Hindi).

---

### 3. 🏗️ Architecture & Tech Stack (Modular Monolith)
- **Backend:** Django 5.0 + Django REST Framework (DRF) 
- **Database:** PostgreSQL 15 (Relational Data), SQLite Quadstore (Ontology), Redis 7 (Cache, Sessions, Channels layer).
- **Real-time:** Django Channels + Daphne/ASGI.
- **Asynchronous Tasks:** Celery + Redis for notifications, ontology sync, PDF reports.
- **Frontend:** React 18 + Vite + Zustand (State) + TanStack Query (Server State) + Tailwind CSS (Dark UI).
- **Map Library:** Mapbox GL JS.
- **AI/LLM:** Google Gemini 1.5 Flash (Primary) with Ollama + Phi-3 (Fallback).
- **Deployment:** Docker, Railway / Render (Free Tier target).

---

### 4. 🗂️ Project Directory & Bounded Contexts
The backend follows a Modular Monolith pattern using Django apps as bounded contexts:
1. `accounts` (Auth, JWT, Users, RBAC)
2. `blocks` (Block CRUD, Conflict Engine, Workflow)
3. `ontology` (Digital Twin Manager, OWL 2, SPARQL Reasoning)
4. `trains` (Schedules, Route Impact, NTES mock data)
5. `departments` (Crew, Material, Shift management)
6. `assets` (Track, Signal, OHE health and inventory)
7. `analytics` (Reports, KPI Dashboards, PDF generation)
8. `notifications` (Twilio SMS, Email, Push)

---

### 5. 🗺️ Specification Roadmap (`ai-project-spec-generator` mapping)
The project documentation will be rigorously constructed across 10 folders (numbered `00` to `09`) with 40+ markdown files as defined in the master template. We have partially drafted the first few files in `Side/architecture.txt`:

- **00-master-high-level/** (Architecture, Decision Log, Glossary)
- **01-tech-infra/** (Backend Core, Frontend Core, Data Layer, Event Brokers, Internal APIs, Observability, Security, Workers, Deployment, Testing Strategy)
- **02-microservices/** (Service Index, Dependency Matrix)
- **03-service-blueprints/** (Deep dive into all 8 Django apps)
- **04-function-maps/** (Function ID registry per service)
- **05-deep-dive-logs/** (Error codes, State management, ADRs)
- **06-testing-qa/** (Test Plan, E2E Scenarios, Seeding)
- **07-roadmap/** (Phases, Milestones, Rollback Plan)
- **08-standards/** (Coding/API/Commit/AI Prompt standards)
- **09-execution-tracker/** (Implementation checklist)

---

### 6. 🚀 Execution Plan
1. **Finish the Specification Documentation:** We will iteratively write and save the remaining `.md` files as specified in the template.
2. **Setup Base Environments:** Scaffold the Django + React projects according to the finalized specs.
3. **Build Bounded Contexts (Apps) Step-by-Step:** 
   - Start with `accounts` (Auth).
   - Then build the core `blocks` logic.
   - Then implement the `ontology` and Digital Twin.
4. **Integrate Real-time & AI:** Connect Django Channels and the Gemini API.
5. **Develop Frontend:** Build the control room dashboard and Mapbox integrations.
6. **Testing & QA:** Data seeding, E2E functional testing, resolving conflicts.
