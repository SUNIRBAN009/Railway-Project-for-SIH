# 07-analytics-function-map.md

> **File Sequence:** 32/45  
> **Service:** `SVC-ANA` (`apps.analytics`)  
> **Previous Document:** [04-function-maps/06-assets-function-map.md](06-assets-function-map.md)  
> **Next Document:** [04-function-maps/08-notifications-function-map.md](08-notifications-function-map.md)  
> **Context:** Exhaustive function mapping, schemas, and OLAP rollup jobs for Operations Analytics & KPIs.

---

## 1. Function Catalog

| Function ID | Function Name | HTTP Method | Path / Event | Input Schema | Output Schema | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-ANA-001` | Fetch Corridor Operations Dashboard | `GET` | `/api/v1/analytics/dashboard/summary/` | Query Parameters | `DashboardKPIsResponseDTO` | < 80ms |
| `FUNC-ANA-002` | Execute Nightly Corridor Rollup Mart | Celery Beat | `analytics.tasks.daily_rollup` | Scheduled (01:00 UTC) | `RollupExecutionSummaryDTO` | < 15000ms |
| `FUNC-ANA-003` | Generate PDF/Excel Executive Export | `GET` | `/api/v1/analytics/reports/export/` | `?type=MONTHLY_PDF` | `ReportExportResponseDTO` | < 250ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-ANA-001`: Fetch Corridor Operations Dashboard
- **Controller Class:** `apps.analytics.views.DashboardSummaryView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `division` (default `'DLI'`), `time_window` (options: `'24h'`, `'7d'`, `'30d'`).
- **Processing Logic:**
  1. Construct Redis cache key: `analytics:dash:{division}:{time_window}`.
  2. If cached in Redis, return JSON immediately (sub-10ms response).
  3. If cache miss, execute SQL aggregation over `corridor_daily_kpis`:
     ```sql
     SELECT 
       SUM(total_blocks_sanctioned) AS blocks_sanctioned,
       SUM(total_blocks_executed) AS blocks_executed,
       ROUND(AVG(corridor_punctuality_percentage), 2) AS avg_punctuality,
       SUM(co_possession_blocks_count) AS co_possessions,
       SUM(total_sanctioned_duration_minutes) AS total_sanctioned_min,
       SUM(total_actual_duration_minutes) AS total_actual_min
     FROM corridor_daily_kpis
     WHERE division_code = :division
       AND metric_date >= DATE_SUB(CURRENT_DATE(), INTERVAL :days DAY);
     ```
  4. Compute Track Possession Utilization Ratio:
     $$U = \frac{\sum T_{\text{actual}}}{\sum T_{\text{sanctioned}}} \times 100\%$$
  5. Cache result in Redis for 900 seconds (15 minutes).
- **Output Schema (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "division": "DLI",
    "utilization_percentage": 91.4,
    "corridor_punctuality_percentage": 94.8,
    "co_possession_efficiency_ratio": 34.2,
    "total_blocks_executed": 48,
    "hours_saved_by_co_possession": 62.5
  }
}
```
