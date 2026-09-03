# 00-service-template.md

> **File Order:** 16/45  
> **Previous File:** `02-microservices/01-dependency-matrix.md` (Rules of interaction)  
> **Next File:** `03-service-blueprints/01-accounts-service.md`  
> **Connection:** The following 8 service blueprints (`01` through `08`) will strictly adhere to the structure defined in this template.

---

## 1. Blueprint Structure

Every Service Blueprint in this folder must follow a standardized format to ensure consistency across the 8 Bounded Contexts. The template is defined below.

---

### [Service Name] Blueprint

**Service ID:** `SVC-XX`
**App Name:** `app_name`
**Primary Domain:** [Domain description]
**Owner:** [Role/Team]

---

### 1. Domain Models (Database Schema)

Describes the Django Models that "belong" to this bounded context. Includes field definitions, relationships, and indexes. 

*Rule: Do not define models that belong to other domains here.*

### 2. API Endpoints (DRF ViewSets)

Lists the HTTP routes exposed by this service to the frontend.

| Method | Endpoint | Description | Auth/Role | Request Payload |
|--------|----------|-------------|-----------|-----------------|
| `GET`/`POST` | `/api/v1/...` | ... | ... | ... |

### 3. Service Layer (Business Logic)

Defines the core Python classes and methods in `services.py` that handle the actual business rules, keeping the Views thin.

### 4. Internal Events (Pub/Sub)

Defines how this service interacts with other services asynchronously.

**4.1 Signals Emitted (Publisher)**
- What events does this service announce to the rest of the monolith?

**4.2 Signals Consumed (Subscriber)**
- What events from other services does this service listen to?

### 5. Background Tasks (Celery)

Lists any asynchronous tasks defined in `tasks.py` that belong to this domain (e.g., sending emails, generating reports).

### 6. Dependencies

Based on the Dependency Matrix (`01-dependency-matrix.md`), lists the other Bounded Contexts this service relies on to function.

- **Upstream (Consumes from):** e.g., `assets`, `accounts`
- **Downstream (Provides to):** e.g., `analytics`, `ontology`
