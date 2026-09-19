# 00-test-plan.md

> **File Sequence:** 39/45  
> **Directory:** `06-testing-qa/`  
> **Previous Document:** [05-deep-dive-logs/adrs/adr-0003-owlready2-digital-twin.md](../05-deep-dive-logs/adrs/adr-0003-owlready2-digital-twin.md)  
> **Next Document:** [06-testing-qa/01-e2e-scenarios.md](01-e2e-scenarios.md)  
> **Context:** Master Quality Assurance & Test Engineering Strategy for the Indian Railways Block Planning Platform (PS 26027).

---

# Master Quality Assurance & Test Strategy

---

## 1. Quality Mission & Safety Imperative

Because the AI Block Planning Platform schedules track possession windows along high-density passenger and freight corridors (such as New Delhi – Kanpur), software defects carry immediate real-world safety implications. The testing framework enforces zero tolerance for:
1. Spatial collision false negatives (failing to identify an overlapping train path or parallel block).
2. Optimistic concurrency race conditions permitting double-booking of a single track section.
3. Unhandled semantic hazards (e.g. de-energizing an OHE feeder while an electric locomotive occupies the sector).

---

## 2. Testing Pyramid & Coverage Targets

```
                      / \
                     /   \
                    / E2E \       10% (Playwright / Multi-User Operational Journeys)
                   /-------\
                  / Integr. \     30% (Pytest-Django + MySQL Spatial Test DB + Redis)
                 /-----------\
                /  Unit Tests \   60% (Fast Python Unit Tests, Domain Models, Math)
               /---------------\
```

| Test Level | Scope & Objective | Tooling / Framework | Target Coverage | Execution Trigger | Max Duration |
|---|---|---|:---:|---|:---:|
| **Unit Tests** | Domain models, interval tree conflict algorithms, validation rules, serializers | `pytest`, `pytest-mock`, `unittest` | 85%+ Lines | Every git commit / pre-commit hook | < 30 seconds |
| **Integration Tests** | DRF API controllers, MySQL 8.0 spatial queries, transaction boundaries, Celery tasks | `pytest-django`, `pytest-asyncio`, Docker test DB | 80%+ Branches | Every Pull Request | < 3 minutes |
| **Contract Tests** | OpenAPI schema fidelity, serialization envelopes, status codes | `schemathesis`, `dredd` | 100% Endpoints | Nightly CI build | < 2 minutes |
| **End-to-End (E2E)** | Full multi-departmental user flows across React UI and Daphne WebSockets | `playwright` (TypeScript) | Top 5 Journeys | Pre-merge to `main` | < 8 minutes |
| **Performance & Load**| Concurrent block submissions, conflict sweep throughput, WebSocket capacity | `k6` by Grafana | 500 RPS sustained | Pre-release staging gate | 15 minutes |

---

## 3. Test Environment Topology

- **Isolated Test Database:** Dedicated MySQL 8.0 instance running with `tmpfs` RAM mount for sub-second migrations and database rollbacks between test cases.
- **Mocked External Carriers:** External gateways (CDAC SMS provider, Indian Railways COA timetable API) are replaced with deterministic WireMock / responses stubs.
- **In-Memory Redis:** Isolated Redis DB 15 used for test queue broker and caching to prevent state pollution.
