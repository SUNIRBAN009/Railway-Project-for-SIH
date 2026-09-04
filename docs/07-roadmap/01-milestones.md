# 01-milestones.md

> **File Sequence:** 44/45  
> **Previous Document:** [07-roadmap/00-phases.md](00-phases.md)  
> **Next Document:** [07-roadmap/02-rollback-plan.md](02-rollback-plan.md)  
> **Context:** Key project milestones, strict acceptance criteria, and delivery gates for the Indian Railways Block Planning Platform (PS 26027).

---

# Project Delivery Milestones & Acceptance Gates

---

## 1. Master Milestone Schedule

| Milestone Code | Milestone Title | Target Date | Critical Acceptance Gate Criteria | Sign-off Authority |
|---|---|:---:|---|---|
| **MS-01** | Architecture & Specification Baseline | Day 3 | All 45 specification files approved, zero placeholders, MySQL 8.0 schema finalized. | Lead Architect |
| **MS-02** | Security & Auth Engine | Day 7 | RS256 JWT login, refresh rotation, Argon2id hashing, and RBAC matrix fully tested. | Security Lead |
| **MS-03** | Core Block Scheduling & Spatial Engine | Day 14 | MySQL Spatial `LINESTRING` corridor indexing active; sweep-line conflict detection passes 100% test cases. | Operations Lead |
| **MS-04** | Semantic Digital Twin Reasoner | Day 21 | Owlready2 + HermiT reasoner running in Celery worker; detects stranded electric train safety hazards. | AI Lead |
| **MS-05** | Real-Time Push & Mobile WebSockets | Day 28 | Daphne ASGI server delivering sub-25ms push-to-invalidate frames to React client; SMS fallback verified. | Frontend Lead |
| **MS-06** | SIH Master Demonstration Release | Day 35 | End-to-end Delhi-Kanpur seeded demo runs flawlessly; k6 load test passes 1,000 VUs at < 50ms p95. | CTO / Team Lead |

---

## 2. Detailed Acceptance Criteria per Milestone

### MS-03: Core Block Scheduling Acceptance Criteria
- [x] Successful migration of `corridors`, `blocks`, and `block_conflicts` tables into MySQL 8.0.
- [x] Spatial query `ST_Intersects` executes in under 20ms over a 440km corridor geometry.
- [x] Submitting a block overlapping Train 12424 (Rajdhani) returns HTTP 409 with error `BLK-003`.
- [x] Multiple Section Controllers cannot concurrently overwrite block state (enforced via `version` column).

### MS-04: Semantic Reasoner Acceptance Criteria
- [x] Celery worker process boots with Java 17 JVM and initializes `railway_ontology.owl`.
- [x] Reasoner completes DL classification in under 1500ms for a standard block corridor slice.
- [x] Verified deduction of `StrandedElectricTrainHazard` with human-readable proof narrative.
