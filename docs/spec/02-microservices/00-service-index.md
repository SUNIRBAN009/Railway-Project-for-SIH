# 00-service-index.md

> **File Order:** 14/45  
> **Previous File:** `01-tech-infra/09-testing-strategy.md` (End of Tech Infra phase)  
> **Next File:** `02-microservices/01-dependency-matrix.md`  
> **Connection:** This file provides a high-level index of the 8 Bounded Contexts (Django Apps) that make up the Modular Monolith. The next file will map how these services interact with one another.

---

## 1. Service (Bounded Context) Index

Although deployed as a single Django monolith, the application is strictly partitioned into 8 logical "services" (Django apps). Each app is responsible for a specific domain of the Indian Railways operations.

| Service ID | Django App Name | Primary Domain | Core Responsibility | Key Models |
|------------|-----------------|----------------|---------------------|------------|
| **SVC-01** | `accounts` | Identity & Access | User authentication, JWT issuance, and RBAC (Role-Based Access Control) assignment. | `User` |
| **SVC-02** | `blocks` | Maintenance Scheduling | The core engine. Handles block request CRUD, approval workflows, and overlap conflict detection. | `BlockRequest` |
| **SVC-03** | `ontology` | Semantic Reasoning | Manages the Owlready2 digital twin, synchronizes DB state to the graph, and runs SPARQL/HermiT inference. | N/A (Graph storage) |
| **SVC-04** | `trains` | Traffic & Operations | Train schedules, routes, and calculating train delays/cancellations due to blocks. | `Train`, `Schedule` |
| **SVC-05** | `departments` | Resource Planning | Management of engineering crews, maintenance gangs, and material inventory per division. | `Crew`, `Material` |
| **SVC-06** | `assets` | Physical Infrastructure | GIS-capable inventory of track sections, signal blocks, points, and OHE lines. | `Section`, `Asset` |
| **SVC-07** | `analytics` | Reporting | Generates impact score calculations, daily passenger disruption reports, and PDF exports. | `DailyReport` |
| **SVC-08** | `notifications` | Alerts & Comms | Dispatches SMS (Twilio), emails, and in-app WebSocket broadcasts (emergency alerts). | `AlertLog` |

---

## 2. Directory Mapping

The logical services map directly to physical directories inside the `backend/` folder.

```text
backend/
├── accounts/         (SVC-01)
├── blocks/           (SVC-02)
├── ontology/         (SVC-03)
├── trains/           (SVC-04)
├── departments/      (SVC-05)
├── assets/           (SVC-06)
├── analytics/        (SVC-07)
└── notifications/    (SVC-08)
```

## 3. General Rules for all Services

To maintain the boundaries of these modules (so they can be easily extracted into true microservices in Phase 3 of scaling), the following rules apply to ALL services listed above:

1. **Self-Contained DB Schema:** A service should ideally own its tables.
2. **Exposed Service Layer:** Business logic must live in `services.py`, not in `views.py`.
3. **API Contracts:** The DRF Serializers act as the input/output contract for the frontend.
4. **Signal Communication:** Cross-domain events (like a Block being approved) must be communicated via Django Signals, not by hardcoding a call to another service's function.
