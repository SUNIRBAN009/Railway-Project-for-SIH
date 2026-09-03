# 01-decision-log.md

> **File Order:** 2/45  
> **Previous File:** `00-master-high-level/00-architecture.md` (Source of decisions)  
> **Next File:** `00-master-high-level/02-glossary.md`  
> **Connection:** Every technical term used in this file (`Modular Monolith`, `Owlready2`, `Quadstore`, `ASGI`, etc.) will be defined in `02-glossary.md`.

---

## Decision Summary Table

| # | Decision ID | Title | Status | Owner |
|---|-------------|-------|--------|-------|
| 1 | DEC-001 | Modular Monolith over Microservices | Accepted | Tech Lead |
| 2 | DEC-002 | Django + DRF over FastAPI | Accepted | Tech Lead |
| 3 | DEC-003 | Owlready2 over Apache Jena | Accepted | AI Lead |
| 4 | DEC-004 | Gemini API over Local LLM (Primary) | Accepted | AI Lead |
| 5 | DEC-005 | Django Channels + Redis over Socket.io | Accepted | Backend Lead |
| 6 | DEC-006 | Railway/Render Free Tier over AWS | Accepted | DevOps Lead |
| 7 | DEC-007 | Mapbox GL JS over Leaflet | Accepted | Frontend Lead |
| 8 | DEC-008 | PostgreSQL over MySQL | Accepted | Backend Lead |
| 9 | DEC-009 | Zustand over Redux | Accepted | Frontend Lead |
| 10 | DEC-010 | React 18 + Vite over Next.js | Accepted | Frontend Lead |

---

## DEC-001: Modular Monolith over Microservices

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Tech Lead

### Context
PS 26027 Hackathon project (3-day timeline). There are 5 logical domains (Auth, Blocks, Ontology, Trains, Notifications) but the team size is small (4-5 members). There are insufficient resources to manage separate deployments, separate databases, and separate CI/CD pipelines for each service.

### Decision
We will use Django apps as Bounded Contexts to build a single deployable unit (Modular Monolith). Each app (`accounts`, `blocks`, `ontology`, `trains`, `notifications`) will maintain its own models, views, serializers, and tests within its respective folder but will use a shared database (PostgreSQL) and a shared Redis instance.

### Positive Consequences
- Very fast to develop and deploy.
- Easy to run locally (a single `docker-compose up`).
- Data integrity across domains using standard foreign keys.
- Straightforward transactions without needing a SAGA pattern right now.

### Negative Consequences
- Scaling a specific heavy component (like the Ontology engine) independently is difficult.
- Less strict enforcement of domain boundaries (developers might bypass service layers).

### Alternatives Considered
- **Microservices Architecture:** Rejected — Operational overhead is too high for the MVP phase. It would take away precious time from building core business logic.

---

## DEC-002: Django + DRF over FastAPI

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Tech Lead

### Context
We need a robust backend to handle relational data (blocks, trains, crews), role-based access control, and rapid API development.

### Decision
We will use Django 5.0 with Django REST Framework (DRF) as the primary backend framework.

### Positive Consequences
- Built-in admin panel allows us to quickly view and modify database records during testing.
- Mature ecosystem (Auth, CSRF, SimpleJWT).
- Very powerful ORM for PostgreSQL.

### Negative Consequences
- Slower performance compared to async-first frameworks.
- Heavier footprint and more boilerplate for simple APIs.

### Alternatives Considered
- **FastAPI:** Rejected — While it is faster and native async, it lacks a built-in admin panel and the ORM ecosystem (SQLAlchemy) requires more manual setup compared to Django's ORM.

---

## DEC-003: Owlready2 over Apache Jena

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** AI Lead

### Context
We need to build a Semantic Digital Twin to reason about the railway network (e.g., if a track is blocked, which signals are degraded). This requires OWL 2 ontology support and SPARQL querying.

### Decision
We will use Python's `Owlready2` library with its SQLite-based Quadstore.

### Positive Consequences
- Python-native: integrates directly with our Django monolith seamlessly.
- No need to run and manage a separate database server for the graph.
- Built-in HermiT reasoner support.

### Negative Consequences
- Performance degradation for very large graphs compared to enterprise graph databases.
- Concurrency issues if heavily written to (SQLite locks).

### Alternatives Considered
- **Apache Jena (Java):** Rejected — Requires a separate JVM process and HTTP communication, complicating the deployment for the hackathon MVP.
- **Neo4j:** Rejected — Excellent graph DB, but primarily uses Cypher, not native OWL/RDF semantic reasoning.

---

## DEC-004: Gemini API over Local LLM (Primary)

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** AI Lead

### Context
When a conflict is resolved by the AI, we need to generate a human-readable explanation in English, Bengali, or Hindi for the crews.

### Decision
We will use the Google Gemini 1.5 Flash API for natural language generation, with Ollama + Phi-3 as a fallback.

### Positive Consequences
- Fast response times.
- Excellent multi-lingual support (Bengali/Hindi) out of the box.
- Zero local GPU resource requirements for the primary flow.

### Negative Consequences
- Dependency on external internet connectivity.
- Potential rate limits on the free tier.

### Alternatives Considered
- **Local LLM exclusively (e.g., Llama 3 8B):** Rejected — High RAM/GPU requirement for the host server, which is expensive for cloud deployment during the hackathon.

---

## DEC-005: Django Channels + Redis over Socket.io

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Backend Lead

### Context
We need real-time bidirectional communication to push block status updates, conflict alerts, and emergency broadcasts instantly to the Control Room dashboard.

### Decision
We will use Django Channels running on Daphne (ASGI) with a Redis channel layer.

### Positive Consequences
- Native integration with Django’s authentication and session management.
- Ability to trigger WebSocket messages directly from Django signals or Celery tasks.

### Negative Consequences
- Requires running a separate ASGI server alongside the WSGI server.
- Slightly higher learning curve than standalone socket.io.

### Alternatives Considered
- **Socket.io (Node.js standalone):** Rejected — Would require maintaining a separate Node.js server and syncing auth state between Django and Node.js.

---

## DEC-006: Railway/Render Free Tier over AWS

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** DevOps Lead

### Context
We need a publicly accessible deployment for the hackathon presentation with zero upfront cost and minimal setup time.

### Decision
We will deploy the application using the free tiers of Railway or Render.

### Positive Consequences
- Automated CI/CD from GitHub.
- Automatic SSL/HTTPS provisioning.
- Managed PostgreSQL and Redis add-ons available easily.

### Negative Consequences
- Sleep mode on inactivity (cold starts).
- Resource constraints (RAM/CPU limits).

### Alternatives Considered
- **AWS (EC2 / ECS):** Rejected — Overkill for a hackathon, requires manual setup of SSL, load balancers, and risks unexpected billing.

---

## DEC-007: Mapbox GL JS over Leaflet

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Frontend Lead

### Context
The primary interface for the COA is a real-time railway network map. It needs to look premium, support dark themes, and render thousands of track sections smoothly.

### Decision
We will use Mapbox GL JS for the interactive map.

### Positive Consequences
- WebGL accelerated rendering provides 60fps performance even with many elements.
- Supports 3D building extrusions and smooth camera animations.
- Premium out-of-the-box dark themes suitable for a Control Room environment.

### Negative Consequences
- Requires an API token.
- Slightly larger bundle size.

### Alternatives Considered
- **Leaflet.js:** Rejected — While open-source and easy, it relies on DOM elements for markers which performs poorly at scale, and 3D support is limited.

---

## DEC-008: PostgreSQL over MySQL

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Backend Lead

### Context
The primary relational database needs to handle high concurrency, complex analytical queries for reports, and potentially spatial data in the future.

### Decision
We will use PostgreSQL 15.

### Positive Consequences
- Superior handling of JSON fields (JSONB) for flexible configuration.
- Robust Multi-Version Concurrency Control (MVCC) prevents read locks during writes.
- Easy path to add PostGIS for advanced spatial queries later.

### Negative Consequences
- Slightly higher memory usage per connection compared to MySQL.

### Alternatives Considered
- **MySQL 8.0:** Rejected — While capable, Django's support for PostgreSQL specific features (ArrayField, advanced JSON operations) makes PostgreSQL the superior choice for this stack.

---

## DEC-009: Zustand over Redux

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Frontend Lead

### Context
We need global client state management in React for UI themes, user authentication status, and active emergency alerts.

### Decision
We will use Zustand for global state management.

### Positive Consequences
- Zero boilerplate (no actions, reducers, or providers required).
- Extremely small bundle size.
- Very intuitive hook-based API.

### Negative Consequences
- Smaller ecosystem of middleware compared to Redux.

### Alternatives Considered
- **Redux Toolkit:** Rejected — Too much boilerplate for the simple client state we are tracking (most server state will be handled by TanStack Query).

---

## DEC-010: React 18 + Vite over Next.js

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Frontend Lead

### Context
We are building a highly interactive single-page application (SPA) dashboard. SEO is not a requirement since it's an internal tool.

### Decision
We will use React 18 bundled with Vite.

### Positive Consequences
- Extremely fast local development server with Hot Module Replacement (HMR).
- Simple static deployment (just serve the `dist` folder).
- No server-side rendering (SSR) complexities.

### Negative Consequences
- No API Routes (backend API is strictly separated).

### Alternatives Considered
- **Next.js 14 (App Router):** Rejected — App Router has a steeper learning curve, Mapbox GL JS requires `use client` directives which complicates things, and SSR is overkill for an internal dashboard. Reserved for future public passenger portal.

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-09-02 | Initial 10 decisions documented | Tech Lead |
