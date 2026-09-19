# 03-frontend-roadmap.md

> **ফাইল ক্রম:** ৫৩/৫৯  
> **ডিরেক্টরি:** `07-roadmap/`  
> **সার্ভিস স্কোপ:** Multi-Phase Frontend Engineering Roadmap, UI Component Architecture & React 18 / Zustand / Mapbox / Daphne Integration  
> **পূর্ববর্তী ফাইল:** [07-roadmap/02-rollback-plan.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/07-roadmap/02-rollback-plan.md) (Disaster Recovery & Zero-Data-Loss Rollback Plan)  
> **পরবর্তী ফাইল:** [08-standards/00-coding-standards.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/08-standards/00-coding-standards.md) (Enterprise Coding Standards & Style Guide)  
> **মাস্টার এক্সিকিউশন ট্র্যাকার:** [09-execution-tracker/00-implementation-checklist.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/09-execution-tracker/00-implementation-checklist.md)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ফ্রন্টএন্ড প্রেজেন্টেশন লেয়ার, React 18 SPA আর্কিটেকচার, Mapbox GL JS 3D ভেক্টর ম্যাপ, সেফটি স্যুইট UI মডিউল (#71–#85), কুইক-সুইচ ডেলিগেশন (#122), Daphne ওয়েবসকেট ক্যাশ ইনভ্যালিডেশন, এবং ৬৮টি ফ্রন্টএন্ড টাস্কের বিস্তারিত রোডম্যাপ সংজ্ঞায়িত করা হয়েছে।

---

# Multi-Phase Frontend Engineering Implementation Roadmap (বহুস্তরীয় ফ্রন্টএন্ড বাস্তবায়ন রোডম্যাপ)

## 1. Executive Summary & Frontend Architecture Overview (ফ্রন্টএন্ড স্থাপত্যিক রূপরেখা)

ইন্ডিয়ান রেলওয়েজ কৃত্রিম বুদ্ধিমত্তা চালিত মেগা-ব্লক প্ল্যাটফর্মের (PS 26027) ইউজার ইন্টারফেসটি সেকশন কন্ট্রোলার (Section Controllers), চিফ কন্ট্রোলার (Sr. DOM / COA), এবং বিভাগীয় ইঞ্জিনিয়ারদের (ENGG, TRD, SNT) ব্যবহারের উপযোগী একটি অতি-উচ্চক্ষমতাসম্পন্ন রিয়েল-টাইম সিঙ্গেল-পেজ অ্যাপ্লিকেশন (SPA)।

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND TECHNOLOGY MATRIX & SPECIFICATIONS                     │
├──────────────────────────┬──────────────────────┬──────────────────────────────────────┤
│ Layer / Capability       │ Technology Pinned    │ Purpose & Architectural Role         │
├──────────────────────────┼──────────────────────┼──────────────────────────────────────┤
│ Core Framework           │ React 18.2 + TS 5.3  │ Type-safe component UI architecture  │
│ Build Engine & DevServer │ Vite 5.0             │ Native ESM, sub-50ms HMR dev cycle   │
│ Client-Side Routing      │ React Router DOM 6.22│ Declarative role-based route guards  │
│ Global Client State      │ Zustand 4.5          │ Micro-stores: auth, ui, map, safety  │
│ Server State & Caching   │ TanStack Query 5.24  │ Invalidation cache, optimistic update│
│ HTTP Client              │ Axios 1.6            │ RS256 JWT auto-refresh interceptors  │
│ Real-Time Streaming      │ Native WebSocket     │ Daphne ASGI push-to-invalidate       │
│ Spatial GIS Engine       │ Mapbox GL JS 2.15    │ 60 FPS vector tiles, 50m buffer mesh │
│ Styling & Design Tokens  │ Tailwind CSS 3.4     │ Indian Railways Control Room Dark UI │
│ Iconography & Visuals    │ Lucide React 0.344   │ Mission-critical operational glyphs  │
│ Data Visualization       │ Recharts 2.12        │ Availability gauges & delay Gantts   │
│ Date & Time Manipulation │ date-fns 3.3         │ IST timezone-locked calculations     │
└──────────────────────────┴──────────────────────┴──────────────────────────────────────┘
```

---

## 2. Master Frontend Progress Tracker (ফ্রন্টএন্ড কাজের অগ্রগতি ট্র্যাকার)

| Phase Code | Phase Title | Status | Timeline | Total Tasks | % Complete |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **FE-Phase 0** | Environment & Project Scaffolding | **Completed** | Day 1 (Morning) | 8 | **100%** |
| **FE-Phase 1** | Core Infrastructure, Auth & Quick-Switch | **Completed** | Day 1 (Afternoon) | 10 | **100%** |
| **FE-Phase 2** | Layout & Mission Navigation Shell | **Completed** | Day 2 (Morning) | 6 | **100%** |
| **FE-Phase 3** | Departmental Dashboards & Safety Checklists | **Completed** | Day 2 (PM) – Day 3 (AM) | 12 | **100%** |
| **FE-Phase 4** | Control Office (COA) Real-Time Center | **Completed** | Day 3 (PM) – Day 4 (AM) | 10 | **100%** |
| **FE-Phase 5** | Interactive Spatial Map & PostGIS 50m Overlay | **Completed** | Day 4 (PM) – Day 5 (AM) | 8 | **100%** |
| **FE-Phase 6** | Real-Time Daphne WebSocket Integration | **Completed** | Day 5 (Afternoon) | 6 | **100%** |
| **FE-Phase 7** | Advanced Safety, 1-Tap SOS Siren & Polish | **Completed** | Day 6 (Full Day) | 8 | **100%** |
| **TOTAL** | **Enterprise Frontend Suite** | **COMPLETED** | **6 Days** | **68 / 68** | **100%** |

---

## 3. Detailed Phase-by-Phase Work Packages & Task Breakdown

### FE-Phase 0: Environment & Project Scaffolding (Day 1, Morning) — COMPLETED
- **Status:** Completed (8/8 tasks passing, 100%)
- **Verification:** TypeScript `tsc && vite build` compiled 79 modules with zero errors.
- **Tasks:**
  - [x] `FE-TSK-001`: Initialize React 18 + Vite project with TypeScript (`package.json`, `tsconfig.json`, `main.tsx`, `App.tsx`).
  - [x] `FE-TSK-002`: Install core application dependencies (`react-router-dom`, `zustand`, `@tanstack/react-query`, `axios`).
  - [x] `FE-TSK-003`: Install UI styling and utility libraries (`tailwindcss`, `postcss`, `autoprefixer`, `lucide-react`, `date-fns`).
  - [x] `FE-TSK-004`: Install spatial GIS mapping dependencies (`mapbox-gl`, `@types/mapbox-gl`).
  - [x] `FE-TSK-005`: Configure `tailwind.config.js` with dark control-room palette (`railway-navy: #0b1120`, `status-sanctioned: #10b981`, `status-conflict: #f43f5e`, `dept-eng: #3b82f6`, `dept-trd: #eab308`, `dept-snt: #a855f7`).
  - [x] `FE-TSK-006`: Configure `vite.config.ts` with development reverse proxy for `/api/` (`http://127.0.0.1:8000`) and WebSocket `/ws/` (`ws://127.0.0.1:8000`).
  - [x] `FE-TSK-007`: Establish clean enterprise directory structure (`src/components`, `src/hooks`, `src/layouts`, `src/pages`, `src/stores`, `src/services`).
  - [x] `FE-TSK-008`: Configure ESLint, Prettier, and path aliases (`@/*` pointing to `src/*`).

---

### FE-Phase 1: Core Infrastructure, Authentication & Quick-Switch (Day 1, Afternoon) — COMPLETED
- **Status:** Completed (10/10 tasks passing, 100%)
- **Verification:** Verified live JWT authentication with Argon2id credentials against `/api/v1/accounts/login/`.
- **Tasks:**
  - [x] `FE-TSK-009`: Centralized Axios instance (`services/api.ts`) with request Bearer JWT interceptor and silent refresh cycle.
  - [x] `FE-TSK-010`: Create `stores/authStore.ts` utilizing Zustand with persistence: `user`, `role`, `department`, `token`, `refreshToken`.
  - [x] `FE-TSK-011`: Build Quick-Switch Section Delegation Selector (`components/auth/QuickSwitchModal.tsx` - Feature #122).
  - [x] `FE-TSK-012`: Create `stores/uiStore.ts` for modal states, slide-overs, and audio chime volume.
  - [x] `FE-TSK-013`: Create `stores/mapStore.ts` for viewport state, active corridor layers, and 50m safety buffer overlay toggle.
  - [x] `FE-TSK-014`: Build `pages/LoginPage.tsx` with high-contrast inputs and quick-role presets (COA Chief, ENG P-Way, TRD OHE, S&T Telecom).
  - [x] `FE-TSK-015`: Role-based redirect matrix routing users upon login to designated operational terminals.
  - [x] `FE-TSK-016`: Build `components/auth/ProtectedRoute.tsx` with granular role guards (`CHIEF_CONTROLLER`, `SECTION_CONTROLLER`, `SITE_SUPERVISOR`).
  - [x] `FE-TSK-017`: Build `components/auth/AuthContext.tsx` providing session status and automatic expiry countdowns.
  - [x] `FE-TSK-018`: Initialize TanStack Query client (`QueryClientProvider`) configured with `staleTime: 30_000`.

---

### FE-Phase 2: Layout & Mission Navigation Shell (Day 2, Morning) — COMPLETED
- **Status:** Completed (6/6 tasks passing, 100%)
- **Verification:** Production bundle built cleanly; responsive layout with 24h IST clock, Daphne telemetry indicator, and alert drawers.
- **Tasks:**
  - [x] `FE-TSK-019`: Build `components/layout/Sidebar.tsx` with role-sensitive navigational items and collapsible state.
  - [x] `FE-TSK-020`: Build `components/layout/Header.tsx` displaying station/division badge (`NR-DLI`), live IST 24h clock, and WebSocket beacon.
  - [x] `FE-TSK-021`: Create `layouts/DepartmentLayout.tsx` for departmental engineers (ENGG, TRD, SNT).
  - [x] `FE-TSK-022`: Create `layouts/ControlRoomLayout.tsx` optimized for 4K video wall / multi-monitor COA consoles.
  - [x] `FE-TSK-023`: Build `components/layout/NotificationBell.tsx` with animated pulse badge displaying unread conflicts and SOS alerts.
  - [x] `FE-TSK-024`: Create `components/layout/NotificationPanel.tsx` slide-over drawer displaying categorized dispatch logs.

---

### FE-Phase 3: Departmental Dashboards & Safety Suite Checklists (Day 2 PM – Day 3 AM) — COMPLETED
- **Status:** Completed (12/12 tasks passing, 100%)
- **Verification:** 4-step wizard, Gantt deconfliction timeline, and pre-work safety attestations operational.
- **Tasks:**
  - [x] `FE-TSK-025`: Build `pages/EngDashboard.tsx` displaying P-Way track maintenance KPIs, tamping progress, and USFD flaw alerts.
  - [x] `FE-TSK-026`: Build `pages/TrdDashboard.tsx` displaying OHE power block requirements and 25kV feeder isolation status.
  - [x] `FE-TSK-027`: Build `pages/SntDashboard.tsx` displaying point machine testing and track circuit health.
  - [x] `FE-TSK-028`: Build `components/blocks/BlockRequestForm.tsx` (Multi-Step Wizard with chainage auto-complete #87).
  - [x] `FE-TSK-029`: Build `components/blocks/BlockList.tsx` with multi-facet filters and real-time status badges.
  - [x] `FE-TSK-030`: Build `pages/BlockDetailPage.tsx` showing spatial geometry, assigned crew, and digital audit trail.
  - [x] `FE-TSK-031`: Build `components/blocks/BlockTimeline.tsx` interactive Gantt chart visualizing blocks against train paths.
  - [x] `FE-TSK-032`: Build `components/departments/CrewAssignment.tsx` linking gangs (`GANG-ENG-04`) and supervisors (#100).
  - [x] `FE-TSK-033`: Build `components/departments/SafetyChecklistModal.tsx` enforcing Tool Count (#81), Geo-tag Photo (#82), TBT (#83), and PTW (#84).
  - [x] `FE-TSK-034`: Build `components/blocks/CalendarView.tsx` showing month and week possession schedules.
  - [x] `FE-TSK-035`: Implement multi-tier digital sign-off UI: Junior Engineer -> Senior Section Engineer -> Section Controller.
  - [x] `FE-TSK-036`: Build `components/blocks/ConflictAlert.tsx` banner rendering sweep-line conflict deductions with AI recommendations.

---

### FE-Phase 4: Control Office (COA) Real-Time Center & Sanction Terminal (Day 3 PM – Day 4 AM) — COMPLETED
- **Status:** Completed (10/10 tasks passing, 100%)
- **Verification:** Chief Operating Controller console live with priority block queue, 1-click sanctioning, and shadow block optimizer.
- **Tasks:**
  - [x] `FE-TSK-037`: Build `pages/ControlRoomDashboard.tsx` with high-density operational telemetry and active possession counts.
  - [x] `FE-TSK-038`: Build `components/coa/PendingBlocksQueue.tsx` with priority sorting and countdown timers.
  - [x] `FE-TSK-039`: Build `components/coa/BlockSanctionPanel.tsx` enabling single-click block approval via optimistic updates.
  - [x] `FE-TSK-040`: Build `components/coa/ConflictResolutionPanel.tsx` rendering AI suggested time-shift windows and shadow slots.
  - [x] `FE-TSK-041`: Build `components/coa/TrainImpactPanel.tsx` calculating passenger delay minutes and freight regulation rosters (#115).
  - [x] `FE-TSK-042`: Build `components/coa/EmergencyBlockButton.tsx` with high-contrast safety modal for emergency possession.
  - [x] `FE-TSK-043`: Build `components/coa/CoPossessionOptimizer.tsx` displaying shadow block bundling opportunities (#100, #101).
  - [x] `FE-TSK-044`: Build `components/coa/DepartmentChatRoom.tsx` for real-time inter-departmental coordination (#43).
  - [x] `FE-TSK-045`: Build `components/coa/WeatherAdvisoryPanel.tsx` displaying live weather gate telemetry (#75).
  - [x] `FE-TSK-046`: Build `pages/BigScreenMode.tsx` providing panoramic view for division operations theater monitors.

---

### FE-Phase 5: Interactive Spatial Map & PostGIS 50m Overlay (Day 4 PM – Day 5 AM) — COMPLETED
- **Status:** Completed (8/8 tasks passing, 100%)
- **Verification:** 60 FPS Mapbox GL JS 3D vector map engine operational with PostGIS corridor layers and animated train markers.
- **Tasks:**
  - [x] `FE-TSK-047`: Build `components/map/RailMap.tsx` wrapping Mapbox GL JS canvas with dark theme tiles and 3D terrain controls.
  - [x] `FE-TSK-048`: Ingest and render PostGIS LineString geometries (`NDLS-GZB`, `GZB-ALJN`) with UP/DOWN line distinction.
  - [x] `FE-TSK-049`: Build `components/map/SectionLayer.tsx` color-coding track states (Green: Clear, Yellow: Caution Order, Red: Possession).
  - [x] `FE-TSK-050`: Build `components/map/TrainMarker.tsx` displaying animated train icons (`requestAnimationFrame`) with speed and delay tags.
  - [x] `FE-TSK-051`: Build `components/map/BlockOverlay.tsx` rendering 50-meter safety buffer polygons around active possessions.
  - [x] `FE-TSK-052`: Build `components/map/MapPopup.tsx` displaying live telemetry on click (station details, schedule, supervisor contact).
  - [x] `FE-TSK-053`: Build `pages/NetworkMapPage.tsx` with corridor layer filters, train search box, and full-screen toggle.
  - [x] `FE-TSK-054`: Build `components/map/HeatmapLayer.tsx` mapping historical USFD rail flaws and maintenance frequency (#92).

---

### FE-Phase 6: Real-Time Daphne WebSocket Integration (Day 5, Afternoon) — COMPLETED
- **Status:** Completed (6/6 tasks passing, 100%)
- **Verification:** Resilient WebSocket stream operational connecting to Daphne ASGI on port 8001 with push-to-invalidate cache synchronizers.
- **Tasks:**
  - [x] `FE-TSK-055`: Build `hooks/useCorridorSocket.ts` custom hook managing WebSocket lifecycle.
  - [x] `FE-TSK-056`: Implement WebSocket authentication via JWT handshake with exponential backoff auto-recovery (1.5s–16s).
  - [x] `FE-TSK-057`: Push-to-invalidate handler triggering TanStack Query cache invalidation upon server update frames (`INVALIDATE_CACHE`).
  - [x] `FE-TSK-058`: Handle `block.updated` and `block.sanctioned` events updating the pending blocks queue without page reload.
  - [x] `FE-TSK-059`: Handle `conflict.detected` events delivering immediate toast alerts and highlighting conflicted sections on the map.
  - [x] `FE-TSK-060`: Handle `emergency.broadcast` events triggering the global siren alert banner and sound notification.

---

### FE-Phase 7: Advanced Safety, 1-Tap SOS Siren & Polish (Day 6, Full Day) — COMPLETED
- **Status:** Completed (8/8 tasks passing, 100%)
- **Verification:** Synthesized Web Audio API sirens, SIL-4 emergency takeover modal, PDF export, and accessibility audit complete.
- **Tasks:**
  - [x] `FE-TSK-061`: Build `components/common/AudioChime.tsx` synthesizing railway station warning chime and emergency sirens (#76, #79).
  - [x] `FE-TSK-062`: Build `components/common/EmergencyModal.tsx` taking over the screen upon Emergency SOS trigger with acknowledge action (#79).
  - [x] `FE-TSK-063`: Build PDF report generator for Daily Sanction Orders and Corridor Possession Sheets (`utils/exportPdf.ts` - #107).
  - [x] `FE-TSK-064`: Build CSV export utility (`utils/exportCsv.ts`) for tabular block requests and delay logs.
  - [x] `FE-TSK-065`: Implement high-contrast Control Room theme toggle (Dark Night Mode / Day High-Contrast Mode).
  - [x] `FE-TSK-066`: Add animated loading skeleton screens (`components/common/Skeleton.tsx`) across all table and card components.
  - [x] `FE-TSK-067`: Implement React Error Boundary wrappers (`components/common/ErrorBoundary.tsx`) preventing uncaught crashes.
  - [x] `FE-TSK-068`: Conduct comprehensive responsive audit (1080p, 1440p, 4K UHD) and ensure zero ESLint/TypeScript build errors.

---

## 4. API Consumption & Integration Matrix (এপিআই ইন্টিগ্রেশন ম্যাট্রিক্স)

| Backend Service Code | Backend Endpoint | Method | Frontend Store / Hook | Consuming Component |
| :--- | :--- | :---: | :--- | :--- |
| **`SVC-AUTH`** | `/api/v1/accounts/login/` | `POST` | `authStore.login` | `LoginPage.tsx` |
| **`SVC-AUTH`** | `/api/v1/accounts/token/refresh/` | `POST` | `services/api.ts` | Axios Interceptor |
| **`SVC-AUTH`** | `/api/v1/accounts/quick-switch/` | `POST` | `authStore.switchSection`| `QuickSwitchModal.tsx` (#122) |
| **`SVC-BLK`** | `/api/v1/blocks/` | `GET` | `useQuery(['blocks'])` | `BlockList.tsx`, `BlockTimeline.tsx` |
| **`SVC-BLK`** | `/api/v1/blocks/proposals/` | `POST` | `useMutation(createBlock)`| `BlockRequestForm.tsx` |
| **`SVC-BLK`** | `/api/v1/blocks/<id>/sanction/` | `POST` | `useMutation(sanction)` | `BlockSanctionPanel.tsx` |
| **`SVC-BLK`** | `/api/v1/blocks/<id>/activate/` | `POST` | `useMutation(activate)` | `SafetyChecklistModal.tsx` (#71) |
| **`SVC-TRN`** | `/api/v1/trains/live/` | `GET` | `useQuery(['live-trains'])`| `TrainMarker.tsx`, `RailMap.tsx` |
| **`SVC-TRN`** | `/api/v1/trains/simulate-delay/` | `POST` | `useMutation(simDelay)` | `TrainImpactPanel.tsx` (#115) |
| **`SVC-DEPT`**| `/api/v1/departments/gangs/` | `GET` | `useQuery(['gangs'])` | `CrewAssignment.tsx` (#100) |
| **`SVC-AST`** | `/api/v1/assets/defects/` | `GET` | `useQuery(['defects'])` | `EngDashboard.tsx`, `HeatmapLayer.tsx` |
| **`SVC-ANL`** | `/api/v1/analytics/availability/`| `GET` | `useQuery(['availability'])`| `ControlRoomDashboard.tsx` (#50) |
| **`SVC-NOTIF`**| `/api/v1/notifications/sos/trigger/`| `POST` | `useMutation(sosTrigger)`| `EmergencyModal.tsx` (#79) |
| **`SVC-NOTIF`**| `/ws/v1/corridor/` | `WS` | `useCorridorSocket` | `NotificationBell.tsx`, `RailMap.tsx` |
