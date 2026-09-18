# 05-trains-function-map.md

> **ফাইল ক্রম:** ৩০/৪৫  
> **সার্ভিস আইডি:** `SVC-TRN` (`apps.trains`)  
> **পূর্ববর্তী ফাইল:** [04-function-maps/04-ontology-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/04-ontology-function-map.md) (`SVC-ONTO` Dedicated Function Map)  
> **পরবর্তী ফাইল:** [04-function-maps/06-assets-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/06-assets-function-map.md) (`SVC-AST` Dedicated Function Map)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ট্রাফিকের গ্রাউন্ড-ট্রুথ ও সময়সূচি ইঞ্জিন **`SVC-TRN` (Train Operations, Timetable Master & Live Punctuality Service)**-এর ৯টি ক্যানোনিকাল ফাংশনের ইনপুট/আউটপুট স্কিমা, টাইমটেবিল মাস্টার (#114), শিডিউল ডেভিয়েশন ডিটেকশন (#116), ডিলে ক্যাসকেড রিক্যালকুলেশন (#115), প্যাসেঞ্জার ইমপ্যাক্ট (#27), এবং গুডস ফোরকাস্ট এন্ট্রি (#91)-এর নিখুঁত বাস্তবায়ন বিবরণ প্রদান করা হয়েছে।

---

## 1. Function Catalog (9 Core Functions)

| Function ID | Function Name | HTTP Method | Path / Trigger | Input DTO | Output DTO | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-TRN-001` | Train Master Catalog & Priority Filter | `GET` | `/api/v1/trains/` | Query Parameters | `PaginatedTrainsResponseDTO` | p95 < 45ms |
| `FUNC-TRN-002` | Published Train Timetable Master | `GET` | `/api/v1/trains/{number}/schedule/`| None | `TrainScheduleMasterDTO` | p95 < 35ms |
| `FUNC-TRN-003` | Live Running Status & PostGIS GeoJSON | `GET` | `/api/v1/trains/live/` | Query Parameters | `LiveTrainPositionsDTO` | p95 < 40ms |
| `FUNC-TRN-004` | Schedule Deviation Detection Engine | `POST` | `/api/v1/trains/deviation-detect/` | `DeviationCheckRequestDTO` | `DeviationReportDTO` | p95 < 70ms |
| `FUNC-TRN-005` | Delay Cascade & Freed Window Refit | `POST` | `/api/v1/trains/delay-cascade-recalculate/`| `DelayCascadeRequestDTO` | `DelayCascadeResultDTO` | p95 < 110ms|
| `FUNC-TRN-006` | Passenger Impact Calculation Formula | `POST` | `/api/v1/trains/passenger-impact/` | `PassengerImpactRequestDTO`| `PassengerImpactScoreDTO` | p95 < 50ms |
| `FUNC-TRN-007` | Goods Forecast Manual Entry Form | `POST` | `/api/v1/trains/goods-forecast/` | `GoodsForecastEntryDTO` | `GoodsForecastDetailDTO` | p95 < 60ms |
| `FUNC-TRN-008` | NTES Live Ingestion & Simulator Feed | `POST` | `/api/v1/trains/ingest-ntes/` | `NTESIngestPayloadDTO` | `IngestionResultDTO` | p95 < 120ms|
| `FUNC-TRN-009` | Control Office (COA) Feed Ingestion | `POST` | `/api/v1/trains/ingest-coa/` | `COAIngestPayloadDTO` | `IngestionResultDTO` | p95 < 120ms|

---

## 2. Detailed Function Implementation Specifications

### `FUNC-TRN-001`: Train Master Catalog & Priority Filter (Feature #24)
- **Controller Class:** `apps.trains.views.TrainCatalogListView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?type=PRESTIGE&source=HWH&traction=ELECTRIC`
- **Processing Logic:**
  1. `trains_train` টেবিল থেকে ট্রেনের অগ্রাধিকার র‍্যাঙ্ক ও ক্যাটাগরি ফিল্টার।
  2. B-tree কম্পোজিট ইনডেক্স `idx_trains_type_priority` ব্যবহার করে দ্রুত পেজিনেটেড ডেটা রিটার্ন।
- **Output (HTTP 200):** `PaginatedTrainsResponseDTO`।

---

### `FUNC-TRN-002`: Published Train Timetable Master (Feature #114)
- **Controller Class:** `apps.trains.views.TrainScheduleMasterView`
- **Permissions:** `IsAuthenticated`
- **URL Parameter:** `train_number` (e.g. `12301`)
- **Processing Logic:**
  1. সক্রিয় টাইমটেবিল ভার্সন (`trains_timetable_version.is_active = TRUE`) ফেচ।
  2. ট্রেনের সকল স্টপেজের চেইনেজ কিমি (`km_milestone`), আগমন/প্রস্থান সময় এবং প্ল্যাটফর্ম নম্বর ক্রমানুসারে রিটার্ন।
  3. Redis ক্যাশ `railway:trn:timetable:{number}`-এ ২৪ ঘণ্টার জন্য ক্যাশ সেভ।
- **Output (HTTP 200):** `TrainScheduleMasterDTO`।

---

### `FUNC-TRN-003`: Live Running Status & PostGIS GeoJSON (Feature #48)
- **Controller Class:** `apps.trains.views.LiveTrainPositionsView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?corridor=HWH-BWN&delay_greater_than=15`
- **Processing Logic:**
  1. PostGIS স্পেশিয়াল কুয়েরির মাধ্যমে নির্দিষ্ট করিডোর বাউন্ডিং বক্সের মধ্যে চলমান ট্রেনগুলো নির্বাচন:
     ```sql
     SELECT t.train_number, t.train_name, t.priority_rank, l.current_km, l.delay_minutes, l.speed_kmh,
            ST_AsGeoJSON(l.current_coordinates) AS geojson_point
     FROM trains_livelocation l
     JOIN trains_train t ON l.train_id = t.id
     WHERE l.journey_date = CURRENT_DATE AND l.is_running = TRUE;
     ```
  2. ফ্রন্টএন্ড ৩ডি জিআইএস ম্যাপ এবং গ্যান্ট চার্ট চালানোর জন্য GeoJSON FeatureCollection রিটার্ন।
- **Output (HTTP 200):** `LiveTrainPositionsDTO`।

---

### `FUNC-TRN-004`: Schedule Deviation Detection Engine (Feature #116)
- **Controller Class:** `apps.trains.views.ScheduleDeviationDetectView`
- **Permissions:** `IsAuthenticated`, `IsSystemOrAdmin`
- **Input Schema (`DeviationCheckRequestDTO`):**
```json
{
  "train_number": "12301",
  "reporting_station": "BWN",
  "actual_arrival_time": "18:50:00",
  "threshold_minutes": 15
}
```
- **Processing Logic:**
  1. `trains_trainschedule` টেবিল থেকে প্রকাশিত শিডিউল সময় ফেচ (`18:05:00`)।
  2. ডেভিয়েশন ডিটেকশন পিওর ফাংশন কল:
     $$\Delta t = \text{Actual Time} - \text{Published Time} = 45\text{ minutes}$$
  3. $\Delta t \ge 15$ মিনিট হওয়ায় ডেভিয়েশন ফ্ল্যাগ `is_deviated = True`।
  4. স্বয়ংক্রিয়ভাবে ইভেন্ট `trains.schedule.deviated` ট্রিগার এবং `FUNC-TRN-005` (ডিলে ক্যাসকেড রিক্যালকুলেটর) আহ্বান।
- **Output (HTTP 200):** `DeviationReportDTO`।

---

### `FUNC-TRN-005`: Delay Cascade & Freed Window Refit (Feature #115)
- **Controller Class:** `apps.trains.views.DelayCascadeRecalculateView`
- **Permissions:** `IsChiefController`
- **Input Schema (`DelayCascadeRequestDTO`):**
```json
{
  "train_number": "12301",
  "delay_minutes": 45,
  "corridor_code": "HWH-BWN",
  "triggering_station": "BWN"
}
```
- **Processing Logic (`DelayCascadeRecalculator`):**
  1. বিলম্বিত ট্রেনের কারণে পেছনে চলা এক্সপ্রেস ট্রেনের হেডওয়ে সেপারেশন হিসাব:
     $$\text{Headway Violation} = \text{Safe Separation (5 min)} - (\text{Headway}_{\text{actual}})$$
  2. সংঘাতযুক্ত বর্তমান ব্লক শনাক্তকরণ (`blocks_blockproposal`)।
  3. ট্রেন দেরিতে চলার কারণে করিডোরে খালি হওয়া ৪০ মিনিটের মুক্ত স্লট (`Freed Window`) গণনা।
  4. ইঞ্জিনিয়ারিং বা টিআরডি-র অপেক্ষমাণ পেন্ডিং টাস্ক কিউ থেকে উপযুক্ত কাজ খুঁজে বের করে রিফিটের সুপারিশ কার্ড তৈরি:
     *"Refit Recommendation: Freed 40-min window at KM 45-48 can accommodate TASK-TRD-OHE-INSPECT-09 without disrupting downstream trains."*
  5. ফলাফল `trains_delay_cascade_event` টেবিলে সেভ এবং Redis ইভেন্ট `trains.delay.cascade_recalculated` এমিট।
- **Output (HTTP 200):** `DelayCascadeResultDTO`।

---

### `FUNC-TRN-006`: Passenger Impact Calculation Formula (Feature #27)
- **Controller Class:** `apps.trains.views.PassengerImpactCalculateView`
- **Permissions:** `IsAuthenticated`
- **Input Schema (`PassengerImpactRequestDTO`):**
```json
{
  "train_number": "12301",
  "projected_delay_minutes": 30,
  "passenger_count_override": null
}
```
- **Mathematical Formula:**
  $$\text{Impact Score} = \min\left(100.0, \frac{\text{Delay Minutes} \times \text{Pax Capacity} \times \text{Tier Weight}}{720.0}\right)$$
  *(যেখানে Prestige Weight = 1.5, Express = 1.0, Suburban = 1.2, Freight = 0.1)*
- **Output (HTTP 200):** `PassengerImpactScoreDTO` (স্কোর 0-100 এবং স্বচ্ছ ফর্মুলা ব্রেকডাউন)।

---

### `FUNC-TRN-007`: Goods Forecast Manual Entry Form (Feature #91, #28)
- **Controller Class:** `apps.trains.views.GoodsForecastCreateView`
- **Permissions:** `IsAuthenticated`, `IsSectionController`
- **Input Schema (`GoodsForecastEntryDTO`):**
```json
{
  "rake_id": "BOXN-26027-A",
  "commodity_type": "COAL",
  "origin_terminal": "DHN",
  "destination_terminal": "HWH",
  "planned_entry_time": "2026-09-19T23:30:00Z",
  "planned_exit_time": "2026-09-20T03:00:00Z",
  "assigned_corridor_code": "HWH-BWN",
  "is_night_slot_assigned": true
}
```
- **Validation Rules:**
  - এন্ট্রি সময় অবশ্যই বর্তমানের পরবর্তী হতে হবে।
  - ফ্রেইট নাইট স্লট অপটিমাইজেশন (`Feature #28`) নিশ্চিত করতে রাতের উইন্ডো (২৩:০০ থেকে ০৪:০০) অগ্রাধিকার দেওয়া হয়।
- **Processing Logic:**
  1. `trains_goods_forecast` টেবিলে রো ইনসার্ট।
  2. এআই অপটিমাইজার `SVC-BLK`-এ নোটিফাই করা যাতে ফ্রেইট ট্রেনের রুটে দিনের বেলায় ব্লক না ফেলে রাতে সংরক্ষণ করা যায়।
- **Output (HTTP 201 Created):** `GoodsForecastDetailDTO`।

---

### `FUNC-TRN-008` & `FUNC-TRN-009`: Ingest NTES & COA Live Feeds (Features #48, #42)
- **Controller Class:** `apps.trains.views.ExternalFeedIngestView`
- **Permissions:** `IsSystemOrAdmin`
- **Processing Logic:**
  1. NTES রেস্ট এপিআই বা লোকাল সিমুলেটর জেসন পেলোড ভ্যালিডেশন।
  2. `trains_livelocation` টেবিলে PostGIS পয়েন্ট ও ডিলে মিনিটস বাল্ক আপডেট (`bulk_update`)।
  3. ফ্রেশনেস হার্টবিট রেডিসে পুশ (`railway:ast:sync:heartbeat:NTES`)।
- **Output (HTTP 200):** `IngestionResultDTO` আপডেটেড রেকর্ড সংখ্যাসহ।

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** [04-function-maps/06-assets-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/06-assets-function-map.md)

`05-trains-function-map.md` সফলভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `06-assets-function-map.md`-এ **`SVC-AST` (`apps.assets`)**-এর ৯টি ইউনিফাইড অ্যাসেট রেজিস্ট্রি (#86), চেইনেজ নরমালাইজেশন (#87), ফাইল ইমপোর্ট (#88), ডেটা ফ্রেশনেস (#89), এবং CoF×LoF (#92) ফাংশনের বিস্তারিত ম্যাপিং সংজ্ঞায়িত করা হবে।
