# 01-common-payloads-and-algorithms.md

> **File Order:** 27/45  
> **Previous File:** `05-deep-dive-logs/00-readme.md`  
> **Next File:** `05-deep-dive-logs/02-error-code-registry.md`  

---

## 1. Common JSON Payloads

Standardized structures for API requests and responses to ensure frontend/backend consistency.

### 1.1 Standard API Response Wrapper
All successful `GET` list requests should be wrapped in pagination data.

```json
{
  "count": 142,
  "next": "https://api.../blocks/?page=3",
  "previous": "https://api.../blocks/?page=1",
  "results": [
    { ... }
  ]
}
```

### 1.2 Block Request Creation Payload (`POST /api/v1/blocks/`)

```json
{
  "section": "HWH-KGP",
  "from_km": 10.500,
  "to_km": 15.200,
  "start_time": "2026-09-02T14:00:00Z",
  "end_time": "2026-09-02T16:00:00Z",
  "work_description": "Overhead wire adjustment",
  "emergency_flag": false,
  "crew_id": "CREW-TRD-01" 
}
```

### 1.3 AI Resolution Response Payload

When the Gemini AI successfully analyzes a conflict, the Celery task writes this structure back to the database.

```json
{
  "conflict_id": "CFL-881",
  "recommended_action": "APPROVE_BLOCK_A",
  "explanation_en": "Block A (TRD) is critical maintenance that will prevent a line failure. Block B (ENG) is routine and can be rescheduled.",
  "explanation_hi": "...",
  "explanation_bn": "ব্লক A (TRD) অত্যন্ত গুরুত্বপূর্ণ রক্ষণাবেক্ষণ যা লাইনের ব্যর্থতা রোধ করবে। ব্লক B (ENG) রুটিন কাজ এবং এটি পরে করা যেতে পারে।",
  "suggested_reschedule_b": {
    "start_time": "2026-09-03T10:00:00Z",
    "end_time": "2026-09-03T12:00:00Z"
  }
}
```

---

## 2. Core Algorithms

### 2.1 Conflict Detection Algorithm (Time & Space Overlap)

Used in `blocks.services.ConflictEngine`. A conflict occurs if two requested blocks share the same `section` AND their times overlap AND their physical locations overlap.

**Logic:**
```python
def is_conflict(block_A, block_B):
    if block_A.section != block_B.section:
        return False
        
    # Time Overlap: A starts before B ends AND A ends after B starts
    time_overlap = (block_A.start_time < block_B.end_time) and (block_A.end_time > block_B.start_time)
    
    # Space Overlap: A starts before B ends AND A ends after B starts
    space_overlap = (block_A.from_km < block_B.to_km) and (block_A.to_km > block_B.from_km)
    
    return time_overlap and space_overlap
```

### 2.2 Nearest Crew Heuristic

Used in `departments.services.CrewAssignmentService` for emergency blocks.

**Logic:**
1. Exact Match: Is there an available crew of the required department stationed at the blocked `section`? If yes, assign.
2. Adjacency: If not, query the Ontology Graph for adjacent sections.
    - SPARQL: `SELECT ?adj WHERE { :HWH_KGP rly:isConnectedTo ?adj }`
3. Check adjacent sections for available crews.
4. If multiple, calculate distance: `ABS(crew.base_station.km_marker - emergency.from_km)`. Pick the lowest.
