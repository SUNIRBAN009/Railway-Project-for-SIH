# 06-assets-service.md

> **File Order:** 22/45  
> **Previous File:** `03-service-blueprints/05-departments-service.md`  
> **Next File:** `03-service-blueprints/07-analytics-service.md`  

---

### Assets Service Blueprint

**Service ID:** `SVC-06`  
**App Name:** `assets`  
**Primary Domain:** Physical Infrastructure and GIS mapping  
**Owner:** Backend Team  

---

### 1. Domain Models (Database Schema)

This service holds the physical topology of the railway network. It is the single source of truth for distances (KMs), stations, and line geography.

```python
from django.db import models

class Section(models.Model):
    code = models.CharField(max_length=10, primary_key=True) # e.g., HWH-KGP
    name = models.CharField(max_length=100)
    total_length_km = models.DecimalField(max_digits=7, decimal_places=3)
    
    # GeoJSON representation of the track line for Mapbox rendering
    geojson_path = models.JSONField(null=True, blank=True) 

    def __str__(self):
        return f"{self.code} ({self.name})"

class Station(models.Model):
    code = models.CharField(max_length=10, primary_key=True) # e.g., HWH
    name = models.CharField(max_length=100)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='stations')
    km_marker = models.DecimalField(max_digits=7, decimal_places=3)
    
    # Coordinates for Mapbox marker
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

class Component(models.Model):
    """Specific track, signal, or OHE components."""
    id = models.CharField(max_length=50, primary_key=True) # e.g., SIG-HWH-001
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    department = models.CharField(max_length=3) # ENG, SNT, TRD
    component_type = models.CharField(max_length=50) # Point, Relay, OHE Mast
    location_km = models.DecimalField(max_digits=7, decimal_places=3)
```

---

### 2. API Endpoints (DRF ViewSets)

| Method | Endpoint | Description | Auth/Role | Request Payload |
|--------|----------|-------------|-----------|-----------------|
| `GET`  | `/api/v1/assets/sections/` | Lists all track sections. | Auth (All) | None |
| `GET`  | `/api/v1/assets/sections/<id>/stations/` | Lists stations on a section ordered by KM. | Auth (All) | None |
| `GET`  | `/api/v1/assets/components/` | Lists specific hardware components (Signals/OHE). | Auth (All) | `?section=...&dept=...` |

---

### 3. Service Layer (Business Logic)

**File:** `assets/services.py`

```python
from .models import Section, Station

class AssetService:
    def get_section(self, section_code):
        """Retrieves a section by its code."""
        return Section.objects.filter(code=section_code).first()
        
    def validate_km_range(self, section_code, from_km, to_km):
        """Ensures the requested KM markers fall within the section's actual length."""
        section = self.get_section(section_code)
        if not section:
            return False, "Section does not exist."
            
        if from_km < 0 or to_km > section.total_length_km:
            return False, f"Invalid range. Section length is 0 to {section.total_length_km} KM."
            
        if from_km >= to_km:
            return False, "from_km must be less than to_km."
            
        return True, "Valid"

    def get_stations_in_range(self, section_code, from_km, to_km):
        """Finds all stations physically located within a blocked KM range."""
        return Station.objects.filter(
            section_id=section_code,
            km_marker__gte=from_km,
            km_marker__lte=to_km
        )
```

---

### 4. Internal Events (Pub/Sub)

**4.1 Signals Emitted (Publisher)**
- `asset_status_changed`: (Future Scope) Emitted if a component fails or is added, to update the Ontology graph.

**4.2 Signals Consumed (Subscriber)**
- None.

---

### 5. Background Tasks (Celery)

- None. Asset data is primarily static master data loaded during deployment.

---

### 6. Dependencies

- **Upstream (Consumes from):** 
  - None. This is a root dependency.
- **Downstream (Provides to):** 
  - `blocks`: Calls `validate_km_range()` synchronously before creating a block request.
  - `departments`: Uses `Section` to assign Crew base locations.
  - `trains`: Uses `Section` to map train routes.
  - `ontology`: The Ontology Service syncs the `Section` and `Component` tables into the semantic graph to build the base Digital Twin.
