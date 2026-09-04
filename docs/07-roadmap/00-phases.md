# 00-phases.md

> **File Sequence:** 43/45  
> **Directory:** `07-roadmap/`  
> **Previous Document:** [06-testing-qa/03-data-seeding.md](../06-testing-qa/03-data-seeding.md)  
> **Next Document:** [07-roadmap/01-milestones.md](01-milestones.md)  
> **Context:** Strategic engineering implementation roadmap spanning Phase 0 (Environment Setup) through Phase 4 (Production Hardening & Scale).

---

# Multi-Phase Engineering Implementation Roadmap

---

## 1. Project Phase Architecture Overview

```
+-------------------------------------------------------------------------------+
|                      IMPLEMENTATION PHASES & TIMELINE                         |
+-------------------------------------------------------------------------------+
|  Phase 0: Environment & Core Setup (Week 1)                                   |
|   - Docker Compose, MySQL 8.0 Spatial DB, Redis 7, Django 5.0 Scaffold        |
|  Phase 1: Foundation & Identity (Weeks 2-3)                                   |
|   - SVC-AUTH (Argon2id, RS256 JWT, RBAC), React 18 Core Shell, DB Migrations   |
|  Phase 2: Core Domain Features (Weeks 4-6)                                    |
|   - SVC-BLK (Spatial Corridor GIS), SVC-TRN (Timetable), SVC-DEPT (Gangs)      |
|  Phase 3: Advanced Intelligence & Real-Time (Weeks 7-8)                       |
|   - SVC-ONTO (Owlready2 HermiT), Daphne WebSockets, SVC-AST (Predictive Defect)|
|  Phase 4: Operations Analytics, Hardening & Deployment (Weeks 9-10)          |
|   - SVC-ANA (OLAP KPIs), k6 Load Testing, Production Containerization        |
+-------------------------------------------------------------------------------+
```

---

## 2. Phase-by-Phase Work Packages & Deliverables

### Phase 0: Environment & Foundation Infrastructure (Week 1)
- **Objectives:** Establish development containers, configure MySQL 8.0 spatial extension parameters, provision Redis 7, configure Django 5.0 modular app structure.
- **Key Work Packages:**
  - Standardized `docker-compose.yml` with health check probes for MySQL and Redis.
  - Virtualenv with pinned dependencies (`Django==5.0.3`, `djangorestframework==3.15.1`, `celery==5.3.6`, `mysqlclient==2.2.4`, `owlready2==0.44`).
  - GitHub Actions CI matrix running pre-commit linters (Ruff, ESLint, TypeScript).
- **Deliverables:** Operational development container cluster with healthy DB/Cache endpoints.

---

### Phase 1: Identity, RBAC & Core Data Models (Weeks 2-3)
- **Objectives:** Implement enterprise security, user authentication, departmental isolation, and core schema migrations.
- **Key Work Packages:**
  - `apps.accounts`: RS256 JWT generation, refresh token rotation, Redis blacklist.
  - Granular RBAC permissions (`IsSectionController`, `IsDepartmentalEngineer`, `IsSiteSupervisor`).
  - React 18 authenticated shell with TanStack Query provider, Axios interceptors, and Tailwind CSS.
- **Deliverables:** Complete user login/logout lifecycle, role-based route guards, and working profile endpoints.

---

### Phase 2: Core Operational Block Planning (Weeks 4-6)
- **Objectives:** Implement the heart of the platform — spatial corridor tracking, block proposal workflows, and multi-department coordination.
- **Key Work Packages:**
  - `apps.blocks`: MySQL 8.0 `LINESTRING` spatial corridor queries, block lifecycle state machine.
  - `apps.blocks.core.conflict_detector`: Sweep-line interval tree conflict detection algorithm.
  - `apps.trains`: Master timetable ingestion, train running status tracker.
  - `apps.departments`: Gang rosters, heavy machinery allocation, and work orders.
- **Deliverables:** Functional block proposal submission, conflict detection sweep, and approval workflow.

---

### Phase 3: Semantic Digital Twin & Real-Time Invalidation (Weeks 7-8)
- **Objectives:** Integrate advanced Description Logic reasoning and instant browser state synchronization.
- **Key Work Packages:**
  - `apps.ontology`: Owlready2 semantic digital twin model (`railway_ontology.owl`), HermiT reasoner worker.
  - `apps.notifications`: Daphne ASGI server (port 8001), Redis Channel Layer, push-to-invalidate event handlers.
  - `apps.assets`: Track quality index scoring, USFD defect recording, and automated emergency blocks.
- **Deliverables:** Real-time interactive corridor map with instant conflict alerts and explainable OWL reasoning proofs.

---

### Phase 4: Analytics, Performance Hardening & Production Handover (Weeks 9-10)
- **Objectives:** Executive business intelligence, stress testing, security audits, and production staging.
- **Key Work Packages:**
  - `apps.analytics`: Daily corridor KPI rollups, co-possession efficiency metrics, PDF export.
  - k6 load testing execution at 1,000 concurrent users.
  - Automated deployment pipeline and disaster recovery validation.
- **Deliverables:** Production-ready release candidate with 100% test pass rate and executive demo dataset.
