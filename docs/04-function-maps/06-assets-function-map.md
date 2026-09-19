# 06-assets-function-map.md

> **ফাইল ক্রম:** ৩১/৪৫  
> **সার্ভিস আইডি:** `SVC-AST` (`apps.assets`)  
> **পূর্ববর্তী ফাইল:** [04-function-maps/05-trains-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/05-trains-function-map.md) (`SVC-TRN` Dedicated Function Map)  
> **পরবর্তী ফাইল:** [04-function-maps/07-analytics-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/07-analytics-function-map.md) (`SVC-ANL` Dedicated Function Map)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে রেলওয়ের ভৌত অবকাঠামো এবং ট্রিপল-ডিপার্টমেন্ট ডেটা ইনজেশন সার্ভিস **`SVC-AST` (Track Infrastructure, Catenary & Signaling Asset Telemetry & Health Monitoring Service)**-এর ৯টি ক্যানোনিকাল ফাংশনের ইনপুট/আউটপুট স্কিমা, ইউনিফাইড অ্যাসেট রেজিস্ট্রি (#86), চেইনেজ নরমালাইজেশন (#87), ফাইল ডাম্প ইনজেশন (#88), ডেটা ফ্রেশনেস মনিটর (#89), ডুপ্লিকেট ডিফেক্ট মার্জার (#90), এবং CoF × LoF রিস্ক ম্যাট্রিক্সের (#92) বিস্তারিত বাস্তবায়ন বিবরণ প্রদান করা হয়েছে।

---

## 1. Function Catalog (9 Core Functions)

| Function ID | Function Name | HTTP Method | Path / Trigger | Input DTO | Output DTO | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-AST-001` | Unified Asset Inventory & Chainage Filter | `GET` | `/api/v1/assets/` | Query Parameters | `PaginatedAssetsResponseDTO` | p95 < 55ms |
| `FUNC-AST-002` | Retrieve Specific Asset Detail & History | `GET` | `/api/v1/assets/{tag}/` | URL Parameter | `AssetFullDetailDTO` | p95 < 35ms |
| `FUNC-AST-003` | Register Defect & Exponential Aging Score | `POST` | `/api/v1/assets/defects/` | `DefectRegistrationDTO` | `DefectDetailDTO` | p95 < 75ms |
| `FUNC-AST-004` | File-Based CSV/XML Dump Ingestion | `POST` | `/api/v1/assets/defects/import-file/`| Multipart File Upload | `FileImportSummaryDTO` | p95 < 280ms|
| `FUNC-AST-005` | Chainage Normalization Engine | `POST` | `/api/v1/assets/normalize-chainage/` | `RawChainageInputDTO` | `NormalizedChainageResultDTO`| p95 < 25ms |
| `FUNC-AST-006` | Duplicate Defect Detection & Merging | `POST` | `/api/v1/assets/defects/merge/` | `DefectMergeRequestDTO` | `DefectMergeResultDTO` | p95 < 70ms |
| `FUNC-AST-007` | Four-Source Data Freshness Monitor | `GET` | `/api/v1/assets/freshness-status/` | None | `FreshnessStatusCollectionDTO`| p95 < 40ms |
| `FUNC-AST-008` | CoF × LoF Risk Matrix Priority Scoring | `GET` | `/api/v1/assets/risk-matrix/` | Query Parameters | `RiskMatrixHeatmapDTO` | p95 < 50ms |
| `FUNC-AST-009` | Predictive Maintenance Breakdown Forecast| `GET` | `/api/v1/assets/predictive-maintenance/`| Query Parameters | `PredictiveScheduleDTO` | p95 < 65ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-AST-001`: Unified Asset Inventory & Chainage Filter (Feature #86)
- **Controller Class:** `apps.assets.views.AssetInventoryListView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?corridor=HWH-BWN&category=TRACK_CIVIL&start_km=40.0&end_km=50.0`
- **Processing Logic:**
  1. `assets_trackasset` টেবিল থেকে লিনিয়ার চেইনেজ রেঞ্জ ও ক্যাটাগরি ফিল্টার।
  2. TMS, SMMS এবং TDMS ম্যাপিং আইডি (`tms_asset_id`, `smms_asset_id`, `tdms_asset_id`) সহ ইউনিফাইড অ্যাসেট তথ্য রিটার্ন।
- **Output (HTTP 200):** `PaginatedAssetsResponseDTO`।

---

### `FUNC-AST-002`: Retrieve Specific Asset Detail & History
- **Controller Class:** `apps.assets.views.AssetDetailView`
- **Permissions:** `IsAuthenticated`
- **URL Parameter:** `asset_tag` (e.g. `AST-HWH-BWN-DN-KM-45.200`)
- **Processing Logic:**
  1. অ্যাসেটের মেকানিক্যাল স্পেসিফিকেশন ও PostGIS স্পেশিয়াল লোকেশন ফেচ।
  2. বিগত ২ বছরের সকল ইউএসএফডি ইন্সপেকশন রেকর্ড এবং সমাধানকৃত ডিফেক্ট হিস্ট্রি একত্রিত করে রিটার্ন।
- **Output (HTTP 200):** `AssetFullDetailDTO`।

---

### `FUNC-AST-003`: Register Defect & Exponential Aging Score (Feature #45-47, #93)
- **Controller Class:** `apps.assets.views.AssetDefectCreateView`
- **Permissions:** `IsAuthenticated`, `IsDepartmentalEngineer`
- **Input Schema (`DefectRegistrationDTO`):**
```json
{
  "asset_id": "c80918fa-01aa-472b-a19f-b9816e26027a",
  "source_system": "TMS",
  "raw_chainage_string": "KM 45/2",
  "track_line_type": "DOWN",
  "defect_type": "INTERNAL_RAIL_FRACTURE",
  "severity": "CRITICAL",
  "detected_at": "2026-09-18T20:00:00Z",
  "flaw_depth_mm": 18.5,
  "imposed_tsr_speed_kmh": 30
}
```
- **Processing Logic:**
  1. `FUNC-AST-005` কল করে চেইনেজ স্ট্রিংকে নর্মালাইজড ডেসিমাল কিমিতে রূপান্তর (`45.200 KM`)।
  2. ওভারডিউ দিন সংখ্যা অনুযায়ী এক্সপোনেনশিয়াল এজিং স্কোর হিসাব (`Feature #93`):
     $$\text{Aging Score} = \text{Base Severity} \times e^{0.035 \times \min(\text{Overdue Days}, 60)}$$
  3. `assets_defect_log` টেবিলে রো ইনসার্ট।
  4. ক্রিটিক্যাল ডিফেক্ট হলে Redis ইভেন্ট `assets.critical_defect.detected` পাবলিশ এবং `SVC-BLK`-এ ব্লকের আবেদন জেনারেট।
- **Output (HTTP 201 Created):** সম্পূর্ণ `DefectDetailDTO`।

---

### `FUNC-AST-004`: File-Based CSV/XML Dump Ingestion (Feature #88)
- **Controller Class:** `apps.assets.views.FileBasedDumpImportView`
- **Permissions:** `IsAuthenticated`, `IsJuniorEngineerOrHigher`
- **Payload:** Multipart Form-Data (`source_system`: `TMS`, `dump_file`: `tms_defects_export_w38.csv`)
- **Processing Logic:**
  1. ফাইলের SHA-256 চেকসাম যাচাই (ডুপ্লিকেট আপলোড প্রতিরোধে)।
  2. Celery ব্যাকগ্রাউন্ড কিউ `assets`-এ পার্সিং টাস্ক ডিসপ্যাচ:
     `apps.assets.tasks.process_maintenance_dump.delay(file_audit_id)`।
  3. প্রতিটি রো-এর জন্য চেইনেজ ভ্যালিডেশন এবং ডিফেক্ট ইনসার্ট।
  4. ইনজেশন রিপোর্ট (সাফল্য সংখ্যা, ব্যর্থ রো-এর তালিকা) `assets_file_import_audit` টেবিলে সংরক্ষণ।
- **Output (HTTP 202 Accepted):** `FileImportSummaryDTO`।

---

### `FUNC-AST-005`: Chainage Normalization Engine (Feature #87)
- **Controller Class:** `apps.assets.views.ChainageNormalizeView`
- **Input Schema (`RawChainageInputDTO`):** `{"raw_location": "KM 45/2", "corridor_code": "HWH-BWN"}`
- **Processing Logic:**
  1. রেগুলার এক্সপ্রেশন পার্সার:
     - `KM 45/2` -> $45 + \frac{2}{10} = 45.200\text{ KM}$
     - `KM 45+250` -> $45 + \frac{250}{1000} = 45.250\text{ KM}$
  2. করিডোরের বৈধ সীমার মধ্যে কিনা যাচাই।
- **Output (HTTP 200):** `{"success": true, "normalized_km": 45.200, "corridor_code": "HWH-BWN"}`।

---

### `FUNC-AST-006`: Duplicate Defect Detection & Merging (Feature #90)
- **Controller Class:** `apps.assets.views.DefectDuplicateMergeView`
- **Permissions:** `IsSeniorSectionEngineerOrHigher`
- **Input Schema (`DefectMergeRequestDTO`):**
```json
{
  "primary_defect_id": "def-uuid-eng-01",
  "duplicate_defect_ids": ["def-uuid-snt-02"],
  "merge_justification": "Both reports point to track settlement at point 143 Bandel Yard"
}
```
- **Validation Rules:**
  - ডিফেক্টগুলোর পারস্পরিক ভৌগোলিক দূরত্ব অনধিক ১৫০ মিটার (`<= 0.150 KM`) হতে হবে।
- **Processing Logic:**
  1. ডুপ্লিকেট রেকর্ডগুলোর `is_duplicate = TRUE` এবং `merged_into_defect_id = primary_defect_id` আপডেট।
  2. কিউ থেকে ডুপ্লিকেট ব্লকের রিকোয়েস্ট প্রত্যাহার করে একটি একক সম্মিলিত ব্লকে একীভূত করা।
- **Output (HTTP 200):** `DefectMergeResultDTO`।

---

### `FUNC-AST-007`: Four-Source Data Freshness Monitor (Feature #89)
- **Controller Class:** `apps.assets.views.DataFreshnessStatusView`
- **Permissions:** `IsAuthenticated`
- **Processing Logic:**
  1. `assets_sync_status` টেবিল থেকে TMS, SMMS, TDMS এবং COA-এর শেষ সিঙ্ক টাইমস্ট্যাম্প ফেচ।
  2. শেষ সিঙ্ক থেকে অতিবাহিত সময় গণনা:
     $$\text{Hours Stale} = \frac{\text{CURRENT\_TIMESTAMP} - \text{Last Successful Sync}}{3600}$$
  3. কোনো সোর্সের স্টেলনেস ২৪ ঘণ্টার বেশি হলে হলুদ সতর্কতা (`WARNING_YELLOW`) জারি করা।
- **Output (HTTP 200):** `FreshnessStatusCollectionDTO` প্রতিটি সোর্সের হেলথ ব্যাজসহ।

---

### `FUNC-AST-008`: CoF × LoF Risk Matrix Priority Scoring (Feature #92)
- **Controller Class:** `apps.assets.views.RiskMatrixScoringView`
- **Query Parameters:** `?corridor=HWH-BWN`
- **Mathematical Logic:**
  - $\text{Risk Score} = \text{CoF (1-5)} \times \text{LoF (1-5)} \times \text{Corridor Multiplier (1.25 for Main Line)}$
  - স্কোর ১৬-২৫: `EXTREME_RISK` (তাত্ক্ষণিক ব্লক বাধ্যতামূলক)
  - স্কোর ১০-১৫: `HIGH_RISK` (সাপ্তাহিক প্ল্যানে শিডিউল)
  - স্কোর ৫-৯: `MEDIUM_RISK` (মাসিক প্ল্যানে শিডিউল)
- **Output (HTTP 200):** `RiskMatrixHeatmapDTO`।

---

### `FUNC-AST-009`: Predictive Maintenance Breakdown Forecast (Feature #33, #36)
- **Controller Class:** `apps.assets.views.PredictiveMaintenanceScheduleView`
- **Permissions:** `IsAuthenticated`
- **Processing Logic:**
  1. উইবুল ডিগ্রেডেশন মডেল ও হিস্টোরিক্যাল ফেইলিউর রেট বিশ্লেষণ করে অ্যাসেটের অবশিষ্ট কার্যকর আয়ু (Remaining Useful Life - RUL) প্রজেকশন।
  2. ব্রেকডাউনের আগেই ১৫ দিন পূর্বে অগ্রিম ব্লক বুকিং সুপারিশ তৈরি করা (`assets_predictive_schedule`)।
- **Output (HTTP 200):** `PredictiveScheduleDTO`।

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** [04-function-maps/07-analytics-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/07-analytics-function-map.md)

`06-assets-function-map.md` সফলভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `07-analytics-function-map.md`-এ **`SVC-ANL` (`apps.analytics`)**-এর ৭টি অ্যাসেট প্রাপ্যতা স্কোর (#50), ভ্যারিয়েন্স অটো-অ্যানালাইসিস (#109), স্যাংশন অর্ডার (#107), এবং অডিট ট্রেইল (#67) ফাংশনের নিখুঁত ম্যাপিং সংজ্ঞায়িত করা হবে।
