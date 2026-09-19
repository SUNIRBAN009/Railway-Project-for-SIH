# 02-error-code-registry.md

> **ফাইল ক্রম:** ৩৬/৪৫  
> **ডিরেক্টরি:** `05-deep-dive-logs/`  
> **সার্ভিস স্কোপ:** Platform-Wide Standardized Error Taxonomy & Client Recovery Protocols  
> **পূর্ববর্তী ফাইল:** [05-deep-dive-logs/01-common-payloads-and-algorithms.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/01-common-payloads-and-algorithms.md) (Shared Payloads & Core Algorithms)  
> **পরবর্তী ফাইল:** [05-deep-dive-logs/03-state-management.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/03-state-management.md) (State Management & WebSocket Invalidation)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ৮টি মাইক্রোসার্ভিস, PostGIS জিওস্প্যাশিয়াল ইঞ্জিন, এবং সেফটি স্যুইটের জন্য ৩৫+ স্ট্যান্ডার্ডাইজড, মেশিন-রিডেবল রেলওয়ে এরর কোড, রুট-কজ শর্তাবলী এবং ক্লায়েন্ট রিকভারি অ্যাকশন বিস্তারিতভাবে লিপিবদ্ধ করা হয়েছে।

---

# Master Enterprise Railway Error Code Registry (রেলওয়ে কেন্দ্রীয় এরর কোড রেজিস্ট্রি)

## 1. Error Code Format Specification (কোড ফরম্যাট স্পেসিফিকেশন)

প্ল্যাটফর্মের সমস্ত ব্যতিক্রম ও ব্যর্থতা নিচে প্রদর্শিত স্ট্যান্ডার্ড ফরম্যাট মেনে তৈরি হয়:

$$\mathbf{[SERVICE\_CODE]\text{-}[INDEX]}$$

- **Service Prefixes:**
  - `AUTH`: Identity, Authentication & Role-Based Access Control (`SVC-AUTH`)
  - `BLK`: Block Planning, Deconfliction & Possession Lifecycle (`SVC-BLK`)
  - `DEPT`: Department Coordination, Material Slots & Machine Allocation (`SVC-DEPT`)
  - `ONTO`: Railway Digital Twin, Semantic Knowledge Graph & OWL Reasoning (`SVC-ONTO`)
  - `TRN`: Master Timetable, Live Tracking & Delay Cascading (`SVC-TRN`)
  - `AST`: TMS/SMMS/TDMS Integration, Unified Registry & Criticality (`SVC-AST`)
  - `ANL`: Asset Availability Scoring, What-If & Variance Analysis (`SVC-ANL`)
  - `NOTIF`: Emergency SOS, Siren Broadcast & Push Notifications (`SVC-NOTIF`)
  - `GIS`: PostGIS Spatial Queries, Buffer Geometries & Projection (`Platform Core`)
  - `SYS`: PostgreSQL Database Transactions, Cache & Infrastructure (`Platform Core`)

---

## 2. Complete Enterprise Error Code Catalog (৩৫+ প্রমিত এরর কোড তালিকা)

| Error Code | HTTP Status | Canonical Error Message | Service | Root Cause Condition | Client Recovery Action | Retryable? | IR Operational Impact |
|---|:---:|---|:---:|---|---|:---:|---|
| **`AUTH-001`** | 401 | `Invalid credentials or inactive employee account.` | `SVC-AUTH` | Employee ID not found or Argon2id password hash mismatch. | Verify HRMS Employee ID and password. | No | Login blocked |
| **`AUTH-002`** | 401 | `Session expired or JWT token signature invalid.` | `SVC-AUTH` | RS256 token TTL (15m) expired or cryptographic tampering. | Silent refresh via `/api/v1/auth/refresh/` or redirect to login. | No | API request rejected |
| **`AUTH-003`** | 403 | `Account temporarily locked due to excessive failed logins.` | `SVC-AUTH` | 5 consecutive failed login attempts within 15 minutes. | Wait 15 minutes for lockout expiry or contact Divisional Admin. | No | Security lockout |
| **`AUTH-004`** | 401 | `Token reuse detected. All sessions revoked.` | `SVC-AUTH` | Revoked/blacklisted refresh token resubmitted. | Force re-authentication on all client devices. | No | Session terminated |
| **`AUTH-005`** | 403 | `Insufficient role permissions for this operation.` | `SVC-AUTH` | User role lacks required RBAC permission scope. | Request role elevation from Chief Controller (DOM/Sr.DOM). | No | Action unauthorized |
| **`AUTH-006`** | 403 | `Unauthorized quick-switch section delegation.` | `SVC-AUTH` | Target station/section outside authorized territorial jurisdiction. | Request temporary section delegation approval from DOM. | No | Jurisdiction violation |
| **`BLK-001`** | 400 | `Invalid corridor boundaries or negative block duration.` | `SVC-BLK` | `start_km >= end_km` or `start_time >= end_time`. | Correct milepost chainage numbers or timestamp inputs. | No | Request rejected |
| **`BLK-002`** | 400 | `Block duration exceeds maximum allowed limit of 8 hours.` | `SVC-BLK` | Requested window > 480 minutes without GM special sanction. | Split into multiple sequential shadow block requests. | No | Safety policy limit |
| **`BLK-003`** | 409 | `Critical train path collision detected.` | `SVC-BLK` | Block overlaps scheduled Rajdhani/Shatabdi corridor path. | Reschedule block slot or request train diversion from Sr.DOM. | No | High-priority clash |
| **`BLK-004`** | 409 | `Parallel track possession conflict on identical line.` | `SVC-BLK` | Overlaps existing sanctioned block without co-possession consent. | Merge into joint departmental co-possession or choose alternate window. | No | Track double-booking |
| **`BLK-005`** | 412 | `Cannot sanction block with unresolved critical safety conflicts.` | `SVC-BLK` | Unresolved `CRITICAL` records in conflict table. | Resolve or formally override all critical safety flags. | No | Sanction blocked |
| **`BLK-006`** | 409 | `Concurrent modification detected. Optimistic lock failed.` | `SVC-BLK` | PostgreSQL record `version` incremented by another controller. | Refetch block record from server and re-apply modification. | Yes | UI concurrency conflict |
| **`BLK-007`** | 400 | `Block cannot be activated prior to Caution Order issuance.` | `SVC-BLK` | Missing mandatory `caution_order_id` for TSR imposed section. | Generate and confirm Caution Order with Section Controller. | No | Safety regulation halt |
| **`BLK-008`** | 412 | `Mandatory safety checklist incomplete.` | `SVC-BLK` | Missing Tool Count (#81), Geo-tag Photo (#82), TBT (#83) or PTW (#84). | Complete all pre-work safety attestations in mobile UI. | No | Block activation halted |
| **`BLK-009`** | 412 | `Adverse weather conditions violate safety threshold.` | `SVC-BLK` | Wind speed > 60 km/h or waterlogging depth > 100mm (Feature #75). | Await weather clearance or request Emergency GM Waiver. | Yes | Environmental safety hold |
| **`BLK-010`** | 412 | `OHE traction power isolation unconfirmed.` | `SVC-BLK` | Missing LOTO verification handshake from TPC (Feature #74). | Traction Power Controller must confirm power block de-energization. | No | Electrocution hazard |
| **`BLK-011`** | 400 | `Digital safety token invalid or cryptographic mismatch.` | `SVC-BLK` | HMAC-SHA256 token mismatch between Station Master and Supervisor. | Re-generate dynamic digital token via mobile app. | No | Unauthorized possession |
| **`BLK-012`** | 400 | `Block overstay detected without extension request.` | `SVC-BLK` | Current time > Sanctioned end time + 15m grace (Feature #77). | Apply for emergency block extension or trigger immediate clearance. | No | Section overstay alarm |
| **`DEPT-001`** | 404 | `Maintenance gang unit not found or inactive.` | `SVC-DEPT` | `gang_id` does not exist or marked `is_active = FALSE`. | Verify gang number in divisional departmental roster. | No | Allocation failed |
| **`DEPT-002`** | 409 | `Assigned gang already allocated to overlapping active block.` | `SVC-DEPT` | Double-booking maintenance crew for the same duty shift. | Select alternate gang stationed at the nearest permanent-way depot. | No | Resource contention |
| **`DEPT-003`** | 400 | `Heavy machinery fitness certificate expired.` | `SVC-DEPT` | BCM/TTM/CSM track machine `fitness_expiry_date < TODAY`. | Dispatch machine for POH/ROH maintenance; allocate certified unit. | No | Machine safety violation |
| **`DEPT-004`** | 412 | `Cannot clear block: missing departmental safety sign-offs.` | `SVC-DEPT` | Outstanding uncleared work orders across Engg/S&T/TRD. | Obtain digital sign-off from all Site Supervisors in mobile app. | No | Clearance blocked |
| **`DEPT-005`** | 409 | `Material rake slot conflict at loading siding.` | `SVC-DEPT` | Ballast train or rail-carrying rake siding slot overlap (#101). | Adjust rake dispatch timing in Material Coordination Matrix. | No | Siding congestion |
| **`ONTO-001`** | 422 | `HermiT reasoner inferred safety hazard: Stranded electric train.` | `SVC-ONTO` | Catenary power cutoff isolates active passenger electric train. | Adjust OHE switching sector or provide diesel banker locomotive. | No | DL safety violation |
| **`ONTO-002`** | 422 | `Interlocking dead-end route locking violation.` | `SVC-ONTO` | Turnout point clamp blocks signaling safety flank protection. | Re-route crossover point settings to ensure overlap clearance. | No | Interlocking violation |
| **`ONTO-003`** | 504 | `Semantic reasoner execution timed out.` | `SVC-ONTO` | HermiT DL tableau saturation (> 15,000ms). | Simplify graph query bounds or execute asynchronously in Celery queue. | Yes | Computation timeout |
| **`TRN-001`** | 404 | `Train number not found in master timetable.` | `SVC-TRN` | Train number does not exist in master timetable registry (#114). | Trigger timetable ingestion sync from COA/FOIS. | No | Missing timetable data |
| **`TRN-002`** | 502 | `COA external timetable feed gateway unreachable.` | `SVC-TRN` | Connection timeout to Indian Railways COA REST/SOAP endpoint. | Celery worker will retry with exponential backoff (max 5 retries). | Yes | Live sync delay |
| **`TRN-003`** | 400 | `Invalid delay simulation parameters.` | `SVC-TRN` | Restriction speed exceeds line's Maximum Permissible Speed (MPS). | Ensure caution speed $\le 130\text{ km/h}$ and valid station sequence. | No | Simulation error |
| **`AST-001`** | 404 | `Track asset record not found in unified registry.` | `SVC-AST` | Missing asset ID or invalid corridor chainage (#86). | Verify asset tag against PostGIS GIS layer. | No | Asset lookup failed |
| **`AST-002`** | 400 | `Defect measurement exceeds physical sensor bounds.` | `SVC-AST` | Flaw depth $> 40\text{ mm}$ on 60kg rail profile or invalid sensor data. | Recalibrate USFD sensor reading and re-upload raw trace. | No | Data corruption |
| **`AST-003`** | 424 | `Stale departmental data feed detected.` | `SVC-AST` | Last sync timestamp for TMS/SMMS/TDMS feed > 24 hours (#89). | Re-trigger manual ETL import or check division SFTP gateway. | Yes | Stale data warning |
| **`AST-004`** | 400 | `Unparsable chainage format string.` | `SVC-AST` | String does not match telegraph post or metric chainage regex (#87). | Format chainage as `KM 142/5` or `142.500`. | No | Parsing syntax error |
| **`ANL-001`** | 400 | `Invalid date range for analytics aggregation.` | `SVC-ANL` | `start_date > end_date` or aggregation window $> 365\text{ days}$. | Select an aggregation window within 12 consecutive months. | No | Analytics bounds error |
| **`ANL-002`** | 404 | `Block variance completion log missing.` | `SVC-ANL` | Block marked completed but missing actual start/end timestamps (#109).| Submit actual field timestamps before calculating variance report. | No | Incomplete log |
| **`NOTIF-001`**| 503 | `Emergency SMS carrier gateway unreachable.` | `SVC-NOTIF`| Indian Railways CDAC SMS gateway returned 5xx / timeout. | Message enqueued to dead-letter queue; app push fallback active. | Yes | SMS dispatch fallback |
| **`NOTIF-002`**| 504 | `Real-time siren broadcast channel timeout.` | `SVC-NOTIF`| Daphne ASGI WebSocket delivery failed to deliver in 500ms (#79). | Automated SMS and fallback push dispatched immediately. | Yes | Siren failover |
| **`NOTIF-003`**| 410 | `Lone worker dead-man check-in expired.` | `SVC-NOTIF`| Trackman heartbeat ping missed (> 15 minutes overdue) (#78). | Immediate control room alert generated; dispatch patrol team. | No | Worker safety alarm |
| **`GIS-001`** | 400 | `Invalid spatial coordinate or unsupported SRID.` | `Platform` | Coordinates outside India bounding box or SRID $\ne 4326$. | Provide valid latitude/longitude within WGS 84 (`EPSG:4326`). | No | Spatial query rejected |
| **`SYS-001`** | 500 | `PostgreSQL transaction deadlock encountered.` | `Platform` | Concurrent block update row locks (`40P01 deadlocks`). | Backend middleware automatically retries transaction (max 3 retries). | Yes | Database retry |
| **`SYS-002`** | 429 | `Rate limit quota exceeded.` | `Platform` | Client exceeded API rate limit (120 requests/minute). | Throttle client requests; inspect `Retry-After` header. | Yes | API throttling |

---

## 3. Machine-Readable Error Response Examples (মেশিন-রিডেবল উদাহারণ)

### ৩.১ লাইফ-সেফটি ওএইচই পাওয়ার আইসোলেশন এরর (`BLK-010`)
```json
{
  "success": false,
  "error": {
    "code": "BLK-010",
    "message": "Cannot activate block: OHE traction power isolation unconfirmed by Traction Power Controller (TPC).",
    "service": "SVC-BLK",
    "retryable": false,
    "details": [
      {
        "field": "ohe_power_status",
        "issue": "Substation TSS-GZB-02 switch breaker #412 is currently ENERGIZED (25kV AC active).",
        "required_action": "Execute digital LOTO handshake with TPC before entry."
      }
    ],
    "help_url": "https://railblock.ir.gov.in/docs/errors/BLK-010"
  },
  "metadata": {
    "request_id": "req-c1a789ef-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "timestamp": "2026-09-18T21:35:00.123456Z",
    "execution_duration_ms": 6.8,
    "version": "v1"
  }
}
```

### ৩.২ পোস্টগ্রিসকিউএল ট্রানজাকশন ডেডলক এরর (`SYS-001`)
```json
{
  "success": false,
  "error": {
    "code": "SYS-001",
    "message": "PostgreSQL transaction deadlock encountered during concurrent block allocation lock.",
    "service": "Platform",
    "retryable": true,
    "details": [
      {
        "sqlstate": "40P01",
        "lock_target": "railway_corridors_row_7f8e",
        "attempt": 1,
        "max_retries": 3
      }
    ],
    "help_url": "https://railblock.ir.gov.in/docs/errors/SYS-001"
  },
  "metadata": {
    "request_id": "req-d2b890af-4c8e-5cbe-0cee-3c1e8c4edc7e",
    "timestamp": "2026-09-18T21:35:00.234567Z",
    "execution_duration_ms": 42.1,
    "version": "v1"
  }
}
```

---

## 4. Frontend Client Error Handling Matrix (ফ্রন্টএন্ড ক্লায়েন্ট হ্যান্ডলিং)

| রেঞ্জ | ক্যাটাগরি | ইউজার ইন্টারফেস অ্যাকশন | টোস্ট/মডাল আচরণ |
|---|---|---|---|
| `AUTH-*` | অথেনটিকেশন ও পারমিশন | অটোমেটিক সাইলেন্ট টোকেন রিফ্রেশ; ব্যর্থ হলে লগইন মডালে রিডাইরেক্ট | `AlertToast (Severity: Error)` |
| `BLK-003, BLK-004` | টাইম-স্পেস ট্র্যাফিক কনফ্লিক্ট | কনফ্লিক্ট হাইলাইটার ভিউ ওপেন এবং অল্টারনেট উইন্ডো রিকমেন্ডেশন | `ConflictResolutionModal` |
| `BLK-008..011` | লাইফ-সেফটি ও ফিল্ড ভ্যালিডেশন | লাল সতর্কতা ব্যানার ও অ্যাকশন রিকয়ার্ড চেকলিস্ট | `SafetyLockoutBanner (Audio Warning)` |
| `SYS-001, TRN-002` | সাময়িক সার্ভার / নেটওয়ার্ক ইস্যু | ব্যাকঅফ রিট্রাই প্রম্পট এবং কানেকশন স্টেটাস চিপ শো করা | `RetryToast (Auto-dismissing)` |
| `GIS-*` | জিওমেট্রি ও ম্যাপ এরর | ম্যাপ লেয়ার রিলোড এবং চেইনেজ ভ্যালিডেশন ইঙ্গিত | `MapCoordinateWarning` |
