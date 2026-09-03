# 03-ontology-service.md

> **File Order:** 19/45  
> **Previous File:** `03-service-blueprints/02-blocks-service.md`  
> **Next File:** `03-service-blueprints/04-trains-service.md`  

---

### Ontology Service Blueprint

**Service ID:** `SVC-03`  
**App Name:** `ontology`  
**Primary Domain:** Semantic Digital Twin and Reasoning  
**Owner:** AI Lead  

---

### 1. Domain Models (Database Schema)

This service heavily utilizes the `Owlready2` SQLite Quadstore instead of standard Django models. However, it requires a small Django model to track the state of the graph file.

```python
from django.db import models

class OntologyVersion(models.Model):
    version_id = models.AutoField(primary_key=True)
    file_path = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=False)
    
    # Audit
    reasoner_run_at = models.DateTimeField(null=True, blank=True)
    is_consistent = models.BooleanField(default=True)
```

---

### 2. API Endpoints (DRF ViewSets)

| Method | Endpoint | Description | Auth/Role | Request Payload |
|--------|----------|-------------|-----------|-----------------|
| `GET`  | `/api/v1/ontology/status/` | Returns the health and consistency of the current graph. | COA only | None |
| `POST` | `/api/v1/ontology/sync/` | Manually forces a sync from PostgreSQL to the OWL file. | System Admin | None |
| `GET`  | `/api/v1/ontology/reason/` | Executes a specific SPARQL query on the reasoned graph. | COA only | `?query=...` (Base64 encoded) |

---

### 3. Service Layer (Business Logic)

**File:** `ontology/manager.py`

```python
from owlready2 import get_ontology, sync_reasoner_pellet, default_world
from .models import OntologyVersion

class DigitalTwinManager:
    def __init__(self):
        active_version = OntologyVersion.objects.filter(is_active=True).first()
        self.ontology = get_ontology(f"file://{active_version.file_path}").load()

    def sync_block_event(self, block_id, section_code, status):
        """Creates a BlockEvent instance in the ontology graph."""
        with self.ontology:
            # Create instance dynamically
            BlockEventClass = self.ontology.BlockEvent
            new_block = BlockEventClass(block_id)
            new_block.hasStatus = status
            
            # Link to existing section
            section_instance = self.ontology[section_code]
            if section_instance:
                new_block.affectsSection.append(section_instance)
                
        self.ontology.save()

    def run_reasoner(self):
        """Executes HermiT/Pellet reasoner to infer new relationships."""
        with self.ontology:
            sync_reasoner_pellet(infer_property_values=True)
        self.ontology.save()

class SPARQLExecutor:
    def get_affected_trains(self, block_id):
        """Runs SPARQL to find trains disrupted by a block."""
        query = f"""
            PREFIX rly: <http://example.org/railway#>
            SELECT ?train
            WHERE {{
              ?block rly:hasId "{block_id}" .
              ?block rly:disruptsTrain ?train .
            }}
        """
        results = list(default_world.sparql(query))
        return [res[0].name for res in results]
```

---

### 4. Internal Events (Pub/Sub)

**4.1 Signals Emitted (Publisher)**
- `ontology_sync_failed`: Emitted if saving to the Quadstore fails.
- `ontology_inconsistent`: Emitted if the reasoner detects a logical contradiction in the graph.

**4.2 Signals Consumed (Subscriber)**
- `blocks.block_approved`: Listens to insert the block into the graph.
- `assets.asset_status_changed`: Listens to update the physical state of the digital twin.

---

### 5. Background Tasks (Celery)

**File:** `ontology/tasks.py`

- `sync_block_event_task`: Because updating the graph requires a file lock on the SQLite quadstore, `blocks.block_approved` triggers this Celery task (in the `default` queue) to prevent the HTTP request from hanging.
- `run_hermit_reasoner`: Scheduled by Celery Beat to run at 2:00 AM daily to do a deep consistency check of the entire network.

---

### 6. Dependencies

- **Upstream (Consumes from):** 
  - `blocks`: Consumes signals to know when to add a block.
  - `assets`: Uses the Asset database to build the base OWL file initially.
- **Downstream (Provides to):** 
  - `analytics`: The Analytics service calls `SPARQLExecutor.get_affected_trains()` to calculate the daily impact score.
