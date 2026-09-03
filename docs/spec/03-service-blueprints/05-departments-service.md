# 05-departments-service.md

> **File Order:** 21/45  
> **Previous File:** `03-service-blueprints/04-trains-service.md`  
> **Next File:** `03-service-blueprints/06-assets-service.md`  

---

### Departments Service Blueprint

**Service ID:** `SVC-05`  
**App Name:** `departments`  
**Primary Domain:** Maintenance Crew and Material Inventory Management  
**Owner:** Backend Team  

---

### 1. Domain Models (Database Schema)

This service manages the physical resources (crews and materials) deployed by the three technical departments (ENG, TRD, SNT).

```python
from django.db import models

class Crew(models.Model):
    id = models.CharField(max_length=20, primary_key=True) # e.g., CREW-ENG-HWH-01
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=3) # ENG, TRD, SNT
    supervisor = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    
    # Current location/assignment
    base_section = models.ForeignKey('assets.Section', on_delete=models.PROTECT)
    contact_number = models.CharField(max_length=15)
    
    is_available = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['department', 'is_available']),
            models.Index(fields=['base_section']),
        ]

class MaterialInventory(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=3)
    
    # E.g., Sleepers, Rails (ENG), Copper Wire (TRD), Relays (SNT)
    quantity_available = models.IntegerField(default=0)
    depot_location = models.CharField(max_length=100)
```

---

### 2. API Endpoints (DRF ViewSets)

| Method | Endpoint | Description | Auth/Role | Request Payload |
|--------|----------|-------------|-----------|-----------------|
| `GET`  | `/api/v1/crews/` | Lists crews. Filters by department and availability. | Auth (All) | None |
| `GET`  | `/api/v1/crews/nearest/` | Finds the nearest available crew to a specific KM on a section. | Auth (All) | `?section=...&km=...` |
| `PATCH`| `/api/v1/crews/<id>/` | Updates crew availability. | JE, SE | `{"is_available": false}` |
| `GET`  | `/api/v1/materials/` | Lists material inventory for the user's department. | JE, SE, COA | None |

---

### 3. Service Layer (Business Logic)

**File:** `departments/services.py`

```python
from .models import Crew

class CrewAssignmentService:
    def find_nearest_available_crew(self, department_code, section_code):
        """
        Locates the nearest available crew for an emergency block.
        If no crew is available in the exact section, it finds one in adjacent sections 
        (adjacency logic requires querying the Assets service or Ontology).
        """
        # First try: same department, same section, available
        crew = Crew.objects.filter(
            department=department_code,
            base_section_id=section_code,
            is_available=True
        ).first()
        
        if crew:
            return crew
            
        # Fallback logic omitted for brevity (queries adjacent sections)
        return None

    def lock_crew_for_block(self, crew_id):
        """Marks a crew as unavailable when a block starts."""
        Crew.objects.filter(id=crew_id).update(is_available=False)

    def release_crew(self, crew_id):
        """Marks a crew as available when a block completes."""
        Crew.objects.filter(id=crew_id).update(is_available=True)
```

---

### 4. Internal Events (Pub/Sub)

**4.1 Signals Emitted (Publisher)**
- None.

**4.2 Signals Consumed (Subscriber)**
- `blocks.emergency_block_activated`: (Optional) Can trigger an automatic lock of the nearest crew via `lock_crew_for_block()`.

---

### 5. Background Tasks (Celery)

**File:** `departments/tasks.py`

- None defined for the MVP. In the future, inventory threshold alerts (e.g., "Copper wire low at HWH depot") could be scheduled here.

---

### 6. Dependencies

- **Upstream (Consumes from):** 
  - `accounts`: Uses `User` for the crew supervisor.
  - `assets`: Uses `Section` to map where the crew is based.
- **Downstream (Provides to):** 
  - `blocks`: The Blocks service queries `find_nearest_available_crew()` when a user requests an emergency block.
  - `notifications`: The Notifications service queries the Crew table to find the `contact_number` to send Twilio SMS alerts.
