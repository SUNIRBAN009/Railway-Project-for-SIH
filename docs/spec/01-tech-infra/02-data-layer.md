# 02-data-layer.md

> **File Order:** 6/45  
> **Previous File:** `01-tech-infra/01-frontend-core.md` (Frontend Data Consumption)  
> **Next File:** `01-tech-infra/03-event-brokers.md`  
> **Connection:** This file defines the core PostgreSQL schema and the Owlready2 Quadstore model. The models defined here will be acted upon by the Celery Background Workers and Django Channels defined in the upcoming Event Brokers file.

---

## 1. Database Strategy

We use a polyglot persistence strategy, combining the strengths of a relational database (PostgreSQL) for transactional data with a semantic graph database (Owlready2 Quadstore) for reasoning.

| Store | Technology | Primary Use Case |
|-------|------------|------------------|
| **Primary Relational DB** | PostgreSQL 15 | Users, Blocks, Assets, Trains, Analytics |
| **Semantic Digital Twin** | Owlready2 (SQLite Quadstore) | Conflict impact reasoning, SPARQL queries |
| **Cache & Queue** | Redis 7 | User sessions, Celery task queue, Rate limits |
| **Media Storage** | Local Volume / AWS S3 | Photo uploads for emergency blocks |

---

## 2. PostgreSQL Schema (Core Domain)

### 2.1 App: Accounts

```python
# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class Department(models.TextChoices):
    ENG = 'ENG', 'Engineering (Track)'
    TRD = 'TRD', 'Traction Distribution (OHE)'
    SNT = 'SNT', 'Signal & Telecom'
    COA = 'COA', 'Control Office'

class Role(models.TextChoices):
    JE = 'JE', 'Junior Engineer'
    SE = 'SE', 'Section Engineer'
    COA = 'COA', 'Control Office Administrator'

class User(AbstractUser):
    # email, username, password inherited from AbstractUser
    phone_number = models.CharField(max_length=15, unique=True)
    department = models.CharField(max_length=3, choices=Department.choices)
    role = models.CharField(max_length=3, choices=Role.choices)
    
    class Meta:
        indexes = [models.Index(fields=['department', 'role'])]
```

### 2.2 App: Blocks

```python
# blocks/models.py
from django.db import models

class BlockStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Approval'
    APPROVED = 'APPROVED', 'Approved (Scheduled)'
    ACTIVE = 'ACTIVE', 'Currently Active'
    COMPLETED = 'COMPLETED', 'Work Completed'
    REJECTED = 'REJECTED', 'Rejected'
    CANCELLED = 'CANCELLED', 'Cancelled'

class BlockRequest(models.Model):
    id = models.CharField(max_length=20, primary_key=True) # e.g., BLK-20260902-001
    requested_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='requested_blocks')
    department = models.CharField(max_length=3) # Denormalized for fast filtering
    
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
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'start_time']),
            models.Index(fields=['section', 'start_time', 'end_time']),
        ]
```

### 2.3 App: Assets & Trains (Abridged)

```python
# assets/models.py
class Section(models.Model):
    code = models.CharField(max_length=10, primary_key=True) # e.g., HWH-KGP
    name = models.CharField(max_length=100)
    total_length_km = models.DecimalField(max_digits=7, decimal_places=3)

# trains/models.py
class Train(models.Model):
    train_number = models.CharField(max_length=6, primary_key=True)
    name = models.CharField(max_length=100)
    priority = models.IntegerField(default=1) # 1=Normal, 5=Rajdhani, 10=Emergency
```

---

## 3. The Semantic Digital Twin (Owlready2)

While PostgreSQL stores the transactional records, Owlready2 maintains the semantic relationship between entities to answer complex queries (e.g., "If OHE is down on HWH-KGP, which electric trains are affected?").

### 3.1 Ontology Schema (`railway_digital_twin.owl`)

**Classes (Concepts):**
- `RailwayComponent` (Base)
  - `TrackSegment`
  - `OHESegment`
  - `SignalBlock`
- `TrainEntity`
  - `ElectricTrain`
  - `DieselTrain`
- `BlockEvent`

**Object Properties (Relationships):**
- `connectsTo` (TrackSegment -> TrackSegment)
- `poweredBy` (TrackSegment -> OHESegment)
- `controlledBy` (TrackSegment -> SignalBlock)
- `runsOn` (TrainEntity -> TrackSegment)
- `affectsComponent` (BlockEvent -> RailwayComponent)

### 3.2 Property Chains (Inference Logic)

The power of the semantic web is automatic inference without writing complex SQL joins.

**Rule 1:** If a Block affects an OHE segment, it automatically affects the track powered by that OHE.
`affectsComponent(Block, OHE) AND powers(OHE, Track) -> affectsComponent(Block, Track)`

**Rule 2:** If a Track is affected, any Train running on it is affected.
`affectsComponent(Block, Track) AND runsOn(Train, Track) -> disruptsTrain(Block, Train)`

### 3.3 SPARQL Query Example

When the COA opens a Block Request, the system runs this SPARQL query against the Quadstore to find affected trains:

```sparql
PREFIX rly: <http://example.org/railway#>

SELECT ?train ?trainName
WHERE {
  # Find the specific block
  ?block rdf:type rly:BlockEvent .
  ?block rly:hasId "BLK-20260902-001" .
  
  # The HermiT reasoner has already inferred 'disruptsTrain' 
  # based on the Property Chains defined above!
  ?block rly:disruptsTrain ?train .
  ?train rly:trainName ?trainName .
}
```

---

## 4. Cache & Queue Strategy (Redis)

Redis is used for four distinct purposes in this architecture:

### 4.1 Django Cache Backend

- **Key Pattern:** `cache:api:blocks:pending`
- **TTL:** 5 minutes
- **Invalidation:** Triggered by Django `post_save` signal on the `BlockRequest` model.

### 4.2 Django Channels Layer

- Handles Pub/Sub for WebSockets.
- Maps `ws_group_coa_dashboard` to currently connected users to push real-time conflict alerts.

### 4.3 Celery Task Queue

- **Broker:** Redis (List data structure).
- **Queues:**
  - `high_priority`: Emergency block alerts, Twilio SMS.
  - `default`: Ontology sync, Gemini API calls.
  - `low_priority`: Daily PDF report generation.

### 4.4 Rate Limiting Store

- Used by DRF Throttling to track request counts.
- **Key Pattern:** `throttle:user_123:minute`

---

## 5. Migrations & Seed Data

Because this is a hackathon MVP, data seeding is critical for the demonstration.

- **Django Migrations:** Standard `makemigrations` and `migrate`.
- **Ontology Generation:** A script `scripts/build_base_ontology.py` creates the base `.owl` file from the `assets.Section` database table.
- **Seed Scripts:** 
  - `scripts/seed_users.py`: Creates COA, ENG_JE, TRD_JE, SNT_JE.
  - `scripts/seed_sections.py`: Creates the Howrah-Kharagpur corridor.
  - `scripts/seed_conflicts.py`: Creates a deliberate overlapping block between ENG and TRD to demonstrate the AI resolution feature.
