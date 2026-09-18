# 00-implementation-checklist.md

> **File Sequence:** 45/45 (Master Living Document)  
> **Directory:** `09-execution-tracker/`  
> **Context:** Master Engineering Execution Tracker and Living Checklist monitoring implementation tasks across all phases of the Indian Railways AI Block Planning Platform (PS 26027). This document strictly enforces the interleaved execution model mandated by the project architecture: **[Backend Implementation] -> [Frontend Implementation] -> [End-to-End Testing & Verification]**.

---

# Master Engineering Implementation Checklist

*Note: As per the execution mandate, NO frontend task shall commence until its corresponding backend API/Logic is completely implemented. NO feature shall be marked complete until the full Backend + Frontend integration is tested and verified successfully.*

---

## Phase 0: Infrastructure & Foundation Setup

- [ ] **TSK-P0-01-BE:** Initialize Django 5.0 project, configure PostgreSQL 15 + PostGIS 3.3, and set up Redis/Celery.
- [ ] **TSK-P0-01-FE:** Initialize Vite + React 18 + Tailwind CSS frontend workspace with dark theme configuration.
- [ ] **TSK-P0-01-TEST:** Verify database connectivity, API health (`http://localhost:8000/api/v1/health/`), and frontend dev server (`http://localhost:3000`).

---

## Phase 1: Identity, Security & RBAC (`SVC-AUTH`)

### Feature: JWT Authentication & User Sessions
- [ ] **TSK-P1-01-BE:** Implement Argon2id User Profile, RBAC Roles, and JWT Token Login/Refresh API endpoints (`/api/v1/auth/login/`).
- [ ] **TSK-P1-01-FE:** Implement Zustand `authStore`, Axios interceptors, and Login Page UI with credential validation.
- [ ] **TSK-P1-01-TEST:** Perform E2E Login test, verify token storage in browser, and validate backend rejection of invalid credentials.

### Feature: Current User Context & Role Routing
- [ ] **TSK-P1-02-BE:** Implement `/api/v1/auth/me/` endpoint returning user profile and department context.
- [ ] **TSK-P1-02-FE:** Implement ProtectedRoutes in React Router based on user context.
- [ ] **TSK-P1-02-TEST:** Verify `COA`, `ENG`, `TRD`, and `SNT` test users are correctly routed to their respective dashboards.

---

## Phase 2: Core Domain Microservices (`SVC-BLK`, `SVC-TRN`, `SVC-DEPT`)

### Feature: Geospatial Corridor Definition
- [ ] **TSK-P2-01-BE:** Implement `Corridor` model with PostGIS `LINESTRING` and SRID 4326 API endpoints.
- [ ] **TSK-P2-01-FE:** Initialize Mapbox GL JS with Dark theme and render the West Bengal corridor GeoJSON layer.
- [ ] **TSK-P2-01-TEST:** Verify the 3D pitch Mapbox canvas successfully renders the PostGIS track geometry on the UI.

### Feature: Departmental Possession Block Request (ENG/TRD/SNT)
- [ ] **TSK-P2-02-BE:** Implement `Block` model and `POST /api/v1/blocks/` API for block proposal submission.
- [ ] **TSK-P2-02-FE:** Implement multi-step Possession Request Form (Wizard) with chainage and time-interval selection.
- [ ] **TSK-P2-02-TEST:** Submit a block request via the frontend and verify it persists correctly in the backend database.

### Feature: Sweep-line Spatial-Temporal Conflict Engine
- [ ] **TSK-P2-03-BE:** Implement PostGIS `ST_Intersects` and interval tree algorithm in Celery to detect overlapping blocks.
- [ ] **TSK-P2-03-FE:** Implement Gantt/Timeline deconfliction view and conflict warning badges in the UI.
- [ ] **TSK-P2-03-TEST:** Submit overlapping block requests and verify the frontend visually warns the user of the backend-detected conflict.

### Feature: Chief Controller (COA) Sanctioning
- [ ] **TSK-P2-04-BE:** Implement Sanction Block endpoint with optimistic locking (`version`).
- [ ] **TSK-P2-04-FE:** Implement COA Command Console with one-click sanctioning interface.
- [ ] **TSK-P2-04-TEST:** Approve a block via COA UI, verify `version` increments, and test concurrent sanctioning rejection.

### Feature: Train Schedule & Live Telemetry
- [ ] **TSK-P2-05-BE:** Implement `Train`, `TrainLiveStatus` models and ingestion worker for COA timetable feeds.
- [ ] **TSK-P2-05-FE:** Implement 60 FPS requestAnimationFrame train tracking markers on the Mapbox canvas.
- [ ] **TSK-P2-05-TEST:** Verify train markers move smoothly on the UI based on backend telemetry coordinates.

### Feature: Departmental Equipment & Gang Rosters
- [ ] **TSK-P2-06-BE:** Implement `Gang`, `MaintenanceEquipment` models and availability query APIs.
- [ ] **TSK-P2-06-FE:** Implement gang/equipment reservation pickers in the block request UI.
- [ ] **TSK-P2-06-TEST:** Verify gangs cannot be double-booked in the same time window across the frontend and backend.

---

## Phase 3: Advanced Intelligence & Real-Time (`SVC-ONTO`, `SVC-AST`, `SVC-NOTIF`)

### Feature: Real-Time WebSocket Dispatch
- [ ] **TSK-P3-01-BE:** Implement Daphne ASGI channels and Redis Pub/Sub for push-to-invalidate events.
- [ ] **TSK-P3-01-FE:** Implement `useCorridorSocket` hook to listen for events and invalidate TanStack Query cache.
- [ ] **TSK-P3-01-TEST:** Open two browser windows, approve a block in one, and verify the other updates instantly without refreshing.

### Feature: Asset Condition & Track Quality Index (TQI)
- [ ] **TSK-P3-02-BE:** Implement `TrackAsset`, `AssetDefectLog`, and automated emergency block generation on critical defect.
- [ ] **TSK-P3-02-FE:** Implement defect heatmaps on Mapbox and critical USFD flaw alert UI.
- [ ] **TSK-P3-02-TEST:** Trigger a simulated rail fracture in backend and verify the UI displays the flaw heatmap immediately.

### Feature: Emergency USFD Alert Modal & Chime
- [ ] **TSK-P3-03-BE:** Implement WebSocket broadcast `EMERGENCY_ALERT` payload generation for catastrophic flaws.
- [ ] **TSK-P3-03-FE:** Implement full-screen Emergency Containment Modal and Web Audio API chime.
- [ ] **TSK-P3-03-TEST:** Trigger an emergency broadcast and verify the frontend plays the loud audio chime and blocks the screen until acknowledged.

### Feature: Semantic Digital Twin & Ontology
- [ ] **TSK-P3-04-BE:** Implement HermiT DL rule reasoner via Celery to detect stranded electric train hazards (25kV OHE isolation rules).
- [ ] **TSK-P3-04-FE:** Implement hazard proof narrative display in the Block Review UI.
- [ ] **TSK-P3-04-TEST:** Propose an OHE block over an active electric train, verify backend reasoner flags it, and frontend prevents sanctioning.

---

## Phase 4: Observability, Hardening & Analytics

### Feature: Corridor Key Performance Indicators (KPI)
- [ ] **TSK-P4-01-BE:** Implement daily OLAP aggregations for punctuality, block counts, and TQI scores.
- [ ] **TSK-P4-01-FE:** Implement Big Screen Wallboard Dashboard with live KPI counters and charts.
- [ ] **TSK-P4-01-TEST:** Generate dummy block data and verify the Wallboard numbers update correctly.

### Feature: PDF Reporting & Audits
- [ ] **TSK-P4-02-BE:** Implement PDF report generation engine using WeasyPrint/ReportLab.
- [ ] **TSK-P4-02-FE:** Implement one-click "Download Corridor Report" button.
- [ ] **TSK-P4-02-TEST:** Click download, verify the PDF is generated perfectly with current tabular data.

### Feature: Load & Security Verification
- [ ] **TSK-P4-03-BE:** Perform k6 load testing (1000 VUs) and Bandit AST security scans.
- [ ] **TSK-P4-03-FE:** Run Vite build and verify zero production build errors.
- [ ] **TSK-P4-03-TEST:** Ensure end-to-end system remains responsive during load and passes all security checks.

---

## Phase 5: Final End-to-End System Acceptance

- [ ] **TSK-FINAL-01:** Execute Critical Scenario 1: Standard Maintenance Block Workflow (ENG -> COA).
- [ ] **TSK-FINAL-02:** Execute Critical Scenario 2: OHE Power Block with Electric Train Regulation (TRD -> COA).
- [ ] **TSK-FINAL-03:** Execute Critical Scenario 3: Emergency USFD Rail Fracture Containment.
- [ ] **TSK-FINAL-04:** Execute Critical Scenario 4: Concurrent Shadow Block Bundling (ENG + SNT).
- [ ] **TSK-FINAL-05:** Execute Critical Scenario 5: Wallboard Presentation Mode and Reporting.

---

## Quick Start / Run Guide (During Testing Phase)

To run the full stack during testing phases:
```powershell
.\scripts\start.ps1
```
- **Frontend SPA**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000/api/docs/`
- **Daphne WebSocket**: `ws://localhost:8001/ws/`
- **Grafana**: `http://localhost:3001`
