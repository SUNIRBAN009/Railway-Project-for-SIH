# 04-trains-service.md

> **File Order:** 20/45  
> **Previous File:** `03-service-blueprints/03-ontology-service.md`  
> **Next File:** `03-service-blueprints/05-departments-service.md`  

---

### Trains Service Blueprint

**Service ID:** `SVC-04`  
**App Name:** `trains`  
**Primary Domain:** Train Schedules, Routing, and Delay Calculation  
**Owner:** Backend Team  

---

### 1. Domain Models (Database Schema)

This service manages train master data and schedule instances. 

```python
from django.db import models

class TrainType(models.TextChoices):
    EXPRESS = 'EXPRESS', 'Express/Mail'
    RAJDHANI = 'RAJDHANI', 'Rajdhani/Shatabdi'
    LOCAL = 'LOCAL', 'EMU/Local'
    GOODS = 'GOODS', 'Freight/Goods'

class Train(models.Model):
    train_number = models.CharField(max_length=6, primary_key=True)
    name = models.CharField(max_length=100)
    train_type = models.CharField(max_length=15, choices=TrainType.choices)
    priority = models.IntegerField(default=1) # 1=Normal, 5=High(Rajdhani)
    
    is_active = models.BooleanField(default=True)

class Schedule(models.Model):
    train = models.ForeignKey(Train, on_delete=models.CASCADE, related_name='schedules')
    section = models.ForeignKey('assets.Section', on_delete=models.PROTECT)
    
    # Expected timing on this section
    arrival_time = models.TimeField()
    departure_time = models.TimeField()
    day_of_run = models.IntegerField(default=1) # 1=Day 1, 2=Day 2 etc.
    
    class Meta:
        indexes = [
            models.Index(fields=['section', 'arrival_time', 'departure_time']),
        ]
```

---

### 2. API Endpoints (DRF ViewSets)

| Method | Endpoint | Description | Auth/Role | Request Payload |
|--------|----------|-------------|-----------|-----------------|
| `GET`  | `/api/v1/trains/` | Lists trains with filtering (by type/section). | Auth (All) | None |
| `GET`  | `/api/v1/trains/<id>/schedule/` | Returns the route and schedule of a train. | Auth (All) | None |
| `POST` | `/api/v1/trains/impact/` | Calculates expected delay if a section is blocked. | COA only | `{"section": "...", "start_time": "...", "end_time": "..."}` |

---

### 3. Service Layer (Business Logic)

**File:** `trains/services.py`

```python
from datetime import datetime
from .models import Schedule

class TrainImpactService:
    def calculate_impact(self, section_code, block_start_time, block_end_time):
        """
        Finds all trains scheduled to pass through the section during the block time.
        Calculates total delay minutes.
        """
        start_time_only = block_start_time.time()
        end_time_only = block_end_time.time()
        
        # Simple overlap logic for same-day runs (cross-midnight logic omitted for brevity)
        affected_schedules = Schedule.objects.filter(
            section_id=section_code,
            arrival_time__lt=end_time_only,
            departure_time__gt=start_time_only
        ).select_related('train')
        
        total_delay_minutes = 0
        impacted_trains = []
        
        for schedule in affected_schedules:
            # Delay = (Block End Time) - (Scheduled Arrival Time)
            delay = (block_end_time - datetime.combine(block_end_time.date(), schedule.arrival_time)).total_seconds() / 60
            total_delay_minutes += delay
            impacted_trains.append({
                "train_number": schedule.train.train_number,
                "name": schedule.train.name,
                "expected_delay": int(delay),
                "priority": schedule.train.priority
            })
            
        return {
            "total_trains_affected": len(impacted_trains),
            "total_delay_minutes": total_delay_minutes,
            "trains": impacted_trains
        }
```

---

### 4. Internal Events (Pub/Sub)

**4.1 Signals Emitted (Publisher)**
- None.

**4.2 Signals Consumed (Subscriber)**
- None. The trains service acts primarily as a queryable data source for analytics and the ontology.

---

### 5. Background Tasks (Celery)

**File:** `trains/tasks.py`

- `sync_ntes_data_task`: (Future Scope) A scheduled task that pulls real-time train delay status from the NTES external API to update expected arrival times, rather than relying solely on the static `Schedule` timetable.

---

### 6. Dependencies

- **Upstream (Consumes from):** 
  - `assets`: `Schedule` relies on `Section` to map the route.
- **Downstream (Provides to):** 
  - `analytics`: Calls `TrainImpactService.calculate_impact()` synchronously to generate pre-block impact metrics.
  - `ontology`: Train entities are synced to the graph to allow HermiT to infer cascading delays.
