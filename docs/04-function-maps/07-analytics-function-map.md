# 07-analytics-function-map.md

> **ফাইল ক্রম:** ৩২/৪৫  
> **সার্ভিস আইডি:** `SVC-ANL` (`apps.analytics`)  
> **পূর্ববর্তী ফাইল:** [04-function-maps/06-assets-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/06-assets-function-map.md) (`SVC-AST` Dedicated Function Map)  
> **পরবর্তী ফাইল:** [04-function-maps/08-notifications-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/08-notifications-function-map.md) (`SVC-NOTIF` Dedicated Function Map)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের এক্সিকিউটিভ ইন্টেলিজেন্স ও প্রাইমারি সাকসেস মেট্রিক সার্ভিস **`SVC-ANL` (Asset Availability Analytics, Variance Auto-Analysis & Reporting Service)**-এর সাতটি ক্যানোনিকাল ফাংশনের ইনপুট/আউটপুট স্কিমা, অ্যাসেট প্রাপ্যতা স্কোর (#50), ব্লক ইউটিলাইজেশন ড্যাশবোর্ড (#49), প্ল্যান ভ্যারিয়েন্স অটো-অ্যানালাইসিস (#109), স্বয়ংক্রিয় দৈনিক পিডিএফ (#53), অফিশিয়াল স্যাংশন অর্ডার (#107), অপরিবর্তনীয় অডিট ট্রেইল (#67), এবং হোয়াট-ইফ সিমুলেটরের (#62) বিস্তারিত বাস্তবায়ন বিবরণ প্রদান করা হয়েছে।

---

## 1. Function Catalog (7 Core Functions)

| Function ID | Function Name | HTTP Method | Path / Trigger | Input DTO | Output DTO | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-ANL-001` | Asset Availability Score (% Availability) | `GET` | `/api/v1/analytics/availability-score/` | Query Parameters | `AssetAvailabilityScoreDTO` | p95 < 45ms |
| `FUNC-ANL-002` | Block Time Utilization Dashboard | `GET` | `/api/v1/analytics/utilization-dashboard/`| Query Parameters | `BlockUtilizationMetricsDTO` | p95 < 55ms |
| `FUNC-ANL-003` | Plan Variance Automated Analysis | `GET` | `/api/v1/analytics/variance-analysis/` | Query Parameters | `PlanVarianceAnalysisDTO` | p95 < 60ms |
| `FUNC-ANL-004` | Automated Daily Summary Report (PDF) | `POST` | `/api/v1/analytics/reports/daily/` | `DailyReportGenerateDTO` | `ReportDownloadResponseDTO` | p95 < 750ms|
| `FUNC-ANL-005` | Official Sanction Order PDF Generator | `POST` | `/api/v1/analytics/reports/sanction-order/`| `SanctionOrderRequestDTO` | `SanctionOrderResponseDTO` | p95 < 1100ms|
| `FUNC-ANL-006` | Immutable Audit Trail & Regulatory Log | `GET` | `/api/v1/analytics/audit-trail/` | Query Parameters | `PaginatedAuditLogsDTO` | p95 < 65ms |
| `FUNC-ANL-007` | What-If Scenario Sandbox Simulator | `POST` | `/api/v1/analytics/simulator/what-if/` | `WhatIfSimulationDTO` | `WhatIfSimulationResultDTO`| p95 < 140ms|

---

## 2. Detailed Function Implementation Specifications

### `FUNC-ANL-001`: Asset Availability Score (Feature #50 - Primary Success Metric)
- **Controller Class:** `apps.analytics.views.AssetAvailabilityScoreView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?corridor=HWH-BWN&days=7`
- **Mathematical Logic:**
  $$\text{Availability } A = \left(1.0 - \frac{\sum (\text{Downtime KM} \times \text{Downtime Hours})}{\text{Total Corridor KM} \times \text{Total Period Hours}}\right) \times 100\%$$
- **Processing Logic:**
  1. PostgreSQL টেবিল `analytics_corridor_daily_kpi` থেকে বিগত ৭ দিনের রোলআপ ডেটা এগ্রিগেট।
  2. করিডোরের বেসলাইন প্রাপ্যতা (৭৮.৪%) বনাম বর্তমান এআই প্রাপ্যতা (৯৫.৩%) ট্রেন্ড ক্যালকুলেশন।
  3. Redis ক্যাশ `railway:anl:availability:summary`-এ ১৫ মিনিটের জন্য ক্যাশ সংরক্ষণ।
- **Output (HTTP 200):** `AssetAvailabilityScoreDTO` যাতে থাকে বর্তমান স্কোর, বেঞ্চমার্ক লক্ষ্য (৯০%+), এবং ডে-বাই-ডে প্রগ্রেস গ্রাফ ডেটা।

---

### `FUNC-ANL-002`: Block Time Utilization Dashboard (Feature #49)
- **Controller Class:** `apps.analytics.views.BlockUtilizationDashboardView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?division=HWH&time_window=30d`
- **Processing Logic:**
  1. `analytics_block_efficiency` টেবিল থেকে স্যাংশন সময় বনাম প্রকৃত কাজের সময়ের ওএলএপি কুয়েরি:
     $$U = \frac{\sum T_{\text{actual}}}{\sum T_{\text{sanctioned}}} \times 100\%$$
  2. অপচয়কৃত সময় (Wasted Mins) এবং অনুমোদিত সীমা পার হওয়া ওভারস্টে (Burst Mins) চিহ্নিতকরণ।
  3. তিন ডিপার্টমেন্টের সম্মিলিত ব্লকের কারণে সাশ্রয়কৃত ঘণ্টার পরিমাণ প্রদর্শন (`hours_saved_by_bundling`)।
- **Output (HTTP 200):** `BlockUtilizationMetricsDTO`।

---

### `FUNC-ANL-003`: Plan Variance Automated Analysis (Feature #109)
- **Controller Class:** `apps.analytics.views.PlanVarianceAnalysisView`
- **Permissions:** `IsAuthenticated`, `IsSectionControllerOrHigher`
- **Query Parameters:** `?corridor=HWH-BWN&horizon=WEEKLY`
- **Processing Logic (`VarianceAnalyzer`):**
  1. `analytics_variance_summary` টেবিল থেকে পরিকল্পিত বনাম সম্পাদিত ব্লকের শতাংশ অনুপাত হিসাব (`Adherence Rate`).
  2. ১-ট্যাপ রিজন কোডের ভিত্তিতে ভ্যারিয়েন্সের পাই-চার্ট ডিকম্পোজিশন (যেমন: বৃষ্টি ৩০%, ম্যাটেরিয়াল বিলম্ব ২৫%, ক্রু সমস্যা ২০%, অপারেশনাল ট্রাফিক ২৫%)।
  3. পরবর্তী সপ্তাহের প্ল্যানিং উন্নত করার জন্য স্বয়ংক্রিয় রিকমেন্ডেশন তৈরি।
- **Output (HTTP 200):** `PlanVarianceAnalysisDTO`।

---

### `FUNC-ANL-004`: Automated Daily Summary Report (Feature #53)
- **Controller Class:** `apps.analytics.views.DailyReportGenerateView`
- **Permissions:** `IsAuthenticated`, `IsSeniorSectionEngineerOrHigher`
- **Input Schema (`DailyReportGenerateDTO`):**
```json
{
  "report_date": "2026-09-18",
  "division_code": "HWH",
  "format": "PDF",
  "recipient_emails": ["drm.hwh@er.railnet.gov.in", "sr.dom.hwh@er.railnet.gov.in"]
}
```
- **Processing Logic:**
  1. দিনের সকল ব্লকের অবস্থা, ট্রেন বিলম্ব এবং সেফটি ঘটনার সামারি ফেচ।
  2. WeasyPrint / ReportLab ইঞ্জিন ব্যবহার করে অফিশিয়াল ভারতীয় রেলওয়ে ফরম্যাটের দ্বিভাষিক (ইংরেজি ও হিন্দি) পিডিএফ তৈরি।
  3. Celery কিউ `analytics`-এ অ্যাসিঙ্ক ইমেল ডিসপ্যাচ টাস্ক ট্রিগার।
- **Output (HTTP 200):** `ReportDownloadResponseDTO` ডাউনলোডেবল স্টোরেজ ইউআরএলসহ।

---

### `FUNC-ANL-005`: Official Sanction Order PDF Generator (Feature #107)
- **Controller Class:** `apps.analytics.views.SanctionOrderGenerateView`
- **Permissions:** `IsChiefControllerOrDRM`
- **Input Schema (`SanctionOrderRequestDTO`):**
```json
{
  "plan_horizon": "WEEKLY",
  "effective_from": "2026-09-21",
  "effective_to": "2026-09-27",
  "division_code": "HWH",
  "digital_signature_token": "DRM-SIGN-TOKEN-9821"
}
```
- **Processing Logic:**
  1. ফ্রিজড উইকলি প্ল্যানের সকল অনুমোদিত ব্লকের তালিকা সংগ্রহ।
  2. আনুষ্ঠানিক রেলওয়ে স্যাংশন লেটার টেমপ্লেট রেন্ডারিং যাতে থাকে অর্ডার নম্বর (`SANCTION-HWH-DIV-2026-W38`)।
  3. ডকুমেন্টের সুরক্ষার জন্য SHA-256 ডিজিটাল ভেরিফিকেশন কিউআর কোড সংযুক্তিকরণ।
  4. মেটাডেটা `analytics_sanction_order` টেবিলে পারসিস্ট।
- **Output (HTTP 201 Created):** `SanctionOrderResponseDTO` ভেরিফাইড পিডিএফ লিঙ্কসহ।

---

### `FUNC-ANL-006`: Immutable Audit Trail & Regulatory Log (Feature #67)
- **Controller Class:** `apps.analytics.views.AuditTrailListView`
- **Permissions:** `IsAuthenticated`, `IsSafetyAuditorOrAdmin`
- **Query Parameters:** `?entity_type=Block&entity_id=BLK-20260918-004&page=1`
- **Processing Logic:**
  1. `analytics_audit_trail` টেবিল থেকে অপরিবর্তনীয় অডিট লগ কুয়েরি।
  2. কে কখন কোন ব্লকের আবেদন করেছিল, কে অনুমোদন করেছিল, এবং কোনো জরুরি ওভাররাইড ঘটেছিল কিনা তার সম্পূর্ণ টাইমলাইন রিটার্ন।
- **Output (HTTP 200):** `PaginatedAuditLogsDTO`।

---

### `FUNC-ANL-007`: What-If Scenario Sandbox Simulator (Feature #62)
- **Controller Class:** `apps.analytics.views.WhatIfScenarioSimulatorView`
- **Permissions:** `IsAuthenticated`, `IsPlannerOrEngineer`
- **Input Schema (`WhatIfSimulationDTO`):**
```json
{
  "target_block_id": "a9102847-02bb-481a-9911-c01928374612",
  "proposed_new_start_time": "2026-09-19T13:00:00Z",
  "proposed_new_end_time": "2026-09-19T16:30:00Z"
}
```
- **Processing Logic:**
  1. মূল ডেটাবেসে কোনো পরিবর্তন না করে মেমরি স্যান্ডবক্সে ব্লকের সময় পরিবর্তন করা।
  2. টাইমটেবিল মাস্টারের সাথে ট্রেনের সময়সূচির ভার্চুয়াল ইন্টারসেকশন চেক।
  3. সিমুলেটেড কনফ্লিক্ট সংখ্যা, আনুমানিক ট্রাফিক বিলম্ব মিনিট, এবং অ্যাসেট প্রাপ্যতার ওপর সম্ভাব্য প্রভাবের তাৎক্ষণিক প্রেডিকশন রিটার্ন।
- **Output (HTTP 200):** `WhatIfSimulationResultDTO` (সিদ্ধান্ত গ্রহণের জন্য সবুজ/লাল ভার্চুয়াল ভ্যারডিক্ট)।

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** [04-function-maps/08-notifications-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/08-notifications-function-map.md)

`07-analytics-function-map.md` সফলভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `08-notifications-function-map.md`-এ **`SVC-NOTIF` (`apps.notifications`)**-এর ৮টি মাল্টি-চ্যানেল পুশ, লাইভ জিপিএস এসওএস সাইরেন (#79), ট্রেন অ্যাপ্রোচ ওয়ার্নিং (#76), এবং লোন ওয়ার্কার (#78) ফাংশনের নিখুঁত ম্যাপিং সংজ্ঞায়িত করা হবে।
