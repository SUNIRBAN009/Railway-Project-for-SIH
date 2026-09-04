# 01-common-payloads-and-algorithms.md

> **File Sequence:** 35/45  
> **Previous Document:** [05-deep-dive-logs/00-readme.md](00-readme.md)  
> **Next Document:** [05-deep-dive-logs/02-error-code-registry.md](02-error-code-registry.md)  
> **Context:** Canonical shared Data Transfer Objects (DTOs), mathematical algorithms, spatial indexing geometry queries, and cryptographic primitives for Indian Railways Block Planning Platform (PS 26027).

---

# Shared Payloads, Cryptographic Primitives & Core Optimization Algorithms

---

## 1. Global API Response Envelopes

Every synchronous HTTP response returned by the platform must conform to one of two immutable standard JSON envelope structures. Ad-hoc raw dictionary responses are strictly prohibited.

### 1.1 Standard Success Envelope (`ApiResponse<T>`)
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "request_id": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "timestamp": "2026-09-04T12:00:00.123456Z",
    "execution_duration_ms": 14.8,
    "version": "v1"
  }
}
```

### 1.2 Standard Error Envelope (`ApiErrorResponse`)
```json
{
  "success": false,
  "error": {
    "code": "BLK-003",
    "message": "Block possession request conflicts with higher-priority passenger train schedule.",
    "service": "SVC-BLK",
    "retryable": false,
    "details": [
      {
        "field": "scheduled_start_time",
        "issue": "Overlaps with Train 12424 (NDLS-DBRG Rajdhani) between KM 142.500 and 146.200."
      }
    ],
    "help_url": "https://railway.sih.gov.in/docs/errors/BLK-003"
  },
  "metadata": {
    "request_id": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "timestamp": "2026-09-04T12:00:00.123456Z",
    "execution_duration_ms": 8.2,
    "version": "v1"
  }
}
```

### 1.3 Standard Paginated Collection Envelope (`PaginatedResponse<T>`)
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 25,
    "total_records": 142,
    "total_pages": 6,
    "has_next": true,
    "has_previous": false
  },
  "metadata": {
    "request_id": "req-88912389-1123-4123-8822-192837192837",
    "timestamp": "2026-09-04T12:00:00.123456Z"
  }
}
```

---

## 2. Core Optimization & Deconfliction Algorithms

### 2.1 Sweep-Line Interval Tree Conflict Algorithm

#### Problem Formulation
Given $N$ scheduled maintenance block intervals $[S_i, E_i]$ and $M$ train path corridor occupancy windows $[T_j, D_j]$ on a track corridor with spatial boundaries $[K_{\text{start}}, K_{\text{end}}]$, detect all pairwise temporal-spatial intersections in $O((N + M) \log(N + M))$ time.

#### Python Implementation (`apps.blocks.core.conflict_detector`)
```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Tuple
from intervaltree import Interval, IntervalTree

@dataclass
class TemporalEntity:
    entity_id: str
    entity_type: str  # 'BLOCK' or 'TRAIN'
    start_km: float
    end_km: float
    start_time: datetime
    end_time: datetime
    priority: int

class CorridorConflictEngine:
    """
    High-performance Interval Tree sweep engine for detecting overlapping
    track possession blocks and live train timetable paths.
    """
    def __init__(self):
        self.tree = IntervalTree()

    def load_entities(self, entities: List[TemporalEntity]):
        for e in entities:
            # Convert timestamps to epoch seconds for fast numeric interval tree evaluation
            t_start = e.start_time.timestamp()
            t_end = e.end_time.timestamp()
            if t_end <= t_start:
                continue
            self.tree.addi(t_start, t_end, e)

    def evaluate_conflicts(self, target: TemporalEntity) -> List[dict]:
        t_start = target.start_time.timestamp()
        t_end = target.end_time.timestamp()
        
        # Query overlapping intervals in O(log n + k)
        overlapping_intervals = self.tree.overlap(t_start, t_end)
        conflicts = []

        for iv in overlapping_intervals:
            candidate: TemporalEntity = iv.data
            if candidate.entity_id == target.entity_id:
                continue

            # Spatial boundary overlap test: max(start1, start2) < min(end1, end2)
            spatial_overlap = max(target.start_km, candidate.start_km) < min(target.end_km, candidate.end_km)
            
            if spatial_overlap:
                severity = self._classify_severity(target, candidate)
                conflicts.append({
                    "target_id": target.entity_id,
                    "conflicting_id": candidate.entity_id,
                    "conflict_type": f"{target.entity_type}_{candidate.entity_type}_COLLISION",
                    "severity": severity,
                    "overlap_start_km": max(target.start_km, candidate.start_km),
                    "overlap_end_km": min(target.end_km, candidate.end_km),
                    "overlap_duration_minutes": (min(target.end_time, candidate.end_time) - 
                                                max(target.start_time, candidate.start_time)).total_seconds() / 60.0
                })
        return conflicts

    def _classify_severity(self, a: TemporalEntity, b: TemporalEntity) -> str:
        if a.entity_type == 'TRAIN' or b.entity_type == 'TRAIN':
            # Rajdhani/Shatabdi rank 1
            if a.priority == 1 or b.priority == 1:
                return "CRITICAL"
            return "HIGH"
        return "MEDIUM"
```

---

### 2.2 MySQL 8.0 Spatial Corridor Indexing & Intersection

#### Spatial Geometry Formulation
- Track geometry is stored as a 2D Cartesian/Spherical LineString in **SRID 4326 (WGS 84)**.
- Corridor bounds are indexed using MySQL 8.0 `SPATIAL KEY`.
- A maintenance block's safety envelope is generated via a 50-meter buffer:

```sql
-- Query track segments that spatially intersect with a maintenance buffer
SELECT 
    c.id AS corridor_id,
    c.code AS corridor_code,
    ST_AsGeoJSON(c.track_geometry) AS geometry_geojson
FROM corridors c
WHERE ST_Intersects(
    c.track_geometry,
    ST_Buffer(
        ST_GeomFromText('LINESTRING(77.2167 28.6139, 80.3319 26.4499)', 4326),
        0.00045 -- Approx 50 meters buffer in degrees
    )
);
```

---

### 2.3 Train Delay Cascading & Propagation Calculation

$$\Delta T_{\text{total}} = \Delta T_{\text{initial}} + \sum_{i=1}^{P} \max\left(0, H_{\text{safety}} - \left(T_{i}^{\text{arr}} - T_{i-1}^{\text{arr}}\right)\right)$$

Where:
- $\Delta T_{\text{initial}}$ is the slowdown incurred by the primary train negotiating caution speed ($30\text{ km/h}$ instead of $130\text{ km/h}$).
- $H_{\text{safety}}$ is the minimum automatic signaling block headway ($5.0\text{ minutes}$).
- $P$ is the count of trailing passenger and freight trains traversing the identical block section.

---

## 3. Cryptographic Standards & Token Specifications

| Parameter | Standard / Value | Purpose |
|---|---|---|
| **JWT Signature** | RS256 (RSA 2048-bit with SHA-256) | Asymmetric token signing; public key distributed to microservices |
| **Access Token Lifetime** | 900 seconds (15 minutes) | Mitigates replay exposure |
| **Refresh Token Lifetime** | 604,800 seconds (7 days) | Persistent secure session with one-time rotation |
| **Password Hashing** | Argon2id (`time_cost=3`, `memory=65536KB`, `parallelism=2`) | Memory-hard defense against brute force and rainbow tables |
| **Data Encryption at Rest** | AES-256-GCM | MySQL InnoDB Tablespace Encryption |
| **Data in Transit** | TLS 1.3 (ECDHE-RSA-AES256-GCM-SHA384) | Transport layer protection |
