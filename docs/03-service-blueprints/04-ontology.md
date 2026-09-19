# 04-ontology.md

> **ফাইল ক্রম:** ২০/৪৫  
> **পূর্ববর্তী ফাইল:** [03-service-blueprints/03-departments.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/03-departments.md) (SVC-DEPT: Department & Resource Coordination Service)  
> **পরবর্তী ফাইল:** [03-service-blueprints/05-trains.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/05-trains.md)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের অ্যাডভান্সড এআই ইঞ্জিন **`SVC-ONTO` (Semantic Digital Twin & Symbolic AI Reasoning Service)**-এর পূর্ণাঙ্গ প্রোডাকশন আর্কিটেকচার ব্লুপ্রিন্ট সংজ্ঞায়িত করা হয়েছে। এতে OWL 2 DL নলেজ গ্রাফ, Owlready2 + HermiT Tableau Reasoner (Java 17 JVM), ডেসক্রিপশন লজিক (DL) এক্সিওমস, এবং ভারতীয় রেলওয়ের ট্র্যাক ইন্টারলকিং ও ২৫কেভি ওএইচই (OHE) পাওয়ার কাটের জন্য **জিরো-হ্যালুসিনেশন সেফটি প্রুফ (Zero-Hallucination Safety Proofs)** বিস্তারিতভাবে সন্নিবেশিত হয়েছে।

---

# SVC-ONTO: Semantic Digital Twin & Symbolic AI Reasoning Service

> **Service ID:** `SVC-ONTO`  
> **Bounded Context App:** `apps.ontology`  
> **Owning Team:** AI Knowledge Engineering & Formal Verification Team  
> **Business Criticality:** `Safety-Critical (Axiomatic Interlocking & Zero-Hallucination Safety Verification)`  
> **Primary SLA:** Availability $\ge 99.90\%$, p95 Graph Query $< 150\text{ ms}$, p95 HermiT Reasoner Sweep $< 1500\text{ ms}$  
> **Execution Runtime:** Celery 5.3 Dedicated Worker (`celery-ontology`, 4GB RAM Limit) + SQLite Quadstore

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission & Railway Mandate
`SVC-ONTO` হলো প্ল্যাটফর্মের ফর্মাল ভেরিফিকেশন (Formal Verification) এবং সিম্বলিক এআই ইঞ্জিন। সাধারণ লার্জ ল্যাঙ্গুয়েজ মডেল (LLM) যেখানে সম্ভাব্য উত্তর তৈরি করে এবং প্রায়শই হ্যালুসিনেশন (Hallucination) ঘটায়, সেখানে `SVC-ONTO` ডেসক্রিপশন লজিক (Description Logic - $\mathcal{SROIQ}(D)$) এবং **HermiT 1.4.3 Tableau Reasoner** ব্যবহার করে ১০০% গাণিতিক নিশ্চয়তা ও রিজনবিলিটি প্রুফ প্রদান করে।

এটি ট্র্যাক টপোলজি, সিগন্যালিং ইন্টারলকিং সার্কিট, এবং ২৫কেভি ওএইচই (OHE) ট্র্যাকশন পাওয়ার ফিডারের একটি রিয়েল-টাইম OWL 2 DL নলেজ গ্রাফ পরিচালনা করে। যখনই কোনো ব্লকের প্রস্তাব আসে, এটি পরীক্ষা করে দেখে যে একটি সেকশনে পাওয়ার কাট করলে সংলগ্ন লাইনে কোনো বৈদ্যুতিক যাত্রীবাহী ট্রেন (যেমন রাজধানী বা বন্দে ভারত) আটকে যাবে কিনা (Stranded Electric Train) কিংবা ট্রানজিট পয়েন্টে ডেডলক তৈরি হবে কিনা।

- **Problem Statement PS26027 Alignment:**
  - [x] Pillar 1: Automated AI Conflict Detection (Formal axiomatic proof of zero interlocking conflicts)
  - [x] Pillar 2: Joint Inter-Departmental Combined Block Windows (Cross-domain impact reasoning)
  - [x] Pillar 3: Permissive Safety & Site Execution Compliance (Zero-hallucination physical safety verification)
  - [x] Pillar 4: Predictive Asset Twin (High-fidelity ontological digital twin of physical track assets)

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - Authoritative OWL 2 DL ontology loading (`digital_twin/railway_ontology.owl`).
  - HermiT Reasoner execution inside an isolated, memory-capped Celery worker (`worker_ontology`).
  - Description Logic inference rules:
    1. Stranded Electric Train Inferences (`STRANDED_ELECTRIC_TRAIN`).
    2. Crossover Points Deadlock Inferences (`CROSSOVER_POINTS_DEADLOCK`).
    3. Signal Overlap Invasion (`SIGNAL_OVERLAP_INVASION`).
    4. Traction Feeder Isolation Concurrency (`FEEDER_ISOLATION_CONCURRENCY`).
  - SPARQL 1.1 analytical queries over the railway knowledge graph.
  - Generating mathematical explanation proofs for the Chief Train Controller (COA).
- **Explicit Exclusions (Out of Scope):**
  - Continuous GPS coordinates and line geometries (owned by PostGIS in `SVC-BLK` and `SVC-TRN`).
  - Block approval workflows and SAGA orchestration (owned by `SVC-BLK`).
  - Natural language translation (delegated to Gemini 1.5 Flash in `SVC-NOTIF`).

---

## 2. Technical Stack & Runtime Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SVC-ONTO RUNTIME TOPOLOGY                                            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Service Interface: `apps.ontology.services.digital_twin_service.DigitalTwinService`                   │
│  Semantic Engine: Owlready2 0.45+ (Python C-optimized bindings to OWL/RDF)                             │
│  Symbolic Reasoner: HermiT 1.4.3 Tableau Reasoner (Java 17 OpenJDK, Isolated JVM Heap: 3.5 GB)        │
│  Ontology Base Model: `digital_twin/railway_ontology.owl` (W3C OWL 2 DL Compliant)                    │
│  Dedicated Worker: Celery Queue `ontology` (`celery-A railway_sih worker -Q ontology -c 2`)           │
│  Container Memory Cap: 4.0 GB Hard Memory Limit (prevents JVM OOM from impacting Web servers)          │
│  Persistence: PostgreSQL 15 (`ontology_graphs`, `semantic_violations`) + Ephemeral SQLite Quadstore   │
│  Instrumentation: HermiT execution duration histograms & memory allocation metrics                    │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Component | Technology | Version | Purpose & Railway Domain Justification |
|---|---|---|---|
| **Ontology Framework** | Owlready2 | 0.45.x | Pythonic access to OWL classes/properties with binary stream loading |
| **Axiomatic Reasoner** | HermiT | 1.4.3 | Provably sound and complete tableau-based OWL 2 DL reasoner |
| **JVM Runtime** | OpenJDK | 17-jre-headless | High-performance Java runtime with G1GC garbage collection for graph nodes |
| **Worker Queue** | Celery Worker | 5.3.6 | Isolated queue (`ontology`) with strict concurrency 2 and 4GB memory limit |
| **Relational Store** | PostgreSQL | 15.6 | Persistence of compiled graph versions and flagged semantic violations |

---

## 3. Database Schema & Persistence (PostgreSQL 15 + PostGIS 3.3)

### 3.1 Table Definitions & Data Dictionary

```sql
-- =============================================================================
-- SVC-ONTO PostgreSQL 15 DDL Specification
-- =============================================================================

-- 1. Semantic Graph Version & Metadata Registry
CREATE TABLE ontology_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_tag VARCHAR(50) NOT NULL UNIQUE,
    owl_file_hash VARCHAR(64) NOT NULL,
    total_classes INT NOT NULL DEFAULT 0,
    total_properties INT NOT NULL DEFAULT 0,
    total_individuals INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    compiled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Persisted Semantic Violations & Inferred Conflict Proofs
CREATE TABLE semantic_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_id UUID NULL,
    block_id VARCHAR(64) NOT NULL,
    rule_identifier VARCHAR(80) NOT NULL,
    violation_type VARCHAR(50) NOT NULL DEFAULT 'STRANDED_ELECTRIC_TRAIN',
    severity VARCHAR(30) NOT NULL DEFAULT 'CRITICAL_SAFETY',
    explanation_narrative TEXT NOT NULL,
    involved_owl_individuals JSONB NOT NULL DEFAULT '[]'::jsonb,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_violations_graph FOREIGN KEY (graph_id) 
        REFERENCES ontology_graphs(id) ON DELETE CASCADE,
    CONSTRAINT chk_violations_type CHECK (
        violation_type IN ('STRANDED_ELECTRIC_TRAIN', 'CROSSOVER_POINTS_DEADLOCK', 
                           'SIGNAL_OVERLAP_INVASION', 'FEEDER_ISOLATION_CONCURRENCY')
    ),
    CONSTRAINT chk_violations_severity CHECK (
        severity IN ('CRITICAL_SAFETY', 'OPERATIONAL_IMPEDIMENT', 'ADVISORY')
    )
);
```

### 3.2 Indexing & Performance Strategy
```sql
-- High-speed B-tree and JSONB GIN Indexes
CREATE INDEX idx_violations_block ON semantic_violations (block_id);
CREATE INDEX idx_violations_rule ON semantic_violations (rule_identifier);
CREATE INDEX idx_violations_individuals ON semantic_violations USING GIN (involved_owl_individuals);
```

### 3.3 Redis Caching & Reasoner Lock Strategy
- **Reasoner Mutex Lock:** `lock:ontology:hermit_reasoner` with TTL = 30s. Ensures no more than 2 concurrent HermiT reasoners execute simultaneously to prevent CPU thrashing.
- **Compiled Graph Hash:** `cache:ontology:active_hash` -> SHA-256 digest of active OWL file. If hash matches, avoids re-compilation of base ontology.

---

## 4. OWL 2 DL Axiom Specifications & Semantic Reasoning Rules

The ontology is formally defined in Description Logic:

```python
# ==============================================================================
# Railway Digital Twin OWL 2 DL Definitions (Owlready2)
# ==============================================================================
import owlready2

ONTOLOGY_IRI = "http://railblock.ir.gov.in/ontology/railway"
onto = owlready2.get_ontology(ONTOLOGY_IRI)

with onto:
    # 1. Base Class Hierarchy
    class RailwayInfrastructure(owlready2.Thing): pass
    class TrackSection(RailwayInfrastructure): pass
    class CrossoverPoint(RailwayInfrastructure): pass
    class OHEZone(RailwayInfrastructure): pass
    class SignalAspect(RailwayInfrastructure): pass

    class RollingStock(owlready2.Thing): pass
    class Locomotive(RollingStock): pass
    class ElectricLocomotive(Locomotive): pass
    class DieselLocomotive(Locomotive): pass

    class OperationalEvent(owlready2.Thing): pass
    class TrainPath(OperationalEvent): pass
    class BlockPossession(OperationalEvent): pass
    class TractionPowerCutBlock(BlockPossession): pass

    # 2. Object Properties
    class electrifies(OHEZone >> TrackSection): pass
    class interlocksWith(SignalAspect >> TrackSection): pass
    class reservesTrack(BlockPossession >> TrackSection): pass
    class occupiesTrack(TrainPath >> TrackSection): pass
    class cutsPowerTo(TractionPowerCutBlock >> OHEZone): pass
    class hauledBy(TrainPath >> Locomotive): pass
    class lockedByRoute(CrossoverPoint >> TrainPath): pass

    # 3. Disjoint Classes (Physical Impossibility Axioms)
    owlready2.AllDisjoint([ElectricLocomotive, DieselLocomotive])
```

### 4.1 Description Logic Inferences & Rules

#### Rule 1: Stranded Electric Train ($\text{DL-RULE-001}$)
$$\text{TractionPowerCutBlock}(b) \sqcap \text{cutsPowerTo}(b, z) \sqcap \text{electrifies}(z, s) \sqcap \text{occupiesTrack}(t, s) \sqcap \text{hauledBy}(t, l) \sqcap \text{ElectricLocomotive}(l) \implies \text{StrandedElectricTrain}(t)$$
- **Physical Meaning:** If Block $b$ cuts 25kV traction power to zone $z$, which energizes track section $s$, and an active Train $t$ hauled by an electric locomotive occupies section $s$ during the block window, the train will lose traction power and become stranded on the main line.

#### Rule 2: Crossover Points Deadlock ($\text{DL-RULE-002}$)
$$\text{reservesTrack}(b, s_1) \sqcap \text{controlsCrossover}(p, s_1, s_2) \sqcap \text{occupiesTrack}(t, s_2) \implies \text{CrossoverDeadlock}(p)$$
- **Physical Meaning:** A maintenance block reserving track $s_1$ prevents the crossover point $p$ from reversing to clear track $s_2$ for diverging traffic, causing an interlocking deadlock.

---

## 5. API Endpoints Specification

All endpoints return the standard platform JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-18T10:40:00.000Z",
  "correlation_id": "b35975f5-cc5c-4d55-90cf-e0e124b2c600"
}
```

### Master API Routing Contract

| Method | Endpoint Route | Permissions | Request DTO | Response DTO | SLA Target |
|---|---|---|---|---|:---:|
| `POST` | `/api/v1/ontology/reason/` | Authenticated | `{"block_id": "uuid"}` | Async Job Token (`{"job_id", "status": "ENQUEUED"}`) | p95 < 60ms |
| `GET` | `/api/v1/ontology/jobs/{job_id}/` | Authenticated | URL UUID Parameter | Reasoning Execution State & Results | p95 < 30ms |
| `GET` | `/api/v1/ontology/violations/` | Authenticated | Filter: `?block_id=uuid` | Collection of Flagged Semantic Violations | p95 < 50ms |
| `GET` | `/api/v1/ontology/graph/summary/` | Authenticated | None | Active Triples, Classes & Individual Counts | p95 < 40ms |
| `POST` | `/api/v1/ontology/sparql/` | `CHIEF_CONTROLLER` | `{"query": "SELECT ?train..."}` | SPARQL 1.1 JSON Result Set | p95 < 200ms |

---

## 6. Event-Driven Contracts

### 6.1 Published Events (Redis Outbox & Channels)

```json
{
  "event_id": "b7720911-3312-4fe8-99aa-881299948123",
  "event_type": "ontology.reasoning.completed",
  "timestamp": "2026-09-18T10:45:00.000000Z",
  "actor_id": "hermit-reasoner-worker",
  "payload": {
    "block_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "VIOLATIONS_DETECTED",
    "violations_count": 1,
    "top_violation": "STRANDED_ELECTRIC_TRAIN",
    "severity": "CRITICAL_SAFETY",
    "rule_identifier": "DL-RULE-001",
    "explanation": "De-energizing OHE Sector ER-HWH-SEC-14 cuts 25kV power to TrackSection HWH-BWN-24-28, where Train 12301 (Howrah Rajdhani, Electric WAP-7) is scheduled to pass at 02:45."
  }
}
```

### 6.2 Consumed Events
- **`blocks.possession.submitted`:** Automatically enqueues HermiT reasoning job in the Celery `ontology` queue.
- **`blocks.possession.sanctioned`:** Triggers SAGA Step 3 verification proof before physical caution orders are generated.

---

## 7. Zero-Hallucination Semantic Safety Proofs

### Probabilistic Neural LLM vs. Deterministic Symbolic AI

| Evaluation Dimension | Neural AI (e.g. Gemini / GPT) | Symbolic AI (`SVC-ONTO` / HermiT) |
|---|---|---|
| **Determinism** | Probabilistic (Stochastic text completion) | **100% Deterministic (Description Logic proof)** |
| **Hallucination Risk** | High (Can invent nonexistent tracks/signals) | **0.00% Zero-Hallucination Guarantee** |
| **Safety Integrity** | Unsuitable for SIL-2 physical railway safety | **Formally Verifiable ($\mathcal{SROIQ}(D)$ Tableau)** |
| **Role in Platform** | Controller bilingual natural language explanations | **Hard Mathematical Safety Gate & Proof Engine** |

---

## 8. Configuration & Environment Variables

```env
# ==============================================================================
# SVC-ONTO Operational Environment Configuration
# ==============================================================================
ONTOLOGY_FILE_PATH=/app/digital_twin/railway_ontology.owl
ONTOLOGY_REASONER_TIMEOUT_SECONDS=30
ONTOLOGY_JVM_MAX_HEAP=3584m
ONTOLOGY_MAX_CONCURRENT_REASONERS=2

# Celery Worker Queue Configuration
ONTOLOGY_CELERY_QUEUE=ontology
```

---

## 9. Observability & Health Probes

- **Liveness Probe:** `GET /api/v1/ontology/health/liveness/` -> Returns `200 OK {"status": "UP"}`.
- **Readiness Probe:** `GET /api/v1/ontology/health/readiness/` -> Verifies Java 17 runtime availability, OWL ontology file integrity, and PostgreSQL connection.
- **Prometheus Custom Metrics:**
  - `ontology_reasoning_duration_seconds` (Histogram, p50/p90/p99)
  - `ontology_violations_detected_total{violation_type}` (Counter)
  - `ontology_active_individuals_gauge` (Gauge)
  - `ontology_reasoner_timeouts_total` (Counter - alerts if HermiT exceeds 30s)

---

## 10. Testing & Quality Assurance Mandate

- **OWL DL Consistency Test (`tests/test_ontology_consistency.py`):** Verify `digital_twin/railway_ontology.owl` is strictly compliant with OWL 2 DL and has zero unsatisfiable classes.
- **Stranded Train Inference Test (`tests/test_stranded_train.py`):** Inject a mock electric train into a track section where power is cut, and assert that HermiT reliably infers `STRANDED_ELECTRIC_TRAIN` with `CRITICAL_SAFETY` severity.
- **Memory Ceiling Stress Test:** Verify that running 50 sequential reasoning jobs inside the Celery worker stays strictly below the 4GB container RAM threshold without JVM Out-Of-Memory exceptions.

---

## 11. Next File Dependency Note

> **পরবর্তী ফাইল:** [03-service-blueprints/05-trains.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/05-trains.md)

`04-ontology.md` (`SVC-ONTO`) সম্পূর্ণ প্রস্তুত। পরবর্তী ফাইল `05-trains.md`-এ **Train Operations, Timetable & Network Service (`SVC-TRN`)**-এর প্রোডাকশন ব্লুপ্রিন্ট (পোস্টজিআইএস সেকশন টপোলজি, ট্রেনের ক্যাটাগরি ও প্রায়োরিটি স্কোরিং, লাইভ মুভমেন্ট ট্র্যাকিং, পাঙ্কচুয়ালিটি লস ক্যালকুলেশন এবং সেকশন ক্লিয়ারেন্স #80) সংজ্ঞায়িত করা হবে।
