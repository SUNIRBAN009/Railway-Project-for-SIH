# ADR-0001: Modular Monolith Architecture Pattern

> **Status:** Accepted  
> **Date:** 2026-09-02  
> **Deciders:** Lead Systems Architect, Backend Infrastructure Lead, Security Lead  
> **Scope:** Entire System Architecture (Indian Railways AI Block Planning Platform - PS 26027)

---

## 1. Context & Problem Statement

The Indian Railways AI Block Planning Platform must coordinate block requests, train running timetables, track geometry, maintenance gangs, asset condition monitoring, and an OWL digital twin.

During architectural design, two primary architectural patterns were considered:
1. **Fully Distributed Microservices:** 8 independent microservices, each in a standalone Git repository with isolated databases, communicating over gRPC/REST with distributed service discovery (Consul/Envoy) and distributed tracing (Jaeger).
2. **Modular Monolith:** A single, well-structured Django 5.0 application organized into strict Domain-Driven Design (DDD) Bounded Contexts (`apps.accounts`, `apps.blocks`, `apps.departments`, `apps.ontology`, etc.), sharing a single optimized relational database (MySQL 8.0) and asynchronous worker queues (Celery + Redis).

Given the high reliability requirements, tight SIH timeline, and small cross-functional engineering team, the distributed microservices pattern introduces severe operational overhead: network latency between services, complex distributed transactions (2-Phase Commit or Saga), independent CI/CD pipelines, and high infrastructure footprint.

---

## 2. Decision

We choose the **Modular Monolith** architecture implemented via **Django 5.0 Apps** as strict Domain-Driven Design (DDD) Bounded Contexts.

- All domains reside within a unified codebase and deploy as a single containerized unit.
- Inter-module boundaries are enforced via domain interfaces and internal service classes rather than direct cross-app model queries.
- Asynchronous side-effects and long-running computational workloads (such as Description Logic reasoning and conflict detection sweeps) are decoupled via Celery workers over Redis queues (`high`, `notify`, `ontology`, `low`, `default`).
- High-throughput real-time communication is supported by mounting Daphne ASGI on port 8001 for WebSocket connections alongside standard HTTP REST traffic.

---

## 3. Consequences

### Positive Consequences
- **High Development Velocity:** Single repository, single test suite, zero network hops for transactional business flows.
- **ACID Transaction Guarantees:** Multi-table operations (e.g., transitioning block status, locking track corridor geometry, and issuing work orders) execute within a single MySQL database transaction, eliminating complex distributed transaction coordinators.
- **Simplified Operational Topology:** A single Docker Compose stack with Django, Redis, and MySQL runs locally on developer workstations without needing Kubernetes or a service mesh.
- **Observability Simplicity:** Unified structured logging and simplified tracing without distributed context propagation failures.

### Negative Consequences & Mitigation
- **Risk of Domain Leaks:** Developers might attempt to import models directly across apps (e.g., `apps.blocks` directly modifying `apps.departments.models.Gang`).  
  *Mitigation:* Enforced via Ruff linting rules and strict architectural code reviews prohibiting cross-boundary model mutations.
- **Worker Resource Contention:** Memory-heavy tasks (like HermiT DL reasoning) could impact web server response latency.  
  *Mitigation:* Segregated Celery worker pools (`worker-ontology` runs in an isolated container with its own memory allocation).

---

## 4. Alternatives Considered & Rejection Rationale

- **Distributed Microservices (Kubernetes + gRPC):** Rejected due to operational complexity, distributed transaction failure modes, and unnecessary deployment friction for an MVP/SIH delivery phase.
- **Single Monolithic Django App (Unstructured):** Rejected because combining all tables into a single app leads to spaghetti code and prevents clean extraction into independent services if scaling demands require it in Phase 4.
