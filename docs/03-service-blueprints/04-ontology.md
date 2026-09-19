# 04-ontology.md

> **File Sequence:** 20/45  
> **Previous Document:** [03-service-blueprints/03-departments.md](03-departments.md)  
> **Next Document:** [03-service-blueprints/05-trains.md](05-trains.md)  
> **Context:** Authoritative specification for `SVC-ONTO` (Semantic Digital Twin & Knowledge Graph Reasoner), implementing Owlready2 and HermiT reasoning over the Indian Railways infrastructure topology.

---

# SVC-ONTO: Semantic Digital Twin & Ontology Reasoning Service

> **Service ID:** `SVC-ONTO`  
> **Django App:** `apps.ontology`  
> **Owning Team:** AI Knowledge Engineering & Digital Twin Team  
> **Lead Architect:** Principal AI Ontologist  
> **Primary SLA:** 99.90% Availability, p95 Latency < 150ms (Graph Query), < 1500ms (HermiT Reasoner Execution)  
> **Classification:** Advanced Semantic Verification & Safety Compliance Engine

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission
Maintains a dynamic Web Ontology Language (OWL 2 DL) semantic knowledge graph of Indian Railways track networks, interlocking circuits, traction power feeds, and operational constraints. Ingests proposed block possessions and live train schedules, executing Description Logic (DL) reasoning via HermiT to infer non-obvious cross-domain safety hazards (e.g., de-energizing an OHE section that strands an electric passenger locomotive in an adjacent block).

### 1.2 Bounded Context Boundary
- **In-Scope Responsibilities:**
  - In-memory RDF/OWL triple store synchronization with relational MySQL tables.
  - Execution of Description Logic reasoner (HermiT) in an isolated Celery worker (`worker-ontology`).
  - Semantic rule validation (SWRL rules / OWL Axioms) for traction interdependence and route locking.
  - Generation of explainable semantic conflict proofs to assist the Chief Controller.
- **Explicit Exclusions:**
  - Relational GIS spatial queries (handled directly in MySQL by `SVC-BLK`).
  - Live train telemetry GPS ingestion (handled by `SVC-TRN`).

---

## 2. Technical Stack & Runtime Topology

```
+-------------------------------------------------------------------------------+
|                       SVC-ONTO RUNTIME ARCHITECTURE                           |
+-------------------------------------------------------------------------------+
|  Semantic Interface: apps.ontology.services.DigitalTwinService               |
|  Reasoning Framework: Owlready2 0.44 + HermiT 1.4.3 Reasoner (Java 17 JVM)   |
|  Ontology File: digital_twin/railway_ontology.owl (OWL 2 DL Standard)        |
|  Reasoning Worker: Celery Queue 'ontology' (Isolated 4GB RAM worker process)   |
|  Persistence Layer: MySQL 8.0 `ontology_graphs`, `semantic_violations`        |
|  Cache Store: Redis 7.2 (DB 4) - Graph State Digest & Reasoner Hashes         |
+-------------------------------------------------------------------------------+
```

| Component | Specification | Technical Rationale |
|---|---|---|
| **Ontology Library** | `Owlready2==0.44` | High-speed C-optimized Python bindings to OWL ontologies |
| **Semantic Reasoner** | HermiT 1.4.3 | Provably sound and complete tableau-based OWL 2 DL reasoner |
| **Graph Cache** | SQLite in-memory / Redis | High-speed triple indexing during incremental reasoning cycles |
| **Worker Process** | Celery Dedicated (`-Q ontology -c 1`) | Prevents JVM memory contention with Web request handling threads |

---

## 3. Database Schema & Persistence (MySQL 8.0)

### 3.1 Table Definitions

```sql
-- Semantic Graph Versions and RDF Snapshots
CREATE TABLE `ontology_graphs` (
  `id` CHAR(36) NOT NULL,
  `version_tag` VARCHAR(50) NOT NULL,
  `owl_file_hash` VARCHAR(64) NOT NULL,
  `total_classes` INT UNSIGNED NOT NULL,
  `total_properties` INT UNSIGNED NOT NULL,
  `total_individuals` INT UNSIGNED NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `compiled_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_graph_version` (`version_tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Semantic Violation & Inferred Conflict Ledger
CREATE TABLE `semantic_violations` (
  `id` CHAR(36) NOT NULL,
  `graph_id` CHAR(36) NOT NULL,
  `block_id` CHAR(36) NOT NULL,
  `rule_identifier` VARCHAR(80) NOT NULL,
  `violation_type` ENUM('STRANDED_ELECTRIC_TRAIN', 'CROSSOVER_POINTS_DEADLOCK', 'SIGNAL_OVERLAP_INVASION', 'FEEDER_ISOLATION_CONCURRENCY') NOT NULL,
  `severity` ENUM('CRITICAL_SAFETY', 'OPERATIONAL_IMPEDIMENT', 'ADVISORY') NOT NULL,
  `explanation_narrative` TEXT NOT NULL,
  `involved_owl_individuals` JSON NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_violations_block` (`block_id`),
  KEY `idx_violations_rule` (`rule_identifier`),
  CONSTRAINT `fk_violations_graph` FOREIGN KEY (`graph_id`) REFERENCES `ontology_graphs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. OWL Axiom Definitions & Reasoning Rules

```python
# Semantic Class & Property Definitions in Owlready2
from owlready2 import *

onto = get_ontology("http://railway.sih/digital_twin.owl")

with onto:
    class RailwayInfrastructure(Thing): pass
    class TrackSegment(RailwayInfrastructure): pass
    class OHEZone(RailwayInfrastructure): pass
    class SignalAspect(RailwayInfrastructure): pass
    class TrainPath(Thing): pass
    class BlockPossession(Thing): pass

    # Object Properties
    class electrifies(OHEZone >> TrackSegment): pass
    class interlocksWith(SignalAspect >> TrackSegment): pass
    class reservesTrack(BlockPossession >> TrackSegment): pass
    class occupiesTrack(TrainPath >> TrackSegment): pass
    class cutsPowerTo(BlockPossession >> OHEZone): pass

    # Semantic Rule: Electric Train Stranding Inference
    # If a Block cuts power to OHEZone Z, and Train T is an Electric Train occupying
    # Track S, and Z electrifies S -> Incur StrandedElectricTrain Conflict.
```

---

## 5. API Endpoints Specification

| Method | Endpoint | Permissions | Payload / Query | Response DTO | SLA (p95) |
|---|---|---|---|---|:---:|
| `POST` | `/api/v1/ontology/reason/` | Authenticated | `{"block_id": "uuid"}` | Async Job Token (`job_id`) | < 60ms |
| `GET` | `/api/v1/ontology/jobs/{job_id}/` | Authenticated | URL parameter | Reasoning Job Status & Results | < 30ms |
| `GET` | `/api/v1/ontology/violations/` | Authenticated | `?block_id=uuid` | Collection of Semantic Violations with Proofs | < 50ms |
| `GET` | `/api/v1/ontology/graph/summary/` | Authenticated | None | Active Triple Counts & Ontology Schema Version | < 40ms |

---

## 6. Event-Driven Contracts

### 6.1 Published Events (Redis `events:ontology`)

```json
{
  "event_id": "b7720911-3312-4fe8-99aa-881299948123",
  "event_type": "ontology.reasoning.completed",
  "timestamp": "2026-09-04T12:05:00.000000Z",
  "payload": {
    "block_id": "block-uuid-4412",
    "status": "VIOLATIONS_DETECTED",
    "violations_count": 1,
    "top_violation": "STRANDED_ELECTRIC_TRAIN",
    "explanation": "De-energizing OHE sub-sector 14 isolates crossover track 3B where Train 12424 (Rajdhani) is scheduled at 02:40."
  }
}
```
