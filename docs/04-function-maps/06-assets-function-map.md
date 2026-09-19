# 06-assets-function-map.md

> **File Sequence:** 31/45  
> **Service:** `SVC-AST` (`apps.assets`)  
> **Previous Document:** [04-function-maps/05-trains-function-map.md](05-trains-function-map.md)  
> **Next Document:** [04-function-maps/07-analytics-function-map.md](07-analytics-function-map.md)  
> **Context:** Exhaustive function mapping, schemas, and degradation algorithms for Track & Asset Monitoring.

---

## 1. Function Catalog

| Function ID | Function Name | HTTP Method | Path / Event | Input Schema | Output Schema | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-AST-001` | Query Asset Inventory & Health | `GET` | `/api/v1/assets/` | Query Parameters | `PaginatedAssetsResponseDTO` | < 60ms |
| `FUNC-AST-002` | Register Defect & Flaw Reading | `POST` | `/api/v1/assets/defects/` | `DefectRegistrationDTO` | `DefectDetailDTO` | < 80ms |
| `FUNC-AST-003` | Get Predictive Block Recommendations | `GET` | `/api/v1/assets/maintenance-recommendations/` | Query Parameters | `BlockRecommendationsDTO` | < 75ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-AST-002`: Register Defect & Flaw Reading
- **Controller Class:** `apps.assets.views.AssetDefectCreateView`
- **Permissions:** `IsAuthenticated`, `IsDepartmentalEngineer`
- **Input Schema (`DefectRegistrationDTO`):**
```json
{
  "asset_id": "asset-uuid-rail-091",
  "defect_type": "INTERNAL_RAIL_FRACTURE",
  "severity": "CRITICAL_IMMEDIATE_STOP",
  "detected_by_source": "USFD_TESTING_CAR_02",
  "flaw_depth_mm": 18.5,
  "recommended_speed_restriction_kmh": 30,
  "block_recommended": true
}
```
- **Processing Logic:**
  1. Insert defect record into `asset_defect_logs`.
  2. Compute new Asset Health Score:
     $$\text{health\_score}_{\text{new}} = \max(0.0, \text{health\_score}_{\text{current}} - \Delta_{\text{penalty}})$$
     For `CRITICAL_IMMEDIATE_STOP`, $\Delta_{\text{penalty}} = 70.0$, driving score below 30.0.
  3. Update `track_assets.current_health_score = :health_score_new`.
  4. If `severity == 'CRITICAL_IMMEDIATE_STOP'`:
     - Dispatch urgent event `assets.critical_defect.detected` to Redis.
     - Automatically create draft Emergency Block Proposal via internal interface to `SVC-BLK`.
- **Output:** HTTP 201 Created with `DefectDetailDTO`.
