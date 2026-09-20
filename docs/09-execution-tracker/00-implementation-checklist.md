# 00-implementation-checklist.md

> **File Sequence:** 45/45 (Master Living Document)  
> **Directory:** `09-execution-tracker/`  
> **Context:** Master Engineering Execution Tracker and Living Checklist monitoring implementation tasks across all phases of the Indian Railways AI Block Planning Platform (PS 26027). This document strictly enforces the interleaved execution model mandated by the project architecture: **[Backend Implementation] -> [Frontend Implementation] -> [End-to-End Testing & Verification]**, with **Demo Data & Coherence Engine as the First-Class Foundation**.

---

# Master Engineering Implementation Checklist

*Critical Mandate: As per architecture specifications, NO frontend task shall commence until its corresponding backend API/Logic is completely implemented. NO feature shall be marked complete until the full Backend + Frontend integration is tested and verified. Furthermore, normal domain code relies entirely on the Master Coherent Demo Data System (`apps/demo/`); hence, Demo Data & Coherence Engine MUST be established first.*

---

## 0. Quick Start & Shutdown Commands
- **Start Project (Single Command):**
  - PowerShell: `.\scripts\start.ps1`
  - Windows Desktop: Double-click `Run Railway Project.bat` (or `scripts\start.bat`)
  - Linux/macOS: `./scripts/start.sh`
- **Stop Project (Single Command):**
  - PowerShell: `.\scripts\stop.ps1`
  - Windows Desktop: Double-click `Stop Railway Project.bat` (or `scripts\stop.bat`)
  - Linux/macOS: `./scripts/stop.sh`
  - Native Docker: `docker compose down`

---

## Phase 0: Infrastructure & Foundation Setup

- [x] **TSK-P0-01-BE:** Initialize Django 5.0 project, configure PostgreSQL 15 + PostGIS 3.3, and set up Redis 7.2 & Celery 5.3 worker queues.
- [x] **TSK-P0-01-FE:** Initialize Vite + React 18 + Tailwind CSS frontend workspace with dark control room design tokens.
- [x] **TSK-P0-01-TEST:** Verify database connectivity, PostGIS spatial extensions (`SRID 4326`), API health (`http://localhost:8000/api/v1/health/`), and frontend dev server (`http://localhost:3000`).

---

## Phase 0.5: Master Demo Data, Coherence Engine & Scenario Platform (`apps/demo`)

> *Prerequisite Gate: Without coherent ground-truth data, the 35 critical data-dependent features cannot function. This phase establishes the data universe before domain business logic.*

### Feature 1: Master Ground-Truth Data Universe (11 Core Entities)
- [x] **TSK-P0.5-01-BE:** Author static master datasets in `apps/demo/master_data/` (`stations.json`, `trains.json`, `users.json`, `assets.json`) for the NDLS–CNB 440km trunk corridor with exact PostGIS coordinates.
- [x] **TSK-P0.5-01-FE:** Build Master Data Inspector / GeoJSON visualizer component in the developer & admin console.
- [x] **TSK-P0.5-01-TEST:** Verify JSON loading into PostGIS models (`Corridor`, `Station`, `Train`, `UserProfile`, `UnifiedAsset`) with zero foreign key or geometry errors.

### Feature 2: 7 Coherence Rules Engine (`CoherenceEngine`)
- [x] **TSK-P0.5-02-BE:** Implement `apps/demo/coherence/` module enforcing the 7 immutable railway rules: Geography bounds, Time ordering, Resource exclusivity (40km/h travel physics), Train-block exclusion, Cross-department overlap, Asset ID triplets, and Fixed Seed (`26027`).
- [x] **TSK-P0.5-02-FE:** Build UI warning badges & toast notifications for coherence violations during block submission.
- [x] **TSK-P0.5-02-TEST:** Run `test_coherence.py` unit suite; verify impossible KM, reversed timestamps, and double-booked gangs raise `CoherenceViolation` and are rejected.


### Feature 3: Coherent Generators & 4 Operational Modes (`SEED`, `RANDOM`, `STREAM`, `SCENARIO`)
- [x] **TSK-P0.5-03-BE:** Implement `BaseDataGenerator`, `BlockGenerator`, `DefectGenerator`, `TrainPositionGenerator`, and `ConflictInjector` with weighted priority distributions.
- [x] **TSK-P0.5-03-FE:** Build Demo Controller Toolbar in UI (Mode Switcher, Stream Speed dial, Conflict Inject button).
- [x] **TSK-P0.5-03-TEST:** Generate 100 batch blocks across `RANDOM` and `SEED` modes; assert 100% compliance with `CoherenceEngine`.


### Feature 4: Dynamic Scenario Builder & The 4 Presentation Stories
- [x] **TSK-P0.5-04-BE:** Implement `BaseScenario` runner and the 4 golden demonstration scripts:
  - `Scenario A`: "Morning Dashboard" (2 mins, 8 scheduled blocks, "Why #1?" card)
  - `Scenario B`: "Conflict -> Combined Block" (USP #98, ENG + TRD overlap, 3.5h track time saved)
  - `Scenario C`: "Live Disruption & Breathing Plan" (#115 Delay Cascade, #116 Deviation)
  - `Scenario D`: "Zero-Fatality Digital Safety Protocol" (#71 Digital Token, LOTO, Headcount, Clearance Photo)
- [x] **TSK-P0.5-04-FE:** Build Interactive Scenario Player modal with Step-by-step Narration, Live Map Zooming, and Audio Chimes.
- [x] **TSK-P0.5-04-TEST:** Execute `python manage.py run_scenario eng_vs_trd_conflict --live --broadcast` end-to-end; verify step execution, DB state transitions, and WebSocket event receipt on the React frontend in <100ms.

### Feature 5: Management Commands & Continuous Streaming Engine
- [x] **TSK-P0.5-05-BE:** Implement `seed_railway_demo.py`, `stream_demo_data.py`, `run_scenario.py`, `list_scenarios.py`, and `reset_demo.py` management commands with Daphne WebSocket broadcast support.
- [x] **TSK-P0.5-05-FE:** Connect frontend WebSocket subscriber to corridor channel and verify live dynamic HUD counters updating without page refresh.
- [x] **TSK-P0.5-05-TEST:** Stream events for 60 seconds at 2Hz; confirm no memory leaks, no orphaned DB locks, and real-time DOM updates.

---

## Phase 1: Identity, Security & RBAC (`SVC-AUTH`)

### Feature: JWT Authentication & User Sessions
- [x] **TSK-P1-01-BE:** Implement Argon2id User Profile, RBAC Roles, and JWT Token Login/Refresh API endpoints (`/api/v1/auth/login/`) seeded with the 8 demo staff personas.
- [x] **TSK-P1-01-FE:** Implement Zustand `authStore`, Axios interceptors, and Login Page UI with credential validation and demo persona quick-switcher.
- [x] **TSK-P1-01-TEST:** Perform E2E Login test with `coa_delhi_chief` and `eng_track_pway`; verify token storage in browser and validate role-based route guarding.

### Feature: Current User Context & Role Routing
- [x] **TSK-P1-02-BE:** Implement `/api/v1/auth/me/` endpoint returning user profile, department code, and operational capabilities.
- [x] **TSK-P1-02-FE:** Implement ProtectedRoutes in React Router based on user context.
- [x] **TSK-P1-02-TEST:** Verify `COA`, `ENG`, `TRD`, and `SNT` test users are correctly routed to their respective departmental dashboards.

---

## Phase 2: Core Domain Microservices (`SVC-BLK`, `SVC-TRN`, `SVC-DEPT`)

### Feature: Geospatial Corridor Definition
- [x] **TSK-P2-01-BE:** Implement `Corridor` model with PostGIS `LINESTRING` and SRID 4326 API endpoints seeded by `apps/demo`.
- [x] **TSK-P2-01-FE:** Initialize Mapbox GL JS with Dark theme and render the NDLS–CNB trunk corridor GeoJSON layer with 3D perspective tilt (45°).
- [x] **TSK-P2-01-TEST:** Verify the 3D pitch Mapbox canvas successfully renders the PostGIS track geometry on the UI.

### Feature: Departmental Possession Block Request (ENG/TRD/SNT)
- [x] **TSK-P2-02-BE:** Implement `Block` model and `POST /api/v1/blocks/` API for block proposal submission with Coherence validation.
- [x] **TSK-P2-02-FE:** Implement multi-step Possession Request Form (Wizard) with chainage and time-interval selection.
- [x] **TSK-P2-02-TEST:** Submit a block request via the frontend and verify it persists correctly in the backend database.

### Feature: Sweep-line Spatial-Temporal Conflict Engine & Combined Block USP (#98)
- [x] **TSK-P2-03-BE:** Implement PostGIS `ST_Intersects` and interval tree algorithm in Celery to detect overlapping blocks and suggest AI Combined Blocks.
- [x] **TSK-P2-03-FE:** Implement Gantt/Timeline deconfliction view, conflict warning badges, and AI Combined Block Recommendation card (#98).
- [x] **TSK-P2-03-TEST:** Submit overlapping ENG and TRD block requests (from Scenario B) and verify the frontend visually flags the conflict and shows the combined block recommendation.

### Feature: Chief Controller (COA) Sanctioning
- [x] **TSK-P2-04-BE:** Implement Sanction Block endpoint with optimistic locking (`version`).
- [x] **TSK-P2-04-FE:** Implement COA Command Console with one-click sanctioning interface.
- [x] **TSK-P2-04-TEST:** Approve a block via COA UI, verify `version` increments, and test concurrent sanctioning rejection (HTTP 409).

### Feature: Train Schedule & Live Telemetry (#114, #116)
- [x] **TSK-P2-05-BE:** Implement `Train`, `TrainLiveStatus` models and ingestion worker for COA timetable feeds seeded with the 12 master trains.
- [x] **TSK-P2-05-FE:** Implement 60 FPS requestAnimationFrame train tracking markers on the Mapbox canvas with direction heading and speed badges.
- [x] **TSK-P2-05-TEST:** Verify train markers move smoothly on the UI based on backend telemetry coordinates.

### Feature: Departmental Equipment & Gang Rosters (#100, #101)
- [x] **TSK-P2-06-BE:** Implement `Gang`, `MaintenanceEquipment` models and availability query APIs seeded with the 6 gangs and 5 heavy machines.
- [x] **TSK-P2-06-FE:** Implement gang/equipment reservation pickers in the block request UI.
- [x] **TSK-P2-06-TEST:** Verify gangs cannot be double-booked in the same time window across the frontend and backend.

---

## Phase 3: Advanced Intelligence & Real-Time (`SVC-ONTO`, `SVC-AST`, `SVC-NOTIF`)

### Feature: Real-Time WebSocket Dispatch
- [x] **TSK-P3-01-BE:** Implement Daphne ASGI channels and Redis Pub/Sub for push-to-invalidate events (`INVALIDATE_CACHE`, `BLOCK_UPDATE`).

- [x] **TSK-P3-01-FE:** Implement `useCorridorSocket` hook to listen for events and invalidate TanStack Query cache.
- [x] **TSK-P3-01-TEST:** Open two browser windows, approve a block in one, and verify the other updates instantly without refreshing.

### Feature: Asset Condition, Risk Matrix & Track Quality Index (#92, #93, #94)
- [x] **TSK-P3-02-BE:** Implement `TrackAsset`, `AssetDefectLog`, CoF × LoF risk calculation, Defect Aging Score, and automated emergency block generation on critical defect.
- [x] **TSK-P3-02-FE:** Implement defect heatmaps on Mapbox, risk color chips, and "Why #1?" AI explanation card (#94).
- [x] **TSK-P3-02-TEST:** Trigger a simulated rail fracture in backend and verify the UI displays the flaw heatmap and "Why #1?" card immediately.

### Feature: Emergency USFD Alert Modal & Chime
- [x] **TSK-P3-03-BE:** Implement WebSocket broadcast `EMERGENCY_ALERT` payload generation for catastrophic flaws.
- [x] **TSK-P3-03-FE:** Implement full-screen Emergency Containment Modal and Web Audio API chime.
- [x] **TSK-P3-03-TEST:** Trigger an emergency broadcast and verify the frontend plays the loud audio chime and blocks the screen until acknowledged.

### Feature: Delay Cascade Recalculator (#115) & Semantic Digital Twin (`SVC-ONTO`)
- [x] **TSK-P3-04-BE:** Implement delay cascade propagation algorithm for downstream trains and HermiT DL rule reasoner via Celery for 25kV OHE isolation hazards.
- [x] **TSK-P3-04-FE:** Implement delay cascade impact matrix and hazard proof narrative display in the Block Review UI.
- [x] **TSK-P3-04-TEST:** Execute Scenario C (`rajdhani_delay_cascade`); verify delay propagation calculations and check that OHE power cutoff hazards prevent unauthorized sanctioning.

---

## Phase 4: Observability, Hardening & Analytics

### Feature: Corridor Key Performance Indicators (KPI)
- [x] **TSK-P4-01-BE:** Implement daily OLAP aggregations for punctuality, block counts, shadow block bundling ratios, and TQI scores.
- [x] **TSK-P4-01-FE:** Implement Big Screen Wallboard Dashboard with live KPI counters, charts, and 4K display optimization.
- [x] **TSK-P4-01-TEST:** Seed demo data and verify the Wallboard numbers update correctly.

### Feature: PDF Reporting & Audits
- [x] **TSK-P4-02-BE:** Implement official Block Sanction Order PDF generation engine using ReportLab.
- [x] **TSK-P4-02-FE:** Implement one-click "Download Corridor Report" button.
- [x] **TSK-P4-02-TEST:** Click download, verify the PDF is generated perfectly with current tabular data.

### Feature: Load & Security Verification
- [x] **TSK-P4-03-BE:** Perform k6 load testing (1,000 VUs) and Bandit AST security scans (0 high/medium issues).
- [x] **TSK-P4-03-FE:** Run Vite build and verify zero production build errors.
- [x] **TSK-P4-03-TEST:** Ensure end-to-end system remains responsive during load (<50ms p95) and passes all security checks.

---

## Phase 5: Final End-to-End System Acceptance & SIH Presentation Scenarios

- [x] **TSK-FINAL-01:** Execute Presentation Scenario A: "Morning Dashboard" (Chief Controller Login -> Corridor 3D Map -> 8 Blocks -> "Why #1?" Card).
- [x] **TSK-FINAL-02:** Execute Presentation Scenario B: "Conflict -> Combined Block USP" (ENG vs TRD Overlap -> AI Combined Suggestion -> 1-Click Sanction -> SMS).
- [x] **TSK-FINAL-03:** Execute Presentation Scenario C: "Live Disruption & Breathing Plan" (Rajdhani 45m Late -> Cascade Recalculator -> Window Shift -> Auto SMS).
- [x] **TSK-FINAL-04:** Execute Presentation Scenario D: "Zero-Fatality Digital Safety Protocol" (Digital Token #71 -> LOTO #81 -> Clearance Photo #82 -> Track GREEN).
- [ ] **TSK-FINAL-05:** Verify Wallboard Presentation Mode (`/bigscreen`) on 1080p and 4K displays with continuous live streaming (`stream_demo_data`).

---

## Quick Start / Run Guide

To run the full stack during development and testing:
```powershell
.\scripts\start.ps1
```
- **Frontend SPA**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:8000](http://localhost:8000)
- **Swagger Docs**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **Daphne WebSocket**: `ws://localhost:8001/ws/`
- **Grafana Observability**: [http://localhost:3001](http://localhost:3001)

### Demo Management Commands:
```powershell
# 1. Deterministic Seeding (Fixed Seed 26027)
python manage.py seed_railway_demo --seed 26027

# 2. Run Presentation Scenario
python manage.py run_scenario eng_vs_trd_conflict --live --broadcast

# 3. Continuous Event Stream (Demo Mode)
python manage.py stream_demo_data --rate 4.0 --duration 1800 --broadcast

# 4. Clean Slate Reset
python manage.py reset_demo --confirm
```
