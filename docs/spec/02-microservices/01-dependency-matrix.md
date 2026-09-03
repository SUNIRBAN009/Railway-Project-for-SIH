# 01-dependency-matrix.md

> **File Order:** 15/45  
> **Previous File:** `02-microservices/00-service-index.md` (List of services)  
> **Next File:** `03-service-blueprints/00-service-template.md`  
> **Connection:** This matrix defines the exact boundaries and rules of communication between the services listed in the previous file. The following Phase 3 blueprints will strictly adhere to these boundaries.

---

## 1. Context Mapping & Dependency Matrix

The table below defines how the 8 Django Apps (Bounded Contexts) interact with one another. To maintain modularity, we define "Upstream" (Providers) and "Downstream" (Consumers).

**Legend:**
- **FK:** Foreign Key (Allowed since they share a DB).
- **API (Direct):** Synchronous function call to the target service's `services.py`.
- **Signal:** Asynchronous/Decoupled event via Django Signals.
- **- :** No dependency.

| Consumer (Downstream) ⬇️ \ Provider ➡️ | `accounts` | `blocks` | `ontology` | `trains` | `departments` | `assets` | `analytics` | `notifications` |
|----------------------------------------|------------|----------|------------|----------|---------------|----------|-------------|-----------------|
| **`accounts`** | — | - | - | - | - | - | - | - |
| **`blocks`** | FK (User) | — | - | - | FK (Crew) | FK, API (Direct) | - | - |
| **`ontology`** | - | Signal | — | Signal | - | API (Direct) | - | - |
| **`trains`** | - | - | - | — | - | - | - | - |
| **`departments`** | - | - | - | - | — | FK (Section) | - | - |
| **`assets`** | - | - | - | - | - | — | - | - |
| **`analytics`** | - | API (Direct)| API (Direct)| API (Direct)| - | - | — | - |
| **`notifications`** | - | Signal | - | - | - | - | - | — |

---

## 2. Dependency Rules & Violations

### 2.1 The "Core" Layer
`accounts`, `assets`, and `departments` are foundational. They do not depend on other domains. They only expose APIs/Models for others to consume.

### 2.2 The "Business" Layer
`blocks` and `trains` represent the core railway operations. 
- `blocks` depends on `assets` (to know where the block is) and `departments` (to know who is doing the work).
- `blocks` uses **Synchronous API Calls** to `assets.services` during block creation to validate KM markers.

### 2.3 The "Observer" Layer
`ontology`, `analytics`, and `notifications` are observers.
- They must **NEVER** be called directly by the `blocks` app. 
- Instead, they listen to **Django Signals** emitted by `blocks` (e.g., `block_approved`, `emergency_activated`).
- This prevents the core application from crashing if the Twilio API is down or if the Semantic Graph takes too long to reason.

---

## 3. Extracting to Microservices (Phase 3 Path)

If the application scales to 10,000+ users (Zonal level) and requires splitting the monolith, the dependency matrix highlights the easiest extraction paths:

### 3.1 Candidate 1: `notifications`
Because it only consumes Signals (which can be easily swapped to Redis Pub/Sub or Kafka) and has zero outgoing Foreign Keys, `notifications` can be extracted into a separate Node.js or Python microservice instantly.

### 3.2 Candidate 2: `ontology`
The Semantic Digital Twin is computationally heavy (HermiT reasoner). It consumes signals and queries `assets` via API. It can be moved to a dedicated server running Apache Jena Fuseki. The Django signal in `blocks` would just be updated to drop a message into a Redis queue consumed by the new Ontology service.

### 3.3 The Hardest Extraction: `blocks`
Because `blocks` relies heavily on database Foreign Keys to `accounts`, `assets`, and `departments`, splitting it out would require implementing a Data Replication strategy or a complex API Gateway. It should remain in the core monolith for as long as possible.
