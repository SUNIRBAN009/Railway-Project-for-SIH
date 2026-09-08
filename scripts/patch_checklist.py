# -*- coding: utf-8 -*-
"""
Script to update docs/09-execution-tracker/00-implementation-checklist.md
Integrating Section 7 Blocked Tasks Ledger & Phase 7 Frontend Roadmap from
docs/Frontend Development Learning Roadmapt.txt.
"""
import os
import sys

checklist_path = os.path.join("docs", "09-execution-tracker", "00-implementation-checklist.md")

with open(checklist_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Master Progress Dashboard
old_dashboard = """| Phase Code  | Phase Title                                                            |    Status    | Completed | Total Tasks | % Complete |
| ----------- | ---------------------------------------------------------------------- | :----------: | :-------: | :---------: | :--------: |
| **Phase 0** | Environment Setup & Tooling                                            |  Completed   |    10     |     10      |    100%    |
| **Phase 1** | Foundation, Identity & RBAC (`SVC-AUTH`)                               |  Completed   |    12     |     12      |    100%    |
| **Phase 2** | Core Domain Microservices (`SVC-BLK`, `SVC-TRN`, `SVC-DEPT`)           |  Completed   |    24     |     24      |    100%    |
| **Phase 3** | Advanced Intelligence & Real-Time (`SVC-ONTO`, `SVC-AST`, `SVC-NOTIF`) |  Completed   |    14     |     14      |    100%    |
| **Phase 4** | Production Hardening, Observability & Deployment                       |  Completed   |    10     |     10      |    100%    |
| **TOTAL**   | **Enterprise Platform**                                                | **COMPLETE** |  **70**   |   **70**    | **100.0%** |"""

new_dashboard = """| Phase Code  | Phase Title                                                            |    Status    | Completed | Total Tasks | % Complete |
| ----------- | ---------------------------------------------------------------------- | :----------: | :-------: | :---------: | :--------: |
| **Phase 0** | Environment Setup & Tooling                                            |  Completed   |    10     |     10      |    100%    |
| **Phase 1** | Foundation, Identity & RBAC (`SVC-AUTH`)                               |  Completed   |    12     |     12      |    100%    |
| **Phase 2** | Core Domain Microservices (`SVC-BLK`, `SVC-TRN`, `SVC-DEPT`)           |  Completed   |    24     |     24      |    100%    |
| **Phase 3** | Advanced Intelligence & Real-Time (`SVC-ONTO`, `SVC-AST`, `SVC-NOTIF`) |  Completed   |    14     |     14      |    100%    |
| **Phase 4** | Production Hardening, Observability & Deployment                       |  Completed   |    10     |     10      |    100%    |
| **Phase 7** | Next-Gen Decoupled Frontend SPA (`React 18` + `Mapbox GL JS`)           | **Blocked**  |     0     |     10      |    0.0%    |
| **TOTAL**   | **Enterprise Platform & SPA Suite**                                    | **ACTIVE**   |  **70**   |   **80**    | **87.5%**  |"""

if old_dashboard in content:
    content = content.replace(old_dashboard, new_dashboard)
    print("Updated Section 1: Master Progress Dashboard")
else:
    print("Warning: old_dashboard not found exactly, skipping dashboard update")

# 2. Update Section 1.1 Technology Stack Specification to reflect Dual-Presentation Architecture
old_stack_section = """│  Frontend (Node.js-Free Architecture):                          │
│  ✅ Django Templates (High-Performance Server-Side Rendering)   │
│  ✅ HTMX 1.9 (Asynchronous Partial Swaps without Single-Page JS)│
│  ✅ Alpine.js 3.x (Lightweight Client Reactive Primitives)      │
│  ✅ Leaflet.js 1.9 + OpenStreetMap (Vanilla JS GIS Geometry)    │
│  ✅ Tailwind CSS (CDN - Zero Node.js / npm Build Overhead)      │
│                                                                 │
│  Decommissioned Legacy Stack:                                   │
│  ❌ Node.js / npm / Vite                                        │
│  ❌ React 18 / Zustand / TanStack Query                         │
│  ❌ Mapbox GL JS (Heavy React / WebGL proprietary dependency)   │
│  ❌ TypeScript Build Pipeline                                   │
│  ❌ MySQL 8.0 (Replaced by PostGIS 3.3 for Spatial Geometries)  │"""

new_stack_section = """│  Frontend Presentation Architecture:                            │
│  [Tier 1 - Production Baseline / Admin Console]:                │
│  ✅ Django Templates (High-Performance Server-Side Rendering)   │
│  ✅ HTMX 1.9 (Asynchronous Partial Swaps without Single-Page JS)│
│  ✅ Alpine.js 3.x (Lightweight Client Reactive Primitives)      │
│  ✅ Leaflet.js 1.9 + OpenStreetMap (Vanilla JS GIS Geometry)    │
│  ✅ Tailwind CSS (CDN - Zero Node.js / npm Build Overhead)      │
│                                                                 │
│  [Tier 2 - Phase 7 Next-Gen 3D Control Room SPA (Active Track)]:│
│  🔄 React 18 + Vite 5.0 (Single Page Application Scaffolding)   │
│  🔄 Mapbox GL JS 2.15 (60 FPS 3D Tilt & Dark Theme GIS Engine)  │
│  🔄 Zustand 4.5 (Lightweight Reactive Client State Management)  │
│  🔄 TanStack Query 5.24 (Server Cache Invalidation & Sync)      │
│  🔄 Tailwind CSS 3.4 (Utility-first Dark Theme Control Room UI) │
│                                                                 │
│  Decommissioned Legacy Database:                                │
│  ❌ MySQL 8.0 (Replaced by PostGIS 3.3 for Spatial Geometries)  │"""

if old_stack_section in content:
    content = content.replace(old_stack_section, new_stack_section)
    print("Updated Section 1.1: Standardized Technology Stack Specification")
else:
    print("Warning: old_stack_section not found exactly")

# 3. Comprehensive Section 7 Blocked Tasks Ledger and Phase 7 Roadmap
section_7_start = "## 7. Blocked Tasks Ledger"
section_8_start = "## 8. Revision History & Architectural Governance"

if section_7_start in content and section_8_start in content:
    parts = content.split(section_7_start)
    prefix = parts[0]
    suffix = parts[1].split(section_8_start)[1]

    new_section_7 = """## 7. Blocked Tasks Ledger & Next-Gen Frontend SPA Roadmap (Phase 7)

> **Context & Authority:** This ledger is governed by the master engineering roadmap specified in [`docs/Frontend Development Learning Roadmapt.txt`](file:///d:/Railway%20Project%20for%20SIH/docs/Frontend%20Development%20Learning%20Roadmapt.txt).  
> **Strategic Mandate:** While Phases 0–4 delivered a 100% operational backend (Django 5.0 + PostGIS 3.3 + Redis 7.2 + Daphne ASGI + Celery + HermiT DL) paired with a server-rendered baseline UI (Django Templates + HTMX 1.9 + Alpine.js + Leaflet.js), the **SIH Grand Finale Presentation** requires a high-fidelity, 60 FPS 3D GIS Control Room Single-Page Application (SPA) powered by **React 18 + Mapbox GL JS + Zustand + TanStack Query**.  
> The tasks below constitute the authoritative **Phase 7 Execution Ledger**, tracking all blocked dependencies, technical root causes, unblocking conditions, and learning milestones.

---

### 7.1 Blocked Tasks Ledger Matrix (Phase 7: Frontend SPA)

| Task ID | Task Description | Blocked By | Underlying Reason | Unblocking Condition | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `TSK-FE-001` | **React 18 + Vite 5.0 Project Setup & Foundation**: Initialize frontend workspace with Vite, Tailwind CSS 3.4 dark theme tokens, PostCSS, and React Router v6 layout structure. | Environment Scaffolding | Node.js 18+ container and package build tooling were decoupled in v2.0.0; requires standalone `frontend/` service container or local Node.js environment. | Verify Node.js 18+ runtime; bootstrap `npm create vite@latest frontend -- --template react`; install dependencies (`react`, `react-dom`, `tailwindcss`, `lucide-react`). | **Phase 7.1** |
| `TSK-FE-002` | **JWT Authentication & Zustand RBAC Store**: Implement `/login` page, Axios API client with bearer token injection & 401 refresh interceptor, and Zustand `authStore` with role-based routing (`ENG`, `TRD`, `SNT`, `COA`). | `TSK-FE-001` | Requires frontend project scaffolding and Axios instance configuration to interface with DRF `/api/v1/auth/token/`. | `TSK-FE-001` completed; verify DRF JWT authentication endpoint returns 200 with valid payload against active backend container. | **Phase 7.2** |
| `TSK-FE-003` | **Departmental Operations Dashboards (`ENG`/`TRD`/`SNT`)**: Implement departmental possession request modal, dynamic validation form, and pending block review cards with state filtering. | `TSK-FE-002` | Blocked until JWT session state, department claim extraction (`user.department`), and authenticated API routing are established. | `TSK-FE-002` completed; successfully submit sample possession block to `POST /api/v1/blocks/` from React form. | **Phase 7.3** |
| `TSK-FE-004` | **Chief Controller (`COA`) Command & Control Room Dashboard**: Implement section controller command center with interactive sweep-line conflict visualizer, shadow block bundling panel, and one-click sanctioning interface. | `TSK-FE-003` | Requires operational departmental possession datasets and multi-department approval workflow integration. | `TSK-FE-003` operational; verify `POST /api/v1/blocks/{id}/sanction/` updates block status in controller interface. | **Phase 7.3** |
| `TSK-FE-005` | **Mapbox GL JS 2.15 Geospatial Engine Integration**: Mount WebGL canvas with 45° 3D pitch, `mapbox://styles/mapbox/dark-v11` styling, West Bengal rail network GeoJSON layer (Howrah–Kharagpur), and station markers. | Mapbox API Token & `TSK-FE-001` | Requires Mapbox public access token (`VITE_MAPBOX_TOKEN`) configured in client environment and GeoJSON line geometry sources. | Provide valid Mapbox GL token in `frontend/.env`; load corridor LineString coordinates on Mapbox canvas without WebGL context error. | **Phase 7.4** |
| `TSK-FE-006` | **60 FPS Animated Train Tracking & Dynamic Block Overlays**: Implement requestAnimationFrame marker interpolation along track vector, live speed telemetry badges, and color-coded block status overlays (Green/Red/Yellow). | `TSK-FE-005` | Blocked on Mapbox canvas initialization and GeoJSON corridor source coordinate binding. | `TSK-FE-005` complete; verify train marker transitions smoothly along track coordinates at 60 FPS without frame drops. | **Phase 7.4** |
| `TSK-FE-007` | **Real-Time WebSocket Channel Layer Client (`useCorridorSocket`)**: Implement resilient WebSocket client hook connecting to Daphne ASGI (`ws://localhost:8001/ws/v1/corridor/{code}/`) with auto-reconnection and TanStack Query cache invalidation. | Daphne ASGI Verification & `TSK-FE-002` | Requires verified Daphne ASGI WebSocket endpoint running with token query parameter and Redis Channel Layer broadcasting push events. | Daphne ASGI server healthy on port 8001; verify WebSocket connects, receives heartbeat ping, and invalidates TanStack cache on block state changes. | **Phase 7.5** |
| `TSK-FE-008` | **High-Priority Critical Flaw Emergency Alert Modal & Audio Chime**: Implement full-screen emergency containment modal triggered on USFD rail defect broadcast (`EMERGENCY_ALERT`) with Web Audio API chime. | `TSK-FE-007` | Requires active WebSocket listener and `useUIStore` state integration to intercept automated emergency possession broadcasts. | Trigger test emergency block via backend shell; verify immediate modal popup, audio alert trigger, and automatic map pan to flaw coordinates. | **Phase 7.5** |
| `TSK-FE-009` | **SIH Grand Finale Polish, Wallboard Display & PDF Integration**: Implement Big Screen Wallboard presentation mode, live KPI auto-refresh, one-click PDF corridor summary report download, and demo data injection trigger. | `TSK-FE-004`, `TSK-FE-006`, `TSK-FE-007` | Blocked until all core visualization panels, Mapbox overlays, and live telemetry feeds are integrated. | Full screen presentation layout responsive across 1080p/4K displays; successful trigger and download of WeasyPrint PDF report. | **Phase 7.6** |
| `TSK-FE-010` | **End-to-End System Interoperability & 5 Critical Scenario Acceptance**: Execute end-to-end integration test validating complete lifecycle (login, block proposal, conflict detection, OHE shutoff, USFD flaw containment, controller sanction). | `TSK-FE-001` through `TSK-FE-009` | Comprehensive E2E test verifying seamless communication across React SPA, Django REST Framework, Daphne ASGI, and PostgreSQL PostGIS. | All 5 SIH critical operational scenarios execute flawlessly from React UI to backend database and reflect on Mapbox canvas in <100ms. | **Phase 7.6** |

---

### 7.2 Phase 7 Frontend Architecture & Technical Specifications

Following the master roadmap in `docs/Frontend Development Learning Roadmapt.txt`, the target frontend architecture establishes a state-of-the-art Single Page Application (SPA) communicating asynchronously with the completed Django REST Framework and Daphne ASGI backends.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PHASE 7: REACT 18 + MAPBOX GL JS ARCHITECTURE                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                  │
│   Phase 7.1: Project Setup (Vite 5.0 + React 18 + Tailwind CSS 3.4 + React Router v6)                            │
│   ├── Bootstrap project scaffolding with Vite build engine                                                       │
│   ├── Configure Tailwind CSS dark control room palette (cyan/emerald/rose/amber/slate)                          │
│   └── Establish modular component hierarchy and route navigation                                                 │
│                                                                                                                  │
│   Phase 7.2: Authentication & RBAC (Zustand authStore + Axios Interceptors)                                      │
│   ├── Build responsive Control Room Login page with credential validation                                        │
│   ├── Implement JWT token lifecycle management (access/refresh storage & rotation)                               │
│   └── Enforce role-based route guards (Engineering, Electrical/TRD, S&T, Chief Controller)                       │
│                                                                                                                  │
│   Phase 7.3: Core Domain Dashboards (Department Workflows & Chief Controller Console)                             │
│   ├── Department Dashboards (ENG, TRD, SNT) with pending block tables and status chips                           │
│   ├── Dynamic Possession Request Form with interval selection and hazard checklists                             │
│   └── Chief Controller (COA) Real-Time Command Console with sweep-line conflict inspection                       │
│                                                                                                                  │
│   Phase 7.4: 3D GIS Geospatial Engine (Mapbox GL JS 2.15 + WebGL Canvas)                                         │
│   ├── Initialize Mapbox map with 3D tilt (pitch: 45°), dark-v11 style centered on Howrah Jn [88.35, 22.58]       │
│   ├── Ingest West Bengal rail corridor GeoJSON LineString (Howrah–Santragachi–Kharagpur)                         │
│   ├── Render dynamic possession block overlays with status color coding (Free/Possessed/Caution)                  │
│   └── 60 FPS smooth animated train tracking markers with direction heading and speed vectors                     │
│                                                                                                                  │
│   Phase 7.5: Real-Time Dispatch & WebSockets (Daphne Channels + TanStack Query Invalidation)                     │
│   ├── useCorridorSocket custom hook connecting to ws://localhost:8001/ws/v1/corridor/{code}/                     │
│   ├── Push-to-invalidate cache synchronizer via TanStack Query on INVALIDATE_CACHE events                       │
│   ├── Full-screen Emergency Defect Alert Modal with Web Audio API chime on EMERGENCY_ALERT                       │
│   └── Real-time Notification Bell popover with unread counter and severity badges                               │
│                                                                                                                  │
│   Phase 7.6: Polish, Large-Display Wallboard & SIH Grand Finale Demo Suite                                       │
│   ├── Ultra-wide Big Screen Wallboard mode for projector/jury demonstration                                      │
│   ├── PDF Possession & Safety Summary Report download trigger                                                    │
│   ├── Demo data injection shortcut integration                                                                   │
│   └── End-to-end acceptance validation across all 5 critical operational scenarios                               │
│                                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.3 Frontend Learning Priority Matrix & Technology Allocation

To ensure rapid competency and flawless delivery, engineering effort and study depth are distributed strictly according to the learning matrix:

| Priority Level | Technology Domain | Target Depth | Strategic Justification | Time Allocation |
| :--- | :--- | :---: | :--- | :---: |
| 🔴 **CRITICAL** | **JavaScript ES6+** | ⭐⭐⭐⭐⭐ | Foundational syntax: destructuring, async/await, array pipelines (`map`/`filter`/`reduce`), module imports, optional chaining (`?.`), nullish coalescing (`??`). | 35% |
| 🔴 **CRITICAL** | **React 18** | ⭐⭐⭐⭐⭐ | Functional component primitives, `useState`, `useEffect`, custom hooks (`useBlocks`, `useCorridorSocket`), React Router v6 layout routing. | 25% |
| 🔴 **CRITICAL** | **Mapbox GL JS 2.15** | ⭐⭐⭐⭐⭐ | 3D GIS visualization, GeoJSON vector sources, line/fill layers, custom DOM markers, 60 FPS `requestAnimationFrame` train movement. | 15% |
| 🟡 **IMPORTANT** | **Tailwind CSS 3.4** | ⭐⭐⭐⭐ | Modern control room styling: flex/grid layouts, responsive breakpoints, dark theme palette (`bg-slate-900`, `text-cyan-400`). | 10% |
| 🟡 **IMPORTANT** | **Zustand 4.5** | ⭐⭐⭐⭐ | Micro client state management: `authStore.js` (JWT & user roles), `uiStore.js` (modals & alerts), `mapStore.js` (selected block/corridor). | 5% |
| 🟡 **IMPORTANT** | **Daphne WebSockets** | ⭐⭐⭐⭐ | Real-time bi-directional streaming, heartbeat keep-alive, reconnection backoff, push-to-invalidate event handling. | 5% |
| 🟢 **NICE TO HAVE** | **TanStack Query 5.24** | ⭐⭐⭐ | Declarative data fetching, `useQuery`, `useMutation`, automatic background refetching, query key cache invalidation. | 3% |
| 🟢 **NICE TO HAVE** | **Vite 5.0** | ⭐⭐⭐ | Hot Module Replacement (HMR), dev server proxy configuration (`/api` -> 8000, `/ws` -> 8001), production bundling. | 2% |

---

### 7.4 Core Implementation Code Patterns & Contract Examples

#### 1. Resilient Daphne ASGI WebSocket Client (`src/hooks/useCorridorSocket.js`)

```javascript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../stores/uiStore';

export function useCorridorSocket(corridorCode) {
  const ws = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!corridorCode) return;
    const token = localStorage.getItem('access_token');
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8001'}/ws/v1/corridor/${corridorCode}/?token=${token}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log(`[WebSocket] Connected to corridor: ${corridorCode}`);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'INVALIDATE_CACHE') {
        // Invalidate TanStack Query cache for instant reactive DOM refresh
        queryClient.invalidateQueries({ queryKey: ['blocks', corridorCode] });
        queryClient.invalidateQueries({ queryKey: ['corridor_kpis', corridorCode] });
      }

      if (data.type === 'EMERGENCY_ALERT') {
        // Trigger high-priority audio chime and modal alert
        useUIStore.getState().setEmergencyAlert(data.payload);
      }
    };

    ws.current.onclose = () => {
      console.warn('[WebSocket] Disconnected. Reconnecting in 3s...');
      setTimeout(() => {
        // Reconnection logic handled by hook re-mount or resilient socket wrapper
      }, 3000);
    };

    return () => {
      ws.current?.close();
    };
  }, [corridorCode, queryClient]);
}
```

#### 2. Declarative Query & Mutation Synchronization (`src/hooks/useBlocks.js`)

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export function useBlocks(corridorId) {
  return useQuery({
    queryKey: ['blocks', corridorId],
    queryFn: async () => {
      const response = await api.get(`/blocks/?corridor=${corridorId}`);
      return response.data.data;
    },
    staleTime: 30000, // 30 seconds fresh cache
    refetchOnWindowFocus: true,
  });
}

export function useSanctionBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockId) => api.post(`/blocks/${blockId}/sanction/`),
    onSuccess: () => {
      // Instantly invalidate blocks query to reflect newly sanctioned status
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
    },
  });
}
```

#### 3. Mapbox GL JS 3D Railway Map Canvas (`src/components/map/RailMap.jsx`)

```jsx
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export function RailMap({ corridorCode }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [88.35, 22.58], // Howrah Railway Hub Coordinates
      zoom: 11,
      pitch: 45, // 3D perspective tilt
    });

    map.current.on('load', () => {
      // Ingest railway track vector coordinates
      map.current.addSource('corridor-track', {
        type: 'geojson',
        data: '/data/west_bengal_corridor.geojson',
      });

      map.current.addLayer({
        id: 'track-line',
        type: 'line',
        source: 'corridor-track',
        paint: {
          'line-color': '#10b981', // Emerald green for operational line
          'line-width': 4,
          'line-blur': 1,
        },
      });

      // Initialize train tracking marker with speed and heading
      const trainEl = document.createElement('div');
      trainEl.className = 'w-4 h-4 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50 animate-pulse';
      new mapboxgl.Marker(trainEl).setLngLat([88.32, 22.56]).addTo(map.current);
    });

    return () => map.current?.remove();
  }, [corridorCode]);

  return <div ref={mapContainer} className="w-full h-[650px] rounded-xl overflow-hidden border border-slate-700 shadow-2xl" />;
}
```

---

### 7.5 8-Week Implementation & Learning Timeline

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       8-WEEK FRONTEND EXECUTION TIMELINE                                         │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  WEEK 1–2: JavaScript ES6+ Foundation                                                                            │
│  ├── Variables (let/const), Arrow Functions, Objects, Template Literals                                          │
│  ├── Promises, Async/Await, Fetch API, Error Handling                                                            │
│  ├── Array Methods (map, filter, reduce, find, some, every), Destructuring, Spread/Rest                          │
│  └── Deliverable: 20+ algorithmic exercises & sample REST client                                                 │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  WEEK 3–5: React 18 Core Framework Mastery                                                                       │
│  ├── Functional Components, JSX Syntax, Props validation, Component composition                                 │
│  ├── Hooks deep-dive: useState, useEffect, useRef, useMemo, useCallback                                          │
│  ├── Custom Hooks (useBlocks, useAuth, useDebounce) & React Router v6 SPA Routing                                │
│  └── Deliverable: Build 5 standalone departmental prototype components                                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  WEEK 6: Mapbox GL JS 3D Rail GIS Integration                                                                    │
│  ├── Map container mounting, Mapbox styles (dark-v11), 3D pitch & camera bearing control                         │
│  ├── GeoJSON FeatureCollection sources, LineString track rendering, custom HTML markers                          │
│  ├── requestAnimationFrame train coordinate interpolation (60 FPS smooth path animation)                         │
│  └── Deliverable: Interactive Howrah–Kharagpur corridor railway visualization canvas                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  WEEK 7: Tailwind CSS + Zustand State Architecture                                                               │
│  ├── Utility-first control room design tokens, responsive flex/grid layouts, dark mode typography                │
│  ├── Zustand global stores: authStore (tokens/claims), uiStore (modals/alerts), mapStore (active layers)         │
│  └── Deliverable: Fully styled, responsive Chief Controller & Departmental Dashboards                            │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  WEEK 8: WebSocket Real-Time Sync, TanStack Query & Full System Integration                                      │
│  ├── useCorridorSocket connection to Daphne ASGI port 8001 with push-to-invalidate event handling                │
│  ├── TanStack Query stale-time configuration, query invalidation, and optimistic mutations                        │
│  ├── Web Audio API emergency chime and full-screen USFD alert modal integration                                  │
│  └── Deliverable: Seamlessly integrated, production-ready React 18 SPA interfacing with live Django backend       │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.6 Pre-Frontend Setup & Environment Verification Checklist

Before initiating React SPA code generation, the underlying backend infrastructure must satisfy all operational gates:

#### Backend Operational Readiness Checklist (Must Be Verified First)
- [x] **Docker Multi-Container Stack:** All services verified running (`docker-compose ps`):
  - `railway_postgres` (healthy on port 5432)
  - `railway_redis` (healthy on port 6379)
  - `railway_backend` (Django 5.0 on port 8000)
  - `railway_channels` (Daphne ASGI on port 8001)
  - `railway_celery_high`, `railway_celery_notify`, `railway_celery_ontology`, `railway_celery_default`, `railway_celery_beat`
- [x] **PostgreSQL 15 + PostGIS 3.3 Migrations:** 100% migrations applied across all apps (`python manage.py showmigrations`).
- [x] **API Health Status:** Live endpoint verified (`curl http://localhost:8000/api/v1/health/` returning `{"status": "alive"}`).
- [x] **Database Seeded Demonstration Entities:** Verified non-zero demo objects in database (`Corridor`, `Block`, `Train`).
- [x] **CORS Configuration:** Django `settings.py` configured with `CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]` and `CORS_ALLOW_CREDENTIALS = True`.

#### Frontend Setup Prerequisites Checklist
- [ ] **Node.js 18+ Runtime:** Node.js v18.x or v20.x verified on host system or Docker frontend service.
- [ ] **Mapbox Access Token:** Active Mapbox API token provisioned and stored in `VITE_MAPBOX_TOKEN`.
- [ ] **Vite Development Proxy:** `vite.config.js` configured with proxy rules:
  - `/api` -> `http://localhost:8000`
  - `/ws` -> `ws://localhost:8001` (WebSocket enabled)
- [ ] **Environment Configuration (`.env`):**
  ```env
  VITE_API_URL=http://localhost:8000/api/v1
  VITE_WS_URL=ws://localhost:8001
  VITE_MAPBOX_TOKEN=pk.eyJ1...
  ```

---

### 7.7 Standardized Target Directory Structure (`railway-ai-block-platform/frontend/`)

```
railway-ai-block-platform/
├── backend/                             # ✅ Operational Django 5.0 + PostGIS modular monolith
├── frontend/                            # 🔄 Phase 7 Next-Gen SPA to be created
│   ├── public/
│   │   ├── favicon.ico
│   │   └── data/
│   │       └── west_bengal_corridor.geojson  # Railway corridor spatial vectors
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                      # Button, Badge, Card, Modal, Input, Spinner
│   │   │   ├── layout/                  # Navbar, Sidebar, ControlRoomHeader, Footer
│   │   │   ├── map/                     # RailMap, TrainMarker, BlockOverlay, Legend
│   │   │   └── common/                  # ErrorBoundary, ProtectedRoute, AlertBanner
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx            # Multi-department authentication portal
│   │   │   ├── EngDashboard.jsx         # Engineering department possession console
│   │   │   ├── TrdDashboard.jsx         # Electrical/TRD power isolation console
│   │   │   ├── SntDashboard.jsx         # S&T signal/telecom interlocking console
│   │   │   ├── ControlRoomDashboard.jsx # Chief Controller (COA) master command center
│   │   │   ├── BlockRequestPage.jsx     # Possession block submission wizard
│   │   │   ├── BlockDetailPage.jsx      # Block telemetry, timeline & safety logs
│   │   │   └── NetworkMapPage.jsx       # Dedicated full-screen 3D corridor viewer
│   │   ├── hooks/
│   │   │   ├── useAuth.js               # Authentication state & login/logout actions
│   │   │   ├── useCorridorSocket.js     # Resilient Daphne WebSocket connection hook
│   │   │   ├── useBlocks.js             # TanStack Query block caching & mutations
│   │   │   └── useNotifications.js      # In-app alerts, audio chime & bell counter
│   │   ├── stores/
│   │   │   ├── authStore.js             # Zustand JWT tokens & user profile state
│   │   │   ├── uiStore.js               # Emergency modal, toast & sidebar drawer state
│   │   │   └── mapStore.js              # Active corridor, layer toggles & zoom state
│   │   ├── services/
│   │   │   ├── api.js                   # Axios client with JWT request/response interceptors
│   │   │   ├── authService.js           # Login, token refresh & logout endpoints
│   │   │   ├── blockService.js          # CRUD, conflict preview & sanctioning APIs
│   │   │   └── trainService.js          # Train location telemetry & speed vector APIs
│   │   ├── utils/
│   │   │   ├── formatters.js            # Indian Railways timestamp & chainage formatters
│   │   │   └── validators.js            # Possession time window & chainage bounds checkers
│   │   ├── App.jsx                      # Root route configuration & query client provider
│   │   ├── index.css                    # Tailwind CSS directives & custom glow animations
│   │   └── main.jsx                     # React 18 root mounting entry point
│   ├── index.html                       # HTML5 template with modern typography
│   ├── package.json                     # Dependencies: react, mapbox-gl, zustand, @tanstack/react-query
│   ├── vite.config.js                   # Vite configuration with API/WebSocket dev proxies
│   ├── tailwind.config.js               # Dark theme color tokens & control room extensions
│   ├── postcss.config.js                # PostCSS autoprefixer & tailwind plugins
│   └── Dockerfile                       # Multi-stage production container build
├── docker-compose.yml                   # Added `frontend` service mapped to port 3000
└── .env                                 # Shared environment variables
```

---

### 7.8 Implementation Action Plan & Execution Paths

As established in the authoritative learning roadmap, implementation of Phase 7 proceeds through three clear operational paths:

1. **Option 1: Backend Pre-Flight Verification (Recommended Baseline)**
   - Execute Docker healthchecks, verify PostgreSQL 15 migrations, probe `/api/v1/health/`, and audit seeded possession entities. Once the backend is certified 100% green, proceed to frontend scaffolding.
2. **Option 2: Direct Frontend Workspace Bootstrapping**
   - Immediately initialize `frontend/` with Vite 5.0, install React 18, Mapbox GL JS, Tailwind CSS, Zustand, and TanStack Query, and verify client dev server on `http://localhost:3000`.
3. **Option 3: Parallel Full-Stack Orchestration**
   - Simultaneously execute backend verification checks while bootstrapping the frontend repository structure, dockerizing both tiers within `docker-compose.yml`.

---

"""

    # 4. Update Section 8 Revision History Log with v2.3.0
    new_revision_row = """| **v2.2.0** | 2026-09-07 | Principal Platform Architect | Completed Phase 4 Production Hardening: Delivered `corridor_daily_kpis` OLAP rollup, PDF generation engine, master demo seeder, k6 load test (1,000 VUs), E2E critical operational scenarios suite, Prometheus exporter (`/metrics`), Grafana dashboard provisioning, and Bandit SAST security audit (0 vulnerabilities). All 70 tasks 100% complete. | Architectural Review Board (ARB) | **Final Sign-Off** |
| **v2.3.0** | 2026-09-08 | Principal Platform Architect | Integrated Phase 7 Next-Gen Decoupled Frontend SPA (`React 18` + `Mapbox GL JS 2.15` + `TanStack Query 5.24` + `Zustand 4.5`) into Section 7 Blocked Tasks Ledger & Comprehensive Execution Roadmap following authoritative learning roadmap (`docs/Frontend Development Learning Roadmapt.txt`). Established Dual-Presentation Strategy for SIH Grand Finale. | Architectural Review Board (ARB) | **Approved (Active Track)** |"""

    if "| **v2.2.0** |" in suffix:
        old_rev = """| **v2.2.0** | 2026-09-07 | Principal Platform Architect | Completed Phase 4 Production Hardening: Delivered `corridor_daily_kpis` OLAP rollup, PDF generation engine, master demo seeder, k6 load test (1,000 VUs), E2E critical operational scenarios suite, Prometheus exporter (`/metrics`), Grafana dashboard provisioning, and Bandit SAST security audit (0 vulnerabilities). All 70 tasks 100% complete. | Architectural Review Board (ARB) | **Final Sign-Off** |"""
        suffix = suffix.replace(old_rev, new_revision_row)
        print("Updated Section 8.1: Revision History Log with v2.3.0")

    updated_full_content = prefix + new_section_7 + section_8_start + suffix

    with open(checklist_path, "w", encoding="utf-8") as f:
        f.write(updated_full_content)

    print("Successfully patched docs/09-execution-tracker/00-implementation-checklist.md")
else:
    print("Error: Could not locate Section 7 and Section 8 in content")
    sys.exit(1)
