# 02-blocks-service.md

> **File Order:** 18/45  
> **Previous File:** `03-service-blueprints/01-accounts-service.md`  
> **Next File:** `03-service-blueprints/03-ontology-service.md`  

---

### Blocks Service Blueprint

**Service ID:** `SVC-02`  
**App Name:** `blocks`  
**Primary Domain:** Maintenance Scheduling, Conflict Detection, and AI Resolution  
**Owner:** Backend Team & AI Lead  

---

### 1. Domain Models (Database Schema)

This service manages the core `BlockRequest` entity, which represents a request by a department to take over a section of the track.

```python
from django.db import models

class BlockStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Approval'
    APPROVED = 'APPROVED', 'Approved (Scheduled)'
    ACTIVE = 'ACTIVE', 'Currently Active'
    COMPLETED = 'COMPLETED', 'Work Completed'
    REJECTED = 'REJECTED', 'Rejected'
    CANCELLED = 'CANCELLED', 'Cancelled'

class BlockRequest(models.Model):
    id = models.CharField(max_length=20, primary_key=True) 
    requested_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='requested_blocks')
    department = models.CharField(max_length=3) 
    
    # Location
    section = models.ForeignKey('assets.Section', on_delete=models.PROTECT)
    from_km = models.DecimalField(max_digits=7, decimal_places=3)
    to_km = models.DecimalField(max_digits=7, decimal_places=3)
    
    # Time
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    
    # Details
    work_description = models.TextField()
    emergency_flag = models.BooleanField(default=False)
    photo_evidence = models.ImageField(upload_to='blocks/evidence/', null=True, blank=True)
    
    # State
    status = models.CharField(max_length=10, choices=BlockStatus.choices, default=BlockStatus.PENDING)
    approved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='approved_blocks')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'start_time']),
            models.Index(fields=['section', 'start_time', 'end_time']),
        ]
```

---

### 2. API Endpoints (DRF ViewSets)

| Method | Endpoint | Description | Auth/Role | Request Payload |
|--------|----------|-------------|-----------|-----------------|
| `POST` | `/api/v1/blocks/` | Creates a new block request. Validates KM markers. | Auth (All) | `{"section": "...", "from_km": 10, "to_km": 15, "start_time": "...", ...}` |
| `POST` | `/api/v1/blocks/emergency/` | Creates an emergency block. Bypasses queue. | Auth (All) | FormData with `photo_evidence` |
| `GET`  | `/api/v1/blocks/pending/` | Lists pending blocks. | Auth (COA, SE) | None |
| `POST` | `/api/v1/blocks/<id>/approve/`| Approves a block. | COA only | None |
| `GET`  | `/api/v1/blocks/conflicts/` | Lists detected overlaps/conflicts. | COA only | None |
| `POST` | `/api/v1/blocks/resolve/` | Triggers Gemini AI to suggest a resolution for a conflict. | COA only | `{"conflict_id": "..."}` |

---

### 3. Service Layer (Business Logic)

**File:** `blocks/services.py`

```python
class BlockService:
    def create_block(self, data, user):
        """Creates block, fires 'block_requested' signal, detects immediate conflicts."""
        pass

    def approve_block(self, block_id, user):
        """Changes status to APPROVED, fires 'block_approved' signal."""
        pass
        
    def activate_emergency(self, data, user):
        """Creates block as ACTIVE, fires 'emergency_block_activated' signal."""
        pass

class ConflictEngine:
    def detect_overlaps(self, new_block):
        """SQL query to find overlapping times and KMs on the same section."""
        # Uses PostGIS or manual range overlap query:
        # (StartA <= EndB) and (EndA >= StartB)
        pass

class AIResolverService:
    def resolve_conflict(self, block_a, block_b):
        """Delegates to Gemini AI for resolution explanation."""
        pass
```

---

### 4. Internal Events (Pub/Sub)

**4.1 Signals Emitted (Publisher)**
- `block_requested`: Emitted when a JE requests a block.
- `block_approved`: Emitted when COA approves. (Triggers Ontology sync).
- `block_rejected`: Emitted when COA rejects.
- `emergency_block_activated`: Emitted on emergency. (Triggers immediate SMS to all).
- `conflict_detected`: Emitted by the `ConflictEngine`.

**4.2 Signals Consumed (Subscriber)**
- None. This is the core domain that generates events for others.

---

### 5. Background Tasks (Celery)

**File:** `blocks/tasks.py`

- `resolve_conflict_ai_task`: A Celery task placed in the `ai_tasks` queue. Calls the Gemini API to analyze two conflicting blocks and return a structured JSON resolution suggestion (with Bengali/Hindi translation) to prevent blocking the COA's dashboard.

---

### 6. Dependencies

- **Upstream (Consumes from):** 
  - `assets`: Synchronously queries the `assets` API to ensure `from_km` and `to_km` are valid for the requested `section`.
  - `accounts`: Foreign Keys for user tracking.
- **Downstream (Provides to):** 
  - `ontology`: Listens to `block_approved` to update the graph.
  - `notifications`: Listens to `block_requested` to notify COA.
  - `analytics`: Queries `BlockRequest` table for daily reports.
