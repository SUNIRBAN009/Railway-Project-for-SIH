# 02-error-code-registry.md

> **File Sequence:** 36/45  
> **Previous Document:** [05-deep-dive-logs/01-common-payloads-and-algorithms.md](01-common-payloads-and-algorithms.md)  
> **Next Document:** [05-deep-dive-logs/03-state-management.md](03-state-management.md)  
> **Context:** Master Enterprise Error Code Registry establishing 28 standardized, machine-readable error codes across all services of the Indian Railways AI Block Planning Platform (PS 26027).

---

# Master Error Code Registry

## 1. Error Code Format Specification

$$\mathbf{[SERVICE\_CODE]\text{-}[HTTP\_CATEGORY][INDEX]}$$

- **Service Prefix:** `AUTH`, `BLK`, `DEPT`, `ONTO`, `TRN`, `AST`, `ANA`, `NOTIF`, `SYS`
- **Category:** `4xx` (Client fault / validation / safety constraint), `5xx` (Internal server fault / dependency down)

---

## 2. Complete Enterprise Error Code Catalog

| Error Code | HTTP Status | Canonical Error Message | Service | Root Cause Condition | Client Recovery Action | Retryable? |
|---|:---:|---|:---:|---|---|:---:|
| `AUTH-001` | 401 | `Invalid credentials or inactive account.` | `SVC-AUTH` | Username not found or Argon2 hash mismatch. | Prompt user to verify employee ID and password. | No |
| `AUTH-002` | 401 | `Session expired or JWT token invalid.` | `SVC-AUTH` | RS256 signature invalid or token TTL elapsed. | Invoke `/api/v1/auth/refresh/` or prompt login. | No |
| `AUTH-003` | 403 | `Account temporarily locked due to excessive failed attempts.` | `SVC-AUTH` | 5 failed logins within 15 minutes. | Wait for lockout window (15m) or contact Admin. | No |
| `AUTH-004` | 401 | `Token reuse detected. All sessions revoked.` | `SVC-AUTH` | Blacklisted refresh token submitted again. | Full re-authentication required. | No |
| `AUTH-005` | 403 | `Insufficient role permissions for this operation.` | `SVC-AUTH` | User role lacks required RBAC scope. | Request role elevation from Chief Controller. | No |
| `BLK-001` | 400 | `Invalid corridor boundaries or negative block duration.` | `SVC-BLK` | `start_km >= end_km` or `start_time >= end_time`. | Correct milepost or timestamp inputs. | No |
| `BLK-002` | 400 | `Block duration exceeds maximum allowed limit of 8 hours.` | `SVC-BLK` | Requested window > 480 minutes. | Split into multiple sequential block requests. | No |
| `BLK-003` | 409 | `Critical train path collision detected.` | `SVC-BLK` | Block overlaps scheduled Rajdhani/Shatabdi corridor. | Reschedule block slot or request train diversion. | No |
| `BLK-004` | 409 | `Parallel track possession conflict on identical line.` | `SVC-BLK` | Overlaps existing sanctioned block without co-possession. | Merge into co-possession or select alternate window. | No |
| `BLK-005` | 412 | `Cannot sanction block with unresolved critical safety conflicts.` | `SVC-BLK` | `block_conflicts` table contains unresolved `CRITICAL` records. | Resolve or formally override all critical conflicts. | No |
| `BLK-006` | 409 | `Concurrent modification detected. Optimistic lock failed.` | `SVC-BLK` | Entity `version` altered by another controller. | Refresh record state from server and re-apply edit. | Yes |
| `BLK-007` | 400 | `Block cannot be activated prior to Caution Order issuance.` | `SVC-BLK` | Missing mandatory `caution_order_id`. | Verify Caution Order with Section Controller. | No |
| `DEPT-001` | 404 | `Maintenance gang unit not found or inactive.` | `SVC-DEPT` | `gang_id` does not exist or `is_active = 0`. | Verify gang number in departmental roster. | No |
| `DEPT-002` | 409 | `Assigned gang already allocated to overlapping active block.` | `SVC-DEPT` | Double-booking crew for the same shift. | Select an alternate gang stationed at depot. | No |
| `DEPT-003` | 400 | `Heavy machinery fitness certificate expired.` | `SVC-DEPT` | `fitness_expiry_date < TODAY`. | Dispatch machine for POH overhaul and select other unit. | No |
| `DEPT-004` | 412 | `Cannot clear block: missing departmental safety sign-offs.` | `SVC-DEPT` | Outstanding uncleared work orders. | Obtain digital sign-off from all Site Supervisors. | No |
| `ONTO-001` | 422 | `HermiT reasoner inferred safety hazard: Stranded electric train.` | `SVC-ONTO` | Catenary power cutoff isolates active electric train. | Adjust OHE switching sector or provide diesel banker. | No |
| `ONTO-002` | 422 | `Interlocking dead-end route locking violation.` | `SVC-ONTO` | Turnout point clamp blocks signaling safety flank. | Re-route crossover point settings. | No |
| `ONTO-003` | 504 | `Semantic reasoner execution timed out.` | `SVC-ONTO` | HermiT DL tableau saturation (> 10,000ms). | Simplify graph query bounds or retry asynchronously. | Yes |
| `TRN-001` | 404 | `Train number not found in master timetable.` | `SVC-TRN` | Train number does not exist in `trains` table. | Ingest updated timetable from COA. | No |
| `TRN-002` | 502 | `COA external timetable feed gateway unreachable.` | `SVC-TRN` | Timeout connecting to Indian Railways COA API. | Celery worker will retry with exponential backoff. | Yes |
| `TRN-003` | 400 | `Invalid delay simulation parameters.` | `SVC-TRN` | Caution speed exceeds maximum permissible speed. | Ensure restriction speed $\le 130\text{ km/h}$. | No |
| `AST-001` | 404 | `Track asset tag not found.` | `SVC-AST` | Missing asset ID or invalid corridor milepost. | Check asset inventory GIS map. | No |
| `AST-002` | 400 | `Defect measurement exceeds physical sensor bounds.` | `SVC-AST` | Flaw depth $> 40\text{ mm}$ on 60kg rail profile. | Recalibrate USFD sensor reading. | No |
| `ANA-001` | 400 | `Invalid date range for analytics query.` | `SVC-ANA` | `start_date > end_date` or window $> 365\text{ days}$. | Select date range within 12 months. | No |
| `NOTIF-001`| 503 | `SMS carrier gateway failure.` | `SVC-NOTIF` | Indian Railways CDAC SMS provider 5xx response. | Message enqueued to dead-letter queue for retry. | Yes |
| `SYS-001` | 500 | `Database transaction deadlock encountered.` | `Platform` | InnoDB lock contention during concurrent block writes. | Backend automatically retries transaction (max 3). | Yes |
| `SYS-002` | 429 | `Rate limit exceeded.` | `Platform` | Client exceeded API tier quota (100 req/min). | Throttle client calls; inspect `Retry-After` header. | Yes |
