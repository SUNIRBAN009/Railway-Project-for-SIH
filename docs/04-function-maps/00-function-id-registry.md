# 00-function-id-registry.md

> **File Sequence:** 25/45  
> **Previous Document:** [03-service-blueprints/08-notifications.md](../03-service-blueprints/08-notifications.md)  
> **Next Document:** [04-function-maps/01-accounts-function-map.md](01-accounts-function-map.md)  
> **Context:** Master Enterprise Function ID Registry establishing globally unique identifiers (`FUNC-[SERVICE]-[INDEX]`) across all bounded contexts for Indian Railways Block Planning Platform (PS 26027).

---

# Enterprise Function ID Master Registry

## 1. Registry Architecture & Naming Convention

All synchronous controllers, asynchronous Celery worker tasks, WebSocket message dispatchers, and domain service methods must be cataloged under an immutable, machine-readable Function Identifier:

$$\text{Format: } \mathbf{FUNC\text{-}[SERVICE\_CODE]\text{-}[001\dots 999]}$$

| Service Code | Domain Service Bounded Context | Django App Label | Number Range | Primary Focus |
|---|---|---|:---:|---|
| **`AUTH`** | Identity, Access & RBAC | `apps.accounts` | 001 – 049 | Authentication, Token Lifecycle, User Governance |
| **`BLK`** | Block Planning & Conflict Detection | `apps.blocks` | 001 – 099 | Spatial GIS Deconfliction, Possession Life Cycle |
| **`DEPT`** | Departmental Gangs & Equipment | `apps.departments` | 001 – 049 | Resource Scheduling, Work Order Sign-offs |
| **`ONTO`** | Semantic Digital Twin Reasoner | `apps.ontology` | 001 – 049 | Owlready2 DL Reasoning, Axiom Checking |
| **`TRN`** | Train Operations & Headways | `apps.trains` | 001 – 049 | Timetable Ingestion, Delay Propagation Cascades |
| **`AST`** | Infrastructure Asset Health | `apps.assets` | 001 – 049 | Defect Logging, Predictive Maintenance Triggers |
| **`ANA`** | Operations Analytics & KPIs | `apps.analytics` | 001 – 049 | OLAP Rollups, Punctuality & Co-Possession Metrics |
| **`NOTIF`** | Real-Time Push & SMS Gateway | `apps.notifications` | 001 – 049 | Daphne WebSockets, Emergency Alerts, SMS Fallback |

---

## 2. Complete Master Function Index

| Function ID | Service | Category | Function Name | Endpoint / Trigger | Primary Target Table |
|---|:---:|:---:|---|---|---|
| `FUNC-AUTH-001` | `AUTH` | Synchronous | User Authentication & Login | `POST /api/v1/auth/login/` | `users`, `user_sessions` |
| `FUNC-AUTH-002` | `AUTH` | Synchronous | JWT Token Pair Refresh | `POST /api/v1/auth/refresh/` | Redis Blacklist |
| `FUNC-AUTH-003` | `AUTH` | Synchronous | Session Termination & Logout | `POST /api/v1/auth/logout/` | `user_sessions`, Redis |
| `FUNC-AUTH-004` | `AUTH` | Synchronous | Get Current User Context | `GET /api/v1/auth/me/` | `users` |
| `FUNC-AUTH-005` | `AUTH` | Synchronous | Departmental User Listing | `GET /api/v1/users/` | `users` |
| `FUNC-AUTH-006` | `AUTH` | Synchronous | Administrative User Provisioning | `POST /api/v1/users/` | `users` |
| `FUNC-AUTH-007` | `AUTH` | Synchronous | User Credential Reset | `POST /api/v1/users/{id}/reset-password/` | `users` |
| `FUNC-BLK-001` | `BLK` | Synchronous | Submit Block Proposal | `POST /api/v1/blocks/proposals/` | `blocks` |
| `FUNC-BLK-002` | `BLK` | Synchronous | List Filtered Block Schedule | `GET /api/v1/blocks/` | `blocks` |
| `FUNC-BLK-003` | `BLK` | Synchronous | Retrieve Block Detail & Conflict Map | `GET /api/v1/blocks/{id}/` | `blocks`, `block_conflicts` |
| `FUNC-BLK-004` | `BLK` | Asynchronous | Run Spatial-Temporal Conflict Sweep | Celery `blocks.tasks.sweep_conflicts` | `block_conflicts` |
| `FUNC-BLK-005` | `BLK` | Synchronous | Sanction Block Possession | `POST /api/v1/blocks/{id}/sanction/` | `blocks` |
| `FUNC-BLK-006` | `BLK` | Synchronous | Activate Track Block Possession | `POST /api/v1/blocks/{id}/activate/` | `blocks` |
| `FUNC-BLK-007` | `BLK` | Synchronous | Clear & Terminate Track Block | `POST /api/v1/blocks/{id}/complete/` | `blocks` |
| `FUNC-BLK-008` | `BLK` | Synchronous | Cancel Proposed Block Window | `POST /api/v1/blocks/{id}/cancel/` | `blocks` |
| `FUNC-DEPT-001` | `DEPT` | Synchronous | Query Gang Rosters & Availability | `GET /api/v1/departments/gangs/` | `gangs` |
| `FUNC-DEPT-002` | `DEPT` | Synchronous | Register Maintenance Gang Unit | `POST /api/v1/departments/gangs/` | `gangs` |
| `FUNC-DEPT-003` | `DEPT` | Synchronous | Query Heavy Equipment Readiness | `GET /api/v1/departments/equipment/` | `maintenance_equipment` |
| `FUNC-DEPT-004` | `DEPT` | Synchronous | Issue Departmental Work Order | `POST /api/v1/departments/work-orders/` | `work_orders` |
| `FUNC-DEPT-005` | `DEPT` | Synchronous | Sign Track Safety Clearance | `PATCH /api/v1/departments/work-orders/{id}/clearance/` | `work_orders` |
| `FUNC-ONTO-001` | `ONTO` | Asynchronous | Trigger HermiT DL Inference Job | `POST /api/v1/ontology/reason/` | Celery `worker-ontology` |
| `FUNC-ONTO-002` | `ONTO` | Synchronous | Fetch DL Reasoning Job Status | `GET /api/v1/ontology/jobs/{job_id}/` | Redis Cache |
| `FUNC-ONTO-003` | `ONTO` | Synchronous | Query Semantic Violations for Block | `GET /api/v1/ontology/violations/` | `semantic_violations` |
| `FUNC-ONTO-004` | `ONTO` | Synchronous | Query Active Digital Twin Topology | `GET /api/v1/ontology/graph/summary/` | `ontology_graphs` |
| `FUNC-TRN-001` | `TRN` | Synchronous | Query Train Master Timetable | `GET /api/v1/trains/` | `trains`, `train_schedules` |
| `FUNC-TRN-002` | `TRN` | Synchronous | Get Live Train Running Positions | `GET /api/v1/trains/live/` | `train_live_status` |
| `FUNC-TRN-003` | `TRN` | Asynchronous | Ingest COA Timetable Update Feed | Celery `trains.tasks.ingest_coa_feed` | `train_schedules` |
| `FUNC-TRN-004` | `TRN` | Synchronous | Simulate Train Delay Cascade | `POST /api/v1/trains/simulate-delay/` | Simulation Model |
| `FUNC-AST-001` | `AST` | Synchronous | Query Asset Inventory & Health | `GET /api/v1/assets/` | `track_assets` |
| `FUNC-AST-002` | `AST` | Synchronous | Register Inspection Defect Reading | `POST /api/v1/assets/defects/` | `asset_defect_logs` |
| `FUNC-AST-003` | `AST` | Synchronous | Get Predictive Block Recommendations| `GET /api/v1/assets/maintenance-recommendations/`| `track_assets` |
| `FUNC-ANA-001` | `ANA` | Synchronous | Fetch Corridor Operations Dashboard | `GET /api/v1/analytics/dashboard/summary/` | `corridor_daily_kpis` |
| `FUNC-ANA-002` | `ANA` | Asynchronous | Run Nightly Corridor Rollup Mart | Celery Beat `analytics.tasks.daily_rollup` | `corridor_daily_kpis` |
| `FUNC-NOTIF-001`| `NOTIF`| Synchronous | Retrieve Unread User Notifications | `GET /api/v1/notifications/` | `notifications` |
| `FUNC-NOTIF-002`| `NOTIF`| Asynchronous | Broadcast Real-Time WebSocket Frame | Celery `notifications.tasks.broadcast_ws` | Daphne Channels |
| `FUNC-NOTIF-003`| `NOTIF`| Asynchronous | Send Urgent Cellular SMS Alert | Celery `notifications.tasks.dispatch_sms` | `notification_delivery_logs` |
