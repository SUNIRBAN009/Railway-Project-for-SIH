# 05-trains.md

> **ফাইল ক্রম:** ২১/৪৫  
> **পূর্ববর্তী ফাইল:** [03-service-blueprints/04-ontology.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/04-ontology.md) (`SVC-ONTO`: Semantic Digital Twin & Symbolic AI Reasoning Service)  
> **পরবর্তী ফাইল:** [03-service-blueprints/06-assets.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/06-assets.md) (`SVC-AST`: Locomotive, Rolling Stock & Track Asset Management Service)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ট্রাফিক ইঞ্জিন **`SVC-TRN` (Train Operations, Timetable Master & Live Punctuality Service)**-এর পূর্ণাঙ্গ প্রোডাকশন আর্কিটেকচার ব্লুপ্রিন্ট সংজ্ঞায়িত করা হয়েছে। এটি ভারতীয় রেলওয়ের অফিসিয়াল মাস্টার টাইমটেবিল (Master Timetable), COA (Control Office Application), এবং NTES (National Train Enquiry System)-এর সাথে রিয়েল-টাইমে সংযুক্ত হয়ে ট্রেনের ভৌগোলিক অবস্থান (PostGIS Point), লাইভ ডিলে ডিটেকশন (Live Delay Detection), ডিলে ক্যাসকেড রিক্যালকুলেশন (Delay Cascade Recalculation), এবং যাত্রীদের প্রভাব গণনা (Passenger Impact Calculation) পরিচালনা করে। এটি `SVC-BLK`-এর এআই কনফ্লিক্ট ইঞ্জিন ও প্রায়োরিটি স্কোরারের মূল গ্রাউন্ড-ট্রুথ (Ground Truth) হিসেবে কাজ করে।

---

# SVC-TRN: Train Operations, Timetable Master & Live Punctuality Service

> **Service ID:** `SVC-TRN`  
> **Bounded Context App:** `apps.trains`  
> **Owning Team:** Train Operations & Timetable Engineering Team  
> **Business Criticality:** `Mission-Critical (Tier 1 - Traffic Truth & Operational Safety Guard)`  
> **Primary SLA:** Availability $\ge 99.95\%$, p95 REST Latency $< 60\text{ ms}$, p95 Spatial Tracking $< 40\text{ ms}$  
> **Execution Runtime:** Gunicorn WSGI (:8000) + Daphne ASGI (:8001) + Celery 5.3 Dedicated Worker Queue (`high`)

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission & Railway Mandate
ভারতীয় রেলওয়েতে এক্সপ্রেস ট্রেনের টাইমটেবিল ১ মাস বা তারও বেশি সময় আগে থেকে নির্ধারিত ও টিকিট বিক্রির মাধ্যমে লকড থাকে। কিন্তু প্রতিদিন বিভিন্ন অপারেশনাল কারণে ট্রেনের সময়সূচিতে বিচ্যুতি (Schedule Deviation) ঘটে। যখন একটি ট্রেন লেট করে, তখন পূর্বে নির্ধারিত মেইনটেন্যান্স ব্লকের সাথে সময় বা লাইনের তীব্র সংঘাত তৈরি হয়। 

`SVC-TRN`-এর মূল দায়িত্ব হলো:
1. **মাস্টার টাইমটেবিল ম্যানেজমেন্ট (Master Timetable):** প্রতি বছরের অনুমোদিত ট্রেনের রুট, শিডিউল এবং স্টপেজ মাস্টার ডেটা হিসেবে সংরক্ষণ করা।
2. **লাইভ ট্র্যাকিং ও ডেভিয়েশন ডিটেকশন (Schedule Deviation Detection):** NTES ও COA লাইভ ফিডের সাথে প্রকাশিত টাইমটেবিল তুলনা করে কোনো মানুষের হস্তক্ষেপ ছাড়াই সিস্টেম নিজে থেকে ট্রেনের বিলম্ব শনাক্ত করবে।
3. **ডিলে ক্যাসকেড রিক্যালকুলেশন (Delay Cascade Recalculation):** একটি ট্রেন লেট হলে তার পেছনের ট্রেন, কানেক্টিং প্ল্যাটফর্ম এবং সংলগ্ন মেইনটেন্যান্স ব্লকে কী প্রভাব পড়বে তা সঙ্গে সঙ্গে হিসেব করে মুক্ত হওয়া করিডোর উইন্ডোতে অপেক্ষমাণ কাজকে রিফিট (Refit) করা।
4. **প্যাসেঞ্জার ইমপ্যাক্ট ও ফেয়ারনেস (Passenger Impact Calculator):** কোনো ব্লকের কারণে কতজন যাত্রী কত মিনিট লেট হচ্ছেন তার স্বচ্ছ স্কোর (0-100) তৈরি করা।
5. **পিক-আওয়ার ও ফ্রেইট সুরক্ষা (Peak Hour Protection & Freight Optimization):** ব্যস্ত সকাল ও সন্ধ্যায় মেইনটেন্যান্স ব্লক বন্ধ রাখা এবং মালগাড়ির জন্য রাতের ডেডিকেটেড স্লট নির্ধারণ করা।

#### Problem Statement PS26027 Alignment:
- [x] **Point 1 — Data Integration:** প্রকাশিত Train Time Table Master (Feature #114), NTES Live Feed (Feature #48), Control Office Live Feed (Feature #42), এবং Goods Forecast Manual Entry (Feature #91)।
- [x] **Point 2 — AI Prioritization:** Train Priority Classifier (Feature #24), Passenger Impact Calculator (Feature #27), এবং Critical Corridor Weighting (Feature #97)।
- [x] **Point 3 — Optimization:** Delay Cascade Recalculator (Feature #115), Schedule Deviation Detector (Feature #116), Peak Hour Protection (Feature #29), এবং Freight Block Optimization (Feature #28)।

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - `Train Time Table Master (#114)`: পূর্ণ প্রকাশিত টাইমটেবিল ডেটাবেসে সংস্করণসহ (Versioning) ধারণ করা।
  - `Schedule Deviation Detector (#116)`: NTES লাইভ অবস্থান এবং টাইমটেবিলের পার্থক্যের গাণিতিক তুলনা।
  - `Delay Cascade Recalculator (#115)`: ট্রেনের বিলম্বে ব্লকের কনফ্লিক্ট রি-অপটিমাইজেশন এবং খালি উইন্ডোর ব্যবহার।
  - `Train Priority Classifier (#24)`: বন্দে ভারত/রাজধানী (`PRESTIGE`) > মেল/এক্সপ্রেস (`EXPRESS`) > প্যাসেঞ্জার (`SUBURBAN`) > মালগাড়ি (`FREIGHT`) অগ্রাধিকার শ্রেণিবিন্যাস।
  - `Passenger Impact Calculator (#27)`: যাত্রী সংখ্যা ও বিলম্বের সমন্বয়ে 0-100 স্কেলে ইমপ্যাক্ট স্কোর গণনা।
  - `Freight Block Optimization (#28)`: মালবাহী ট্রেনের জন্য রাতের করিডোর উইন্ডো সংরক্ষণ।
  - `Peak Hour Protection (#29)`: সকাল ৮:০০-১০:৩০ এবং বিকাল ১৭:০০-২০:০০ পর্যন্ত করিডোরে ব্লক নিষেধাজ্ঞা জারি।
  - `Goods Forecast Entry (#91)`: কন্ট্রোল অফিসের জন্য মালগাড়ির সম্ভাব্য পাথের ইনপুট ফর্ম (COA ফিড অনুপস্থিত থাকলে)।
  - `PostGIS Geospatial Tracking`: প্রতিটি ট্রেনের রিয়েল-টাইম জিপিএস পয়েন্ট (`SRID 4326`) এবং চেইনেজ কিমি ম্যাপিং।
- **Explicit Exclusions (Out of Scope):**
  - মেইনটেন্যান্স ব্লকের অনুমোদন ও ওয়ার্কফ্লো (পরিচালিত হয় `SVC-BLK`-এ)।
  - ট্র্যাক ও ট্রেনের যান্ত্রিক ক্রটি মেরামত লগ (পরিচালিত হয় `SVC-AST`-এ)।
  - লোকোমোটিভ ও ক্রু ডিটেইল রোস্টার (পরিচালিত হয় `SVC-DEPT`-এ)।

---

## 2. Technical Stack & Infrastructure Runtime

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SVC-TRN RUNTIME ARCHITECTURE                                         │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Inbound REST Traffic: Gunicorn WSGI (:8000) -> /api/v1/trains/*                                       │
│  Real-Time Geo Streaming: Daphne ASGI (:8001) -> ws://[host]:8001/ws/trains/live/                     │
│  Framework: Django 5.0.3 + Django REST Framework 3.15.1 + GeoDjango                                    │
│  Authoritative Database: PostgreSQL 15.6 + PostGIS 3.3.4 (Spatial GiST Indexing, SRID 4326 WGS-84)     │
│  Distributed Caching & Spatial Locks: Redis 7.2.4 (DB 3: Live Train Geospatial Cache & Buffer)         │
│  Asynchronous Pipeline: Celery 5.3.6 Worker on Queue: `high` (NTES Poller, Delay Recalculator)         │
│  External Connectors: NTES Adapter (REST/JSON) + COA Adapter (SOAP/JSON) + Mock Simulator Fallback    │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| উপাদান | প্রযুক্তি | সংস্করণ | উদ্দেশ্য ও কার্যকারিতা |
|---|---|---|---|
| **Programming Language** | Python | 3.11.8 | উচ্চ-গতির অ্যাসিনক্রোনাস টাস্ক এবং সি-অপটিমাইজড জিওস্পেশিয়াল প্রসেসিং (GDAL/GEOS) |
| **Backend Framework** | Django + DRF | 5.0.3 / 3.15.1 | Clean Architecture ও ডোমেন ভ্যালিডেশন লজিক |
| **Spatial Database** | PostgreSQL + PostGIS | 15.6 / 3.3.4 | ট্রেনের অক্ষাংশ-দ্রাঘিমাংশ এবং ট্র্যাকের চেইনেজ ইন্টারসেকশন (`ST_DWithin`) |
| **In-Memory Store** | Redis | 7.2.4 (DB 3) | লাইভ জিপিএস স্থানাঙ্ক ক্যাশিং এবং ৫ সেকেন্ডের ডেবোউন্স বাফার |
| **Task Queue** | Celery | 5.3.6 | উচ্চ-অগ্রাধিকার কিউ (`high`), শিডিউল বিচ্যুতি ও ক্যাসকেড গণনা |
| **WebSocket Engine** | Daphne | 4.1.0 | ডিভিশনাল কন্ট্রোল রুমে ট্রেনের লাইভ মুভমেন্ট ব্রডকাস্ট |

---

## 3. Database Schema & Persistence (PostgreSQL 15 + PostGIS 3.3)

### 3.1 Data Definition Language (DDL)

```sql
-- =============================================================================
-- SVC-TRN PostgreSQL 15 + PostGIS 3.3 DDL Specification
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Master Timetable Versioning (Feature #114)
CREATE TABLE trains_timetable_version (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code VARCHAR(32) NOT NULL UNIQUE, -- e.g., "IR-WTT-2026-V1"
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Train Catalog (Features #24, #27, #114)
CREATE TABLE trains_train (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    train_number VARCHAR(10) NOT NULL UNIQUE, -- e.g., "12301", "22436"
    train_name VARCHAR(150) NOT NULL,         -- e.g., "Howrah Rajdhani Express"
    
    -- Priority Classification (Feature #24)
    train_type VARCHAR(30) NOT NULL DEFAULT 'EXPRESS', 
    priority_rank INT NOT NULL DEFAULT 100, -- 1-10: Prestige, 11-40: Express, 41-80: Suburban, 81-100: Freight
    
    source_station VARCHAR(20) NOT NULL,
    destination_station VARCHAR(20) NOT NULL,
    operating_days_mask VARCHAR(7) NOT NULL DEFAULT '1111111', -- MTWTFSS
    
    -- Mechanical & Operational Specs
    traction_type VARCHAR(20) NOT NULL DEFAULT 'ELECTRIC', -- ELECTRIC, DIESEL, DUAL
    max_speed_kmh INT NOT NULL DEFAULT 130,
    rake_length_meters NUMERIC(7, 2) NOT NULL DEFAULT 650.00,
    standard_coach_count INT NOT NULL DEFAULT 22,
    estimated_passenger_capacity INT NOT NULL DEFAULT 1200, -- Used by Feature #27
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Published Timetable Station Stops (Feature #114)
CREATE TABLE trains_trainschedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_version_id UUID NOT NULL,
    train_id UUID NOT NULL,
    station_code VARCHAR(20) NOT NULL,        -- e.g., "HWH", "BWN", "ASN"
    station_sequence INT NOT NULL,            -- 1, 2, 3...
    
    scheduled_arrival_time TIME NULL,         -- NULL for originating station
    scheduled_departure_time TIME NOT NULL,
    day_offset INT NOT NULL DEFAULT 0,        -- Day 0, Day 1 (for overnight runs)
    
    platform_number VARCHAR(10) NULL,
    km_milestone NUMERIC(8, 3) NOT NULL,      -- Exact distance from corridor datum (KM)
    halt_duration_minutes INT NOT NULL DEFAULT 2,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedule_version FOREIGN KEY (timetable_version_id) 
        REFERENCES trains_timetable_version(id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_train FOREIGN KEY (train_id) 
        REFERENCES trains_train(id) ON DELETE CASCADE,
    CONSTRAINT uq_train_version_seq UNIQUE (timetable_version_id, train_id, station_sequence)
);

-- 4. Real-Time Live Running Status (Features #42, #48, #116)
CREATE TABLE trains_livelocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    train_id UUID NOT NULL,
    journey_date DATE NOT NULL,
    
    current_station_code VARCHAR(20) NOT NULL,
    current_km NUMERIC(8, 3) NOT NULL,
    
    -- PostGIS Exact Geographic Location (Feature #48)
    current_coordinates GEOMETRY(Point, 4326) NOT NULL,
    
    delay_minutes INT NOT NULL DEFAULT 0,     -- Positive = Late, Negative = Early
    speed_kmh NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    heading_degrees NUMERIC(5, 2) DEFAULT 0.00,
    
    data_source VARCHAR(24) NOT NULL DEFAULT 'NTES', -- NTES, COA, GPS_DEVICE, SIMULATOR
    last_reported_at TIMESTAMPTZ NOT NULL,
    is_running BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_live_train FOREIGN KEY (train_id) 
        REFERENCES trains_train(id) ON DELETE CASCADE,
    CONSTRAINT uq_train_journey_date UNIQUE (train_id, journey_date)
);

-- 5. Goods / Freight Forecast Paths (Feature #91, #28)
CREATE TABLE trains_goods_forecast (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rake_id VARCHAR(32) NOT NULL,             -- e.g., "BOXN-26027-A"
    commodity_type VARCHAR(50) NOT NULL,      -- COAL, IRON_ORE, CEMENT, CONTAINER
    origin_terminal VARCHAR(20) NOT NULL,
    destination_terminal VARCHAR(20) NOT NULL,
    
    planned_entry_time TIMESTAMPTZ NOT NULL,
    planned_exit_time TIMESTAMPTZ NOT NULL,
    assigned_corridor_code VARCHAR(50) NOT NULL,
    speed_potential_kmh INT NOT NULL DEFAULT 75,
    gross_tonnage NUMERIC(8, 2) NOT NULL DEFAULT 4500.00,
    
    is_night_slot_assigned BOOLEAN NOT NULL DEFAULT FALSE,
    source_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL_ENTRY', -- MANUAL_ENTRY, COA_FEED
    logged_by_user VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Delay Cascade & Block Refitting Log (Feature #115)
CREATE TABLE trains_delay_cascade_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    train_id UUID NOT NULL,
    detected_delay_minutes INT NOT NULL,
    triggering_station VARCHAR(20) NOT NULL,
    
    impacted_following_trains_count INT NOT NULL DEFAULT 0,
    impacted_blocks_count INT NOT NULL DEFAULT 0,
    
    -- JSON structure holding the recalculated schedule & freed window tasks
    cascade_analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    refit_opportunity_detected BOOLEAN NOT NULL DEFAULT FALSE,
    
    is_acknowledged_by_controller BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cascade_train FOREIGN KEY (train_id) 
        REFERENCES trains_train(id) ON DELETE CASCADE
);
```

### 3.2 Spatial & Performance Indexing
```sql
-- PostGIS Spatial GiST Index for Live Train Location Searches
CREATE INDEX idx_trains_livelocation_coords ON trains_livelocation USING GIST (current_coordinates);

-- B-tree Composite Indexes for High-Frequency Queries
CREATE INDEX idx_trains_type_priority ON trains_train (train_type, priority_rank);
CREATE INDEX idx_trainschedule_lookup ON trains_trainschedule (timetable_version_id, station_code, scheduled_arrival_time);
CREATE INDEX idx_live_journey_delay ON trains_livelocation (journey_date, delay_minutes DESC);
CREATE INDEX idx_cascade_unack ON trains_delay_cascade_event (is_acknowledged_by_controller, created_at DESC);
```

### 3.3 Redis Caching Strategy & Key Namespaces
- `railway:trn:live:[train_number]`: সর্বশেষ লাইভ স্ট্যাটাস (TTL = 30 সেকেন্ড)।
- `railway:trn:timetable:[train_number]`: ট্রেনের পুরো শিডিউল অ্যারে (TTL = 86,400 সেকেন্ড বা ২৪ ঘণ্টা)।
- `railway:trn:peak_hours:[corridor_id]`: করিডোর ভিত্তিক পিক-আওয়ার কনফিগারেশন (TTL = 86,400 সেকেন্ড)।
- **Stampede Protection:** Redis distributed lock `SET lock:recalculate:cascade:[train_id] NX EX 10` নিশ্চিত করে যাতে একই ট্রেনের লেট আপডেটে মাল্টিপল ক্যাসকেড অ্যালগরিদম কনকারেন্টলি না চলে।

---

## 4. API Endpoints Specification

সকল REST API স্ট্যান্ডার্ড প্ল্যাটফর্ম রেসপন্স এনভেলপ অনুসরণ করে:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-18T21:00:00.000Z",
  "correlation_id": "c80918fa-05trn-472b-a19f-b9816e26027a"
}
```

### 4.1 REST Endpoints Matrix

| Method | Endpoint Route | Auth / Role | Description & Function ID | Target SLA |
|---|---|---|---|:---:|
| `GET` | `/api/v1/trains/` | Authenticated | ট্রেনের তালিকা ও প্রায়োরিটি ফিল্টারিং (`FUNC-TRN-001`) | p95 < 50ms |
| `GET` | `/api/v1/trains/{number}/schedule/` | Authenticated | মাস্টার টাইমটেবিল স্টপ ও কিমি পয়েন্ট (`FUNC-TRN-002`) | p95 < 40ms |
| `GET` | `/api/v1/trains/live/` | Authenticated | লাইভ রানিং অবস্থান ও পোস্টজিআইএস GeoJSON (`FUNC-TRN-003`) | p95 < 45ms |
| `POST`| `/api/v1/trains/deviation-detect/` | System / Admin | NTES বনাম টাইমটেবিল বিচ্যুতি শনাক্তকরণ (`FUNC-TRN-004`) | p95 < 80ms |
| `POST`| `/api/v1/trains/delay-cascade-recalculate/`| Chief Controller | ডিলে ক্যাসকেড ও খালি উইন্ডোতে ব্লক রিফিট (`FUNC-TRN-005`)| p95 < 120ms|
| `POST`| `/api/v1/trains/passenger-impact/` | Authenticated | ব্লকের কারণে প্যাসেঞ্জার ইমপ্যাক্ট ক্যালকুলেশন (`FUNC-TRN-006`)| p95 < 60ms |
| `POST`| `/api/v1/trains/goods-forecast/` | Controller / JE | মালগাড়ির পূর্বাভাস ম্যানুয়াল এন্ট্রি (`FUNC-TRN-007`) | p95 < 70ms |
| `POST`| `/api/v1/trains/ingest-ntes/` | Ingestion Worker | NTES API ফিড সিঙ্ক ও লোকাল সিমুলেশন (`FUNC-TRN-008`) | p95 < 150ms|
| `POST`| `/api/v1/trains/ingest-coa/` | Ingestion Worker | COA লাইভ কন্ট্রোল অফিস ফিড ইনজেশন (`FUNC-TRN-009`) | p95 < 150ms|

### 4.2 Real-Time WebSocket Streaming Contract (Daphne Channels)
- **Channel Route:** `ws://[host]:8001/ws/trains/live/`
- **Broadcast Group:** `corridor_trains_[corridor_code]` (e.g., `corridor_trains_HWH-BWN`)
- **Payload Schema:**
```json
{
  "type": "TRAIN_LOCATION_UPDATE",
  "data": {
    "train_number": "12301",
    "train_name": "Howrah Rajdhani Express",
    "priority_rank": 2,
    "current_km": 67.450,
    "speed_kmh": 124.5,
    "delay_minutes": 45,
    "coordinates": {"latitude": 23.2324, "longitude": 87.8615},
    "status": "RUNNING_LATE",
    "cascade_recalculated": true
  }
}
```

---

## 5. Event-Driven Contracts & Integrations

### 5.1 Published Events (via Redis Channel Layer / Outbox)

#### Event 1: `trains.schedule.deviated` (Feature #116)
যখন কোনো ট্রেনের নির্ধারিত স্টেশনে পৌঁছাতে ১৫ মিনিটের বেশি বিলম্ব শনাক্ত হয়:
```json
{
  "event_id": "e9821a00-116d-491a-8bb7-920194812345",
  "event_type": "trains.schedule.deviated",
  "timestamp": "2026-09-18T21:05:00.000Z",
  "payload": {
    "train_number": "12301",
    "train_name": "Howrah Rajdhani Express",
    "corridor_code": "HWH-BWN",
    "station_code": "BWN",
    "scheduled_time": "18:05:00",
    "actual_time": "18:50:00",
    "delay_minutes": 45,
    "priority_tier": "PRESTIGE"
  }
}
```

#### Event 2: `trains.delay.cascade_recalculated` (Feature #115)
ক্যাসকেড ইঞ্জিন যখন বিলম্বের প্রভাব বিশ্লেষণ করে সংঘাতযুক্ত ব্লক চিহ্নিত করে এবং মুক্ত স্লটে টাস্ক ফিট করে:
```json
{
  "event_id": "c71109ff-115c-412e-9941-817290123984",
  "event_type": "trains.delay.cascade_recalculated",
  "timestamp": "2026-09-18T21:05:03.000Z",
  "payload": {
    "primary_delayed_train": "12301",
    "delay_minutes": 45,
    "conflicting_blocks_identified": ["BLK-20260918-004"],
    "freed_window": {
      "corridor_code": "HWH-BWN",
      "start_time": "2026-09-18T18:10:00Z",
      "end_time": "2026-09-18T18:50:00Z",
      "duration_minutes": 40,
      "recommended_pending_task": "TASK-TRD-OHE-INSPECT-09"
    }
  }
}
```

### 5.2 Consumed Events
- **`blocks.window.requested` (`SVC-BLK` থেকে):** ট্রেনের শিডিউলের সাথে কোনো প্রস্তাবিত ব্লক টাইমটেবিল ইন্টারসেক্ট করে কিনা তা ভ্যালিডেট করে।
- **`safety.emergency.triggered` (`SVC-BLK` / `SVC-NOTIF` থেকে):** লাইনে জরুরি স্পিড রেস্ট্রিকশন (TSR #77) বা সেকশন হোল্ড জারি হলে ট্রেনের ডিসপ্যাচ অ্যালার্ট প্রদান করে।

---

## 6. Mathematical Algorithms & Pure Logic Formulations

### 6.1 Train Priority Classification Pure Logic (Feature #24)
```python
def classify_train_priority(train_type: str, passenger_count: int, is_freight: bool) -> tuple[int, str]:
    """
    Categorizes trains into 4 Indian Railways Priority Tiers (Feature #24):
    Prestige (Vande Bharat/Rajdhani) > Express > Suburban > Freight
    """
    if is_freight:
        return 90, "FREIGHT"
    
    train_type_upper = train_type.upper()
    if train_type_upper in ["VANDE_BHARAT", "RAJDHANI", "SHATABDI", "TEJAS"]:
        return 5, "PRESTIGE"
    elif train_type_upper in ["MAIL", "EXPRESS", "SUPERFAST", "GARIB_RATH"]:
        return 30, "EXPRESS"
    elif train_type_upper in ["SUBURBAN", "EMU", "MEMU", "PASSENGER"]:
        return 60, "SUBURBAN"
    else:
        return 75, "STANDARD"
```

### 6.2 Passenger Impact Calculation Formula (Feature #27)
```python
def calculate_passenger_impact(delay_minutes: int, passenger_count: int, train_priority_tier: str) -> float:
    """
    Calculates transparent passenger impact score (0 to 100) (Feature #27):
    Impact = min(100.0, (delay_minutes * passenger_count * weight) / normalization_factor)
    """
    tier_weights = {
        "PRESTIGE": 1.5,
        "EXPRESS": 1.0,
        "SUBURBAN": 1.2, # High volume suburban commuter sensitivity
        "FREIGHT": 0.1
    }
    weight = tier_weights.get(train_priority_tier, 1.0)
    
    # Normalization factor calibrated for 1200 pax delayed by 60 min = score 100
    normalization_factor = 720.0
    raw_score = (delay_minutes * passenger_count * weight) / normalization_factor
    return round(min(100.0, max(0.0, raw_score)), 2)
```

### 6.3 Schedule Deviation Detection Engine (Feature #116)
```python
def detect_schedule_deviations(
    published_arrival_time: str, 
    actual_reported_time: str, 
    threshold_minutes: int = 15
) -> dict:
    """
    Compares NTES live arrival vs published WTT timetable.
    Returns whether the threshold has been violated and the exact delay minutes.
    """
    from datetime import datetime
    t_pub = datetime.strptime(published_arrival_time, "%H:%M:%S")
    t_act = datetime.strptime(actual_reported_time, "%H:%M:%S")
    
    diff_minutes = int((t_act - t_pub).total_seconds() / 60)
    is_deviated = diff_minutes >= threshold_minutes
    
    return {
        "is_deviated": is_deviated,
        "delay_minutes": diff_minutes,
        "requires_cascade_recalculation": is_deviated
    }
```

### 6.4 Delay Cascade & Freed Window Refit Logic (Feature #115)
```python
def recalculate_delay_cascade(
    delayed_train: dict,
    scheduled_blocks_in_corridor: list[dict],
    pending_maintenance_queue: list[dict]
) -> dict:
    """
    When Train 12301 runs 45 min late:
    1. Detects blocks conflicting with the new train path.
    2. Identifies newly freed corridor windows (since train departed later than scheduled).
    3. Finds best-fit pending maintenance task from queue to utilize freed slot.
    """
    conflicting_blocks = []
    freed_window = None
    
    # 1. Inspect conflicts with existing blocks
    for blk in scheduled_blocks_in_corridor:
        # Check if delayed train arrival overlaps with block window
        if blk['start_km'] <= delayed_train['current_km'] <= blk['end_km']:
            conflicting_blocks.append(blk['block_id'])
            
    # 2. Freed window exists from original train schedule to delayed schedule
    freed_duration_mins = delayed_train['delay_minutes']
    if freed_duration_mins >= 30: # Usable window >= 30 mins
        freed_window = {
            "duration_minutes": freed_duration_mins,
            "corridor_code": delayed_train['corridor_code']
        }
        
    # 3. Best-fit task search
    recommended_task = None
    if freed_window:
        for task in pending_maintenance_queue:
            if task['required_duration_minutes'] <= freed_duration_mins - 10: # 10 min buffer
                recommended_task = task
                break
                
    return {
        "conflicting_blocks": conflicting_blocks,
        "freed_window": freed_window,
        "recommended_task": recommended_task
    }
```

### 6.5 Peak Hour Protection Guard (Feature #29)
```python
def is_peak_hour_violation(proposed_start_time: str, proposed_end_time: str) -> bool:
    """
    Auto guard (Feature #29): Prohibits blocks during morning (08:00-10:30) 
    and evening (17:00-20:00) suburban rush hours.
    """
    from datetime import datetime, time
    start = datetime.strptime(proposed_start_time, "%H:%M").time()
    end = datetime.strptime(proposed_end_time, "%H:%M").time()
    
    morning_peak = (time(8, 0), time(10, 30))
    evening_peak = (time(17, 0), time(20, 0))
    
    for peak_start, peak_end in [morning_peak, evening_peak]:
        if not (end <= peak_start or start >= peak_end):
            return True # Overlaps with peak hour
    return False
```

---

## 7. Demo Data Specification & SIH Scenario Alignment

### 7.1 Seeded Trains Master Catalog (12 Core Trains)
ডেমো সিস্টেমটি `seed_railway_demo` কমান্ডের মাধ্যমে ১২টি সুনির্দিষ্ট ট্রেন সিড করে, যা বিচারকদের সামনে পুরো ট্রাফিক বর্ণালী প্রদর্শন করে:

| Train Number | Train Name | Type | Priority Rank | Source -> Dest | Pax Capacity |
|---|---|---|:---:|---|:---:|
| `22436` | Vande Bharat Express | `PRESTIGE` | 1 | HWH -> PNBE | 1128 |
| `12301` | Howrah Rajdhani Express | `PRESTIGE` | 2 | HWH -> NDLS | 1250 |
| `12019` | Shatabdi Express | `PRESTIGE` | 3 | HWH -> RNC | 980 |
| `12303` | Poorva Express | `EXPRESS` | 15 | HWH -> NDLS | 1450 |
| `12809` | Mumbai Mail | `EXPRESS` | 20 | HWH -> CSMT | 1600 |
| `13005` | Amritsar Mail | `EXPRESS` | 25 | HWH -> ASR | 1500 |
| `37211` | Bandel Local | `SUBURBAN` | 50 | HWH -> BDC | 2200 |
| `37813` | Bardhaman Local | `SUBURBAN` | 52 | HWH -> BWN | 2400 |
| `36811` | Arambagh Local | `SUBURBAN` | 55 | HWH -> AMBG | 2100 |
| `FR-COAL-01`| Bokaro Coal Heavy Haul | `FREIGHT` | 90 | DHN -> HWH | 0 (Goods) |
| `FR-CONT-02`| CONCOR Export Special | `FREIGHT` | 88 | NDLS -> HWH | 0 (Goods) |
| `FR-STEEL-03`| Durgapur Steel Rake | `FREIGHT` | 92 | DGR -> HWH | 0 (Goods) |

### 7.2 Timetabled Corridor Route: Howrah to Bardhaman (HWH-BWN)
- **মোট দূরত্ব:** ৯৫.৫ কিমি (4-Line Chord/Main Mix)
- **মূল স্টেশনসমূহ:** Howrah (`HWH` - KM 0.0), Serampore (`SRP` - KM 19.5), Seoraphuli (`SHE` - KM 22.3), Bandel (`BDC` - KM 39.2), Bardhaman (`BWN` - KM 95.5)।

### 7.3 Scenario C Live Injection (Demonstration Storyline)
1. **প্রারম্ভিক অবস্থা:** ট্রেন `12301` (Howrah Rajdhani) ঠিক সময়ে চলছে।
2. **ইনজেকশন ট্রিগার:** `python manage.py inject_scenario --scenario=C`
3. **ঘটনাক্রম:**
   - NTES সিমুলেটর ট্রেন ১২৩০১-এর জন্য বর্ধমানে ৪৫ মিনিট বিলম্ব রিপোর্ট করে (`Schedule Deviation Detector #116`)।
   - ইভেন্ট `trains.schedule.deviated` ট্রিগার হয়।
   - `Delay Cascade Recalculator (#115)` স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে সংঘাতযুক্ত ব্লক চিহ্নিত করে।
   - সিস্টেমে দেখা যায় ৪৫ মিনিটের ফাঁকা স্লটে ইঞ্জিনিয়ারিং ডিপার্টমেন্টের একটি পেন্ডিং ট্র্যাক ট্যাম্পিং টাস্ক (`TASK-ENG-TAMP-04`) অনায়াসে ফিট করা সম্ভব।
   - চিফ কন্ট্রোলারের ড্যাশবোর্ডে **"Opportunity: 40-min freed slot detected - Refit Task #4?"** কার্ড ভেসে ওঠে।

---

## 8. Next File Dependency Note

> **পরবর্তী ফাইল:** [03-service-blueprints/06-assets.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/06-assets.md)

`05-trains.md` (`SVC-TRN`) সফলভাবে ও পুঙ্খানুপুঙ্খভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `06-assets.md`-এ **Locomotive, Rolling Stock & Track Asset Management Service (`SVC-AST`)**-এর প্রোডাকশন ব্লুপ্রিন্ট সংজ্ঞায়িত করা হবে, যাতে TMS/SMMS/TDMS ডেটা ইনজেশন, চেইনেজ নরমালাইজেশন (#87), এবং ইউনিফাইড অ্যাসেট রেজিস্ট্রি (#86) সন্নিবেশিত থাকবে।
