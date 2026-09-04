# 05-trains-function-map.md

> **File Sequence:** 30/45  
> **Service:** `SVC-TRN` (`apps.trains`)  
> **Previous Document:** [04-function-maps/04-ontology-function-map.md](04-ontology-function-map.md)  
> **Next Document:** [04-function-maps/06-assets-function-map.md](06-assets-function-map.md)  
> **Context:** Exhaustive function mapping, schemas, and algorithms for Train Operations & Timetable Punctuality.

---

## 1. Function Catalog

| Function ID | Function Name | HTTP Method | Path / Event | Input Schema | Output Schema | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-TRN-001` | Query Train Master Timetable | `GET` | `/api/v1/trains/` | Query Parameters | `PaginatedTrainsResponseDTO` | < 50ms |
| `FUNC-TRN-002` | Get Live Train Running Positions | `GET` | `/api/v1/trains/live/` | `?corridor=NDLS-CNB` | `LiveTrainPositionsCollectionDTO` | < 45ms |
| `FUNC-TRN-003` | Ingest COA Timetable Feed | Celery | `trains.tasks.ingest_coa_feed` | `{"feed_url": "..."}` | `IngestionSummaryDTO` | < 500ms |
| `FUNC-TRN-004` | Simulate Train Delay Cascade | `POST` | `/api/v1/trains/simulate-delay/` | `DelaySimulationRequestDTO` | `DelaySimulationResponseDTO` | < 110ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-TRN-004`: Simulate Train Delay Cascade
- **Controller Class:** `apps.trains.views.DelayCascadeSimulationView`
- **Permissions:** `IsAuthenticated`, `IsSectionController`
- **Input Schema (`DelaySimulationRequestDTO`):**
```json
{
  "block_id": "block-uuid-4412",
  "affected_train_ids": ["train-uuid-12424", "train-uuid-12004"],
  "imposed_speed_restriction_kmh": 30,
  "corridor_length_km": 3.700
}
```
- **Mathematical Delay Calculation:**
  1. Base Running Time at Normal Permissible Speed ($V_0 = 130\text{ km/h}$):
     $$T_0 = \frac{3.700}{130} \times 60 \approx 1.71 \text{ minutes}$$
  2. Imposed Running Time at Caution Speed ($V_{\text{caution}} = 30\text{ km/h}$):
     $$T_{\text{caution}} = \frac{3.700}{30} \times 60 = 7.40 \text{ minutes}$$
  3. Deceleration & Acceleration Lost Time Penalty ($T_{\text{acc\_dec}} = 3.0 \text{ minutes}$):
     $$\Delta T = (T_{\text{caution}} - T_0) + T_{\text{acc\_dec}} = (7.40 - 1.71) + 3.0 = 8.69 \text{ minutes}$$
  4. Subsequent Train Headway Buffering:
     - For each trailing train, calculate if arrival headway falls below minimum safe separation (5 minutes in automatic block signaling).
     - If violated, cascade delay: $D_{\text{trailing}} = D_{\text{lead}} - (\text{Headway}_{\text{actual}} - 5.0)$.
- **Output Schema (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "lead_train_delay_minutes": 8.7,
    "total_passenger_delay_minutes": 15.2,
    "total_freight_delay_minutes": 32.0,
    "punctuality_index_drop_percent": 1.2,
    "rerouting_recommendation": "Divert Freight Rake BCN-99 via Loop Line 2 at Khurja Junction."
  }
}
```
