# 07-analytics-service.md

> **File Order:** 23/45  
> **Previous File:** `03-service-blueprints/06-assets-service.md`  
> **Next File:** `03-service-blueprints/08-notifications-service.md`  

---

### Analytics Service Blueprint

**Service ID:** `SVC-07`  
**App Name:** `analytics`  
**Primary Domain:** Impact Score Calculation, Reporting, and Dashboards  
**Owner:** Backend Team  

---

### 1. Domain Models (Database Schema)

This service does not manage operational data; instead, it stores aggregated daily metrics and historical reports.

```python
from django.db import models

class DailyReport(models.Model):
    date = models.DateField(primary_key=True)
    
    # Aggregated Metrics
    total_blocks_requested = models.IntegerField(default=0)
    total_blocks_approved = models.IntegerField(default=0)
    total_emergencies = models.IntegerField(default=0)
    
    # Impact Metrics (Calculated via Ontology/Trains)
    total_trains_delayed = models.IntegerField(default=0)
    cumulative_delay_minutes = models.IntegerField(default=0)
    
    # The generated PDF report for archival
    pdf_report = models.FileField(upload_to='reports/daily/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
```

---

### 2. API Endpoints (DRF ViewSets)

| Method | Endpoint | Description | Auth/Role | Request Payload |
|--------|----------|-------------|-----------|-----------------|
| `GET`  | `/api/v1/analytics/dashboard/` | Returns high-level KPIs for the COA dashboard (cached). | COA only | None |
| `GET`  | `/api/v1/analytics/impact/<block_id>/` | Calculates the specific impact score of a pending block. | COA only | None |
| `GET`  | `/api/v1/analytics/reports/` | Lists available daily PDF reports. | COA only | `?month=YYYY-MM` |

---

### 3. Service Layer (Business Logic)

**File:** `analytics/services.py`

```python
from ontology.manager import SPARQLExecutor
from trains.services import TrainImpactService

class ImpactCalculatorService:
    def __init__(self):
        self.sparql = SPARQLExecutor()
        self.train_service = TrainImpactService()

    def calculate_block_impact(self, block_instance):
        """
        Combines semantic ontology data with train schedules to generate a score.
        Score formula: (Trains Delayed * 10) + (Total Delay Mins * 2)
        """
        # 1. Use Ontology to find which trains are logically affected by this specific block
        affected_train_names = self.sparql.get_affected_trains(block_instance.id)
        
        # 2. Use Train Service to calculate the actual time delay
        impact_data = self.train_service.calculate_impact(
            block_instance.section.code,
            block_instance.start_time,
            block_instance.end_time
        )
        
        # 3. Calculate Score
        score = (impact_data['total_trains_affected'] * 10) + (impact_data['total_delay_minutes'] * 2)
        
        return {
            "impact_score": score,
            "trains_affected": impact_data['total_trains_affected'],
            "delay_minutes": impact_data['total_delay_minutes'],
            "semantic_explanation": f"Ontology identified {len(affected_train_names)} trains affected via property chains."
        }
```

---

### 4. Internal Events (Pub/Sub)

**4.1 Signals Emitted (Publisher)**
- None. 

**4.2 Signals Consumed (Subscriber)**
- None. (Analytics relies on Celery cron jobs to aggregate data, rather than reacting to every single event in real-time to save DB load).

---

### 5. Background Tasks (Celery)

**File:** `analytics/tasks.py`

- `generate_daily_report_task`: Runs daily at 6:00 AM (via Celery Beat). It queries the `blocks` and `trains` tables for the previous day, creates a `DailyReport` record, generates a PDF using `reportlab`, and saves it to the `pdf_report` field.

---

### 6. Dependencies

- **Upstream (Consumes from):** 
  - `ontology`: Calls `SPARQLExecutor` to get inferred relationships.
  - `trains`: Calls `TrainImpactService` to calculate time delays.
  - `blocks`: Queries `BlockRequest` table for daily aggregation.
- **Downstream (Provides to):** 
  - None. This is a terminal service intended for end-user reporting.
