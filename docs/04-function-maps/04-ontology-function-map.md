# 04-ontology-function-map.md

> **File Sequence:** 29/45  
> **Service:** `SVC-ONTO` (`apps.ontology`)  
> **Previous Document:** [04-function-maps/03-departments-function-map.md](03-departments-function-map.md)  
> **Next Document:** [04-function-maps/05-trains-function-map.md](05-trains-function-map.md)  
> **Context:** Exhaustive function mapping, reasoning workers, schemas, and axioms for the Digital Twin Knowledge Graph.

---

## 1. Function Catalog

| Function ID | Function Name | HTTP Method | Path / Event | Input Schema | Output Schema | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-ONTO-001` | Trigger HermiT DL Inference Job | `POST` | `/api/v1/ontology/reason/` | `ReasoningTriggerDTO` | `AsyncJobResponseDTO` | < 60ms |
| `FUNC-ONTO-002` | Fetch Reasoning Job Status | `GET` | `/api/v1/ontology/jobs/{job_id}/` | URL parameter | `JobStatusDetailDTO` | < 30ms |
| `FUNC-ONTO-003` | Query Semantic Violations for Block | `GET` | `/api/v1/ontology/violations/` | `?block_id=uuid` | `ViolationsCollectionDTO` | < 50ms |
| `FUNC-ONTO-004` | Query Digital Twin Graph Summary | `GET` | `/api/v1/ontology/graph/summary/` | None | `GraphMetricsDTO` | < 40ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-ONTO-001`: Trigger HermiT DL Inference Job
- **Controller Class:** `apps.ontology.views.OntologyReasoningTriggerView`
- **Permissions:** `IsAuthenticated`
- **Input Schema:** `{"block_id": "block-uuid-4412", "validate_train_paths": true}`
- **Processing Logic:**
  1. Validate `block_id` exists in MySQL `blocks` table.
  2. Generate unique `job_id = uuid4()`.
  3. Set initial state in Redis: `SET ontology:job:{job_id} {"status": "QUEUED", "progress": 0}` (TTL 3600s).
  4. Dispatch Celery task to dedicated JVM-capable queue:
     `apps.ontology.tasks.run_hermit_reasoner.apply_async(args=[job_id, block_id], queue='ontology')`
  5. Return HTTP 202 Accepted with `job_id` and status poll endpoint.

---

### `apps.ontology.tasks.run_hermit_reasoner` (Celery Worker Execution)
- **Runtime Environment:** Celery worker with Java 17 OpenJDK installed (`JAVA_HOME=/usr/lib/jvm/java-17-openjdk`).
- **Processing Steps:**
  1. Load cached OWL ontology using `owlready2.get_ontology("digital_twin/railway_ontology.owl").load()`.
  2. Instantiate dynamic individuals for the proposed block and conflicting trains in the OWL graph:
     ```python
     block_ind = onto.BlockPossession(f"Block_{block.id}")
     block_ind.cutsPowerTo = [onto.OHEZone(z) for z in impacted_ohe_zones]
     block_ind.reservesTrack = [onto.TrackSegment(s) for s in occupied_segments]
     ```
  3. Execute HermiT Reasoner:
     ```python
     with onto:
         sync_reasoner_hermit(infer_property_values=True, debug=0)
     ```
  4. Inspect inferred property assertions and consistency violations:
     - Detect if any individual is classified under `onto.SafetyHazard` or `onto.InconsistentSchedule`.
     - Extract narrative proof chain explaining why the hazard was inferred.
  5. Persist violations to MySQL `semantic_violations`.
  6. Update Redis status: `SET ontology:job:{job_id} {"status": "COMPLETED", "violations": count}`.
  7. Publish event `ontology.reasoning.completed` to Redis channel `events:ontology`.
