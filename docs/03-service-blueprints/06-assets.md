# 06-assets.md

> **ফাইল ক্রম:** ২২/৪৫  
> **পূর্ববর্তী ফাইল:** [03-service-blueprints/05-trains.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/05-trains.md) (`SVC-TRN`: Train Operations, Timetable Master & Live Punctuality Service)  
> **পরবর্তী ফাইল:** [03-service-blueprints/07-analytics.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/07-analytics.md) (`SVC-ANL`: Asset Availability Analytics, Variance Engine & Executive Reporting Service)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ভৌত অবকাঠামো এবং ট্রিপল-ডিপার্টমেন্ট ডেটা ইনজেশন ইঞ্জিন **`SVC-AST` (Track Infrastructure, Catenary & Signaling Asset Telemetry & Health Monitoring Service)**-এর পূর্ণাঙ্গ প্রোডাকশন আর্কিটেকচার ব্লুপ্রিন্ট সংজ্ঞায়িত করা হয়েছে। এটি ভারতীয় রেলওয়ের তিন প্রধান রক্ষণাবেক্ষণ সিস্টেম—TMS (ইঞ্জিনিয়ারিং), SMMS (এসঅ্যান্ডটি), এবং TDMS (টিআরডি)—থেকে ডেটা ইনজেস্ট করে, চেইনেজ ফরম্যাট স্ট্যান্ডার্ডাইজ করে (`Chainage Normalization`), ক্রস-সিস্টেম অ্যাসেট ম্যাপিং (`Unified Asset Registry`) নিশ্চিত করে, এবং CoF × LoF রিস্ক ম্যাট্রিক্স ও ডিলে ক্যাসকেড বিশ্লেষণের মাধ্যমে এআই ব্লক প্ল্যানিংয়ের জন্য প্রায়োরিটাইজড মেইনটেন্যান্স রিকোয়েস্ট তৈরি করে।

---

# SVC-AST: Railway Physical Infrastructure & Asset Health Service

> **Service ID:** `SVC-AST`  
> **Bounded Context App:** `apps.assets`  
> **Owning Team:** Civil (ENGG), Electrical (TRD) & Signaling (S&T) Asset Reliability Engineering Team  
> **Business Criticality:** `Safety-Critical (Physical Infrastructure Health, USFD Flaw Detection & Derailment Prevention)`  
> **Primary SLA:** Availability $\ge 99.95\%$, p95 Query Latency $< 65\text{ ms}$, p95 Ingestion Batch $< 500\text{ ms}$  
> **Execution Runtime:** Gunicorn WSGI (:8000) + Celery 5.3 Batch Worker Queue (`assets`)

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission & Railway Mandate
ভারতীয় রেলওয়েতে ট্র্যাকের ত্রুটি (TMS), সিগন্যালিং ফেইলিউর (SMMS), এবং ওভারহেড তারের বিদ্যুৎ সংযোগ (TDMS) ঐতিহাসিকভাবে তিনটি পৃথক সফটওয়্যারে স্বাধীনভাবে রক্ষণাবেক্ষণ করা হয়। ফলে একই ট্র্যাক সেকশনে ত্রুটি থাকা সত্ত্বেও সম্মিলিত ব্লক না নেওয়ায় বিপুল পরিমাণ ট্রেন চলাচল ব্যাহত হয় এবং সম্পদ ডাউনটাইম বৃদ্ধি পায়।

`SVC-AST`-এর মূল দায়িত্ব হলো:
1. **ইউনিফাইড অ্যাসেট রেজিস্ট্রি (Unified Asset Registry #86):** একই ব্রিজ, সিগন্যাল পোস্ট বা OHE মাস্ট TMS, SMMS এবং TDMS-এ ভিন্ন ভিন্ন আইডিতে সংরক্ষিত থাকলেও তাদের একটি একক ক্যানোনিকাল মাস্টারের সাথে ম্যাপ করা।
2. **চেইনেজ নরমালাইজেশন (Chainage Normalization Engine #87):** রেলওয়ের বিভিন্ন ফরম্যাট (যেমন: `KM 45/2`, `45+200`, `Bardhaman Yard Pt 143`) থেকে মিলিমিটার নির্ভুল দশমিকে রূপান্তর (যেমন: `45.200 KM`), যা পোস্টজিআইএস ও কনফ্লিক্ট ডিটেকশনের পূর্বশর্ত।
3. **মাল্টি-সোর্স ইটিএল সিঙ্ক ও ফাইল ফলব্যাক (ETL Sync Scheduler #68 & File Fallback #88):** শিডিউলারের মাধ্যমে TMS, SMMS ও TDMS থেকে নিয়মিত ডেটা ইনজেশন এবং এপিআই না থাকলে সিএসভি/এক্সএমএল ডাম্প ভ্যালিডেশনের মাধ্যমে সিস্টেমে লোড করা।
4. **ডেটা ফ্রেশনেস মনিটর (Data Freshness Monitor #89):** কোনো ডিপার্টমেন্টের ডেটা যদি ২৪ ঘণ্টার বেশি পুরনো হয়, তবে সিস্টেমে হলুদ স্টেলনেস অ্যালার্ট জারি করে ভুল এআই প্ল্যানিং প্রতিরোধ করা।
5. **ডুপ্লিকেট ডিফেক্ট মার্জার (Duplicate Defect Merger #90):** একাধিক ডিপার্টমেন্ট একই লোকেশনে ডিফেক্ট রিপোর্ট করলে এআই সিমিলারিটি চেকের মাধ্যমে তা শনাক্ত করে কন্ট্রোলারের অনুমোদনে মার্জ করা।
6. **CoF × LoF রিস্ক ম্যাট্রিক্স ও এজিং স্কোর (Risk Matrix #92 & Defect Aging #93):** আন্তর্জাতিক কনসিকোয়েন্স অব ফেইলিউর × লাইকলিহুড স্ট্যান্ডার্ড এবং ওভারডিউ দিনের এক্সপোনেনশিয়াল এজিং স্কোরের মাধ্যমে স্বচ্ছ অগ্রাধিকার তৈরি করা।
7. **প্রেডিক্টিভ মেইনটেন্যান্স ও ডাউনটাইম প্রিডিক্টর (Predictive Scheduler #33 & Downtime Predictor #36):** ট্র্যাকের কোয়ালিটি ইনডেক্স (TQI) এবং ফেইলিউর হিস্ট্রি বিশ্লেষণ করে ব্রেকডাউনের আগেই অ্যাডভান্স ব্লক রিকমেন্ড করা।

#### Problem Statement PS26027 Alignment:
- [x] **Point 1 — Data Integration:** TMS Integration (Feature #45), SMMS Integration (Feature #46), TDMS Integration (Feature #47), ETL Sync Scheduler (Feature #68), File-based Fallback (Feature #88), Unified Asset Registry (Feature #86), Chainage Normalization (Feature #87), Data Freshness Monitor (Feature #89), এবং Duplicate Defect Merger (Feature #90)।
- [x] **Point 2 — AI Prioritization:** CoF × LoF Risk Matrix (Feature #92), Defect Aging Score (Feature #93), Predictive Maintenance Scheduler (Feature #33), এবং Seasonal Pattern Analyzer (Feature #35)।
- [x] **Point 3 — Optimization & Availability:** Asset Downtime Predictor (Feature #36) এবং স্বয়ংক্রিয় ব্লক রিকমেন্ডেশন।

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - ভৌত রেল অবকাঠামোর মাস্টার ইনভেন্টরি ও পোস্টজিআইএস স্পেশিয়াল জ্যামিতি (`LineString` ও `Point`)।
  - ইউএসএফডি (Ultrasonic Flaw Detection) এবং টিআরসি (Track Recording Car) ডেটা ইনজেশন।
  - ডিফেক্ট লগিং, এজিং স্কোর হিসাব এবং ডুপ্লিকেট ডিফেক্ট ডিটেকশন।
  - TMS/SMMS/TDMS অ্যাডাপ্টার এবং সিএসভি/এক্সএমএল ফাইল প্রসেসিং পাইপলাইন।
  - সোর্স ফ্রেশনেস হেলথ চেক এবং অডিট ট্রেইল।
- **Explicit Exclusions (Out of Scope):**
  - ওয়ার্ক গ্যাং রোস্টারিং এবং টুলস ট্র্যাকিং (ম্যানেজ করে `SVC-DEPT`)।
  - করিডোর টাইম-উইন্ডো ডিটেকশন এবং এসএজিএ ব্লক বুকিং (ম্যানেজ করে `SVC-BLK`)।
  - চলমান ট্রেনের লাইভ লোকেশন ও টাইমটেবিল স্পেশিয়াল কোয়ারি (ম্যানেজ করে `SVC-TRN`)।

---

## 2. Technical Stack & Infrastructure Runtime

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SVC-AST RUNTIME TOPOLOGY                                             │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  REST API Endpoints: Gunicorn WSGI (:8000) -> /api/v1/assets/*                                         │
│  Data Processing Framework: Django 5.0.3 + Django REST Framework 3.15.1 + GeoDjango                    │
│  Mathematical & Degradation Engine: Scientific NumPy 1.26 + Pandas 2.2 (Vectorized TQI Calculations)   │
│  Authoritative Storage: PostgreSQL 15.6 + PostGIS 3.3.4 (SRID 4326, GiST Linear Referencing)           │
│  Cache & Freshness Registry: Redis 7.2.4 (DB 6: Asset Degradation Scores & Source Heartbeat Registry)   │
│  Background Task Queue: Celery 5.3.6 Worker on Queue: `assets` (ETL Ingestion, File Parsing, ML RUL)  │
│  Integration Connectors: TMS Adapter + SMMS Adapter + TDMS Adapter + CSV/XML Parser Engine            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| উপাদান | প্রযুক্তি | সংস্করণ | উদ্দেশ্য ও কার্যকারিতা |
|---|---|---|---|
| **Programming Language** | Python | 3.11.8 | ডেটা পার্সিং, ভেক্টর ক্যালকুলেশন এবং জিওস্পেশিয়াল সি-লাইব্রেরি (GDAL/GEOS) |
| **Backend Framework** | Django + DRF | 5.0.3 / 3.15.1 | ডোমেন লজিক, রেস্ট কন্ট্রোলার ও ফাইল আপলোড হ্যান্ডলিং |
| **Spatial Database** | PostgreSQL + PostGIS | 15.6 / 3.3.4 | লিনিয়ার চেইনেজ সেগমেন্টেশন এবং GiST স্পেশিয়াল ইনডেক্সিং (`ST_LineSubstring`) |
| **Mathematical Engine** | NumPy & Pandas | 1.26 / 2.2 | ট্র্যাক কোয়ালিটি ইনডেক্স (TQI) এবং এক্সপোনেনশিয়াল এজিং স্কোর ভেক্টরাইজেশন |
| **In-Memory Store** | Redis | 7.2.4 (DB 6) | ডিপার্টমেন্টাল সিঙ্ক হার্টবিট এবং করিডোর-ভিত্তিক অ্যাসেট হেলথ স্কোর ক্যাশ |
| **Batch Worker Queue** | Celery | 5.3.6 | শিডিউলড ইটিএল পোলিং ও ভারী সিএসভি ফাইল প্রসেসিং কিউ (`assets`) |

---

## 3. Database Schema & Persistence (PostgreSQL 15 + PostGIS 3.3)

### 3.1 Data Definition Language (DDL)

```sql
-- =============================================================================
-- SVC-AST PostgreSQL 15 + PostGIS 3.3 DDL Specification
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Unified Asset Registry Master (Features #86, #87)
CREATE TABLE assets_trackasset (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag VARCHAR(64) NOT NULL UNIQUE,          -- e.g., "AST-HWH-BWN-DN-KM-45.200"
    asset_category VARCHAR(32) NOT NULL,            -- TRACK_CIVIL, OHE_TRACTION, SIGNAL_TELECOM, BRIDGES
    sub_type VARCHAR(64) NOT NULL,                  -- 60KG_UIC_RAIL, PSC_SLEEPER, OHE_MAST_PORTAL, POINT_MACHINE_143
    corridor_code VARCHAR(32) NOT NULL,             -- e.g., "HWH-BWN"
    
    -- Linear Referencing Normalized Chainage (Feature #87)
    chainage_start_km NUMERIC(8, 3) NOT NULL CHECK (chainage_start_km >= 0),
    chainage_end_km NUMERIC(8, 3) NOT NULL CHECK (chainage_end_km >= chainage_start_km),
    track_line_type VARCHAR(20) NOT NULL DEFAULT 'DOWN', -- UP, DOWN, REVERSIBLE, LOOP_1, YARD
    
    -- PostGIS Exact Linear or Point Spatial Extent (SRID 4326)
    spatial_extent GEOMETRY(Geometry, 4326) NOT NULL,
    
    -- Cross-System ID Mapping (Feature #86)
    tms_asset_id VARCHAR(64) NULL,                  -- ID in Track Management System
    smms_asset_id VARCHAR(64) NULL,                 -- ID in Signalling Maintenance System
    tdms_asset_id VARCHAR(64) NULL,                 -- ID in Traction Distribution System
    
    -- Health & Degradation Scoring
    installation_date DATE NOT NULL,
    current_health_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (current_health_score BETWEEN 0.00 AND 100.00),
    track_quality_index NUMERIC(5, 2) NULL,         -- TQI calculated from TRC car runs
    cof_score INT NOT NULL DEFAULT 3 CHECK (cof_score BETWEEN 1 AND 5), -- Consequence of Failure (Feature #92)
    lof_score INT NOT NULL DEFAULT 2 CHECK (lof_score BETWEEN 1 AND 5), -- Likelihood of Failure (Feature #92)
    
    is_operational BOOLEAN NOT NULL DEFAULT TRUE,
    last_inspected_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. External System Sync Status & Freshness Registry (Features #68, #89)
CREATE TABLE assets_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system VARCHAR(20) NOT NULL UNIQUE,      -- TMS, SMMS, TDMS, USFD_FEED, COA
    department_code VARCHAR(20) NOT NULL,           -- ENGG, S_AND_T, TRD, OPERATING
    
    last_sync_attempt TIMESTAMPTZ NOT NULL,
    last_successful_sync TIMESTAMPTZ NOT NULL,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, STALE, FAILED, RUNNING
    
    records_ingested_last_run INT NOT NULL DEFAULT 0,
    stale_alert_threshold_hours INT NOT NULL DEFAULT 24, -- Triggers Alert if exceeded
    is_stale_alert_active BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT NULL,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Cross-System Defect Log & Aging Register (Features #45, #46, #47, #90, #93)
CREATE TABLE assets_defect_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    defect_code VARCHAR(32) NOT NULL UNIQUE,        -- e.g., "DEF-2026-ENG-00892"
    asset_id UUID NOT NULL,
    source_system VARCHAR(20) NOT NULL,             -- TMS, SMMS, TDMS, USFD, MANUAL_INSPECTION
    
    -- Normalized Location Information
    normalized_chainage_km NUMERIC(8, 3) NOT NULL,
    track_line_type VARCHAR(20) NOT NULL,
    
    defect_type VARCHAR(64) NOT NULL,               -- RAIL_FRACTURE, OHE_CANTILEVER_DISPLACEMENT, POINT_DETECTION_FAIL
    severity VARCHAR(24) NOT NULL,                  -- CRITICAL, MAJOR, MINOR, MONITORING
    detected_at TIMESTAMPTZ NOT NULL,
    days_overdue INT NOT NULL DEFAULT 0,            -- Calculated daily by Celery beat
    aging_priority_score NUMERIC(6, 2) NOT NULL DEFAULT 1.00, -- Feature #93 Exponential
    
    -- Speed Restriction & Block Trigger
    imposed_tsr_speed_kmh INT NULL,                 -- Temporary Speed Restriction (Feature #77)
    is_block_required BOOLEAN NOT NULL DEFAULT TRUE,
    suggested_block_duration_minutes INT NOT NULL DEFAULT 120,
    
    -- Duplicate Merger Logic (Feature #90)
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    merged_into_defect_id UUID NULL,
    similarity_confidence_pct NUMERIC(5, 2) NULL,
    merged_by_user VARCHAR(64) NULL,
    merged_at TIMESTAMPTZ NULL,
    
    -- Rectification Lifecycle
    is_rectified BOOLEAN NOT NULL DEFAULT FALSE,
    rectified_at TIMESTAMPTZ NULL,
    resolved_by_block_id UUID NULL,                 -- Linked Block ID from SVC-BLK
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_defect_asset FOREIGN KEY (asset_id) 
        REFERENCES assets_trackasset(id) ON DELETE CASCADE,
    CONSTRAINT fk_defect_merged FOREIGN KEY (merged_into_defect_id) 
        REFERENCES assets_defect_log(id) ON DELETE SET NULL
);

-- 4. File-Based Ingestion Log (Feature #88)
CREATE TABLE assets_file_import_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system VARCHAR(20) NOT NULL,             -- TMS, SMMS, TDMS
    file_name VARCHAR(255) NOT NULL,
    file_format VARCHAR(10) NOT NULL,               -- CSV, XML, JSON
    file_checksum_sha256 VARCHAR(64) NOT NULL,
    
    rows_parsed INT NOT NULL DEFAULT 0,
    rows_succeeded INT NOT NULL DEFAULT 0,
    rows_failed INT NOT NULL DEFAULT 0,
    validation_report JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    uploaded_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Predictive Degradation & RUL Forecasts (Features #33, #36)
CREATE TABLE assets_predictive_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    predicted_failure_date DATE NOT NULL,
    confidence_interval_pct NUMERIC(5, 2) NOT NULL DEFAULT 85.00,
    remaining_useful_life_days INT NOT NULL,
    
    recommended_block_start_date DATE NOT NULL,
    recommended_block_end_date DATE NOT NULL,
    recommended_block_duration_minutes INT NOT NULL DEFAULT 180,
    prediction_model_version VARCHAR(32) NOT NULL DEFAULT 'WEIBULL-DEGRADATION-V2',
    
    is_block_booked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_predict_asset FOREIGN KEY (asset_id) 
        REFERENCES assets_trackasset(id) ON DELETE CASCADE
);
```

### 3.2 Spatial & Performance Indexing
```sql
-- PostGIS Spatial GiST Index for Linear & Point Asset Coordinates
CREATE INDEX idx_assets_trackasset_spatial ON assets_trackasset USING GIST (spatial_extent);

-- Cross-System ID Mapping Unique / Sparse B-tree Indexes
CREATE INDEX idx_assets_tms_id ON assets_trackasset (tms_asset_id) WHERE tms_asset_id IS NOT NULL;
CREATE INDEX idx_assets_smms_id ON assets_trackasset (smms_asset_id) WHERE smms_asset_id IS NOT NULL;
CREATE INDEX idx_assets_tdms_id ON assets_trackasset (tdms_asset_id) WHERE tdms_asset_id IS NOT NULL;

-- B-tree Composite Indexes for Scheduling & Conflict Searches
CREATE INDEX idx_assets_corridor_chainage ON assets_trackasset (corridor_code, chainage_start_km, chainage_end_km);
CREATE INDEX idx_defects_active_aging ON assets_defect_log (is_rectified, is_duplicate, aging_priority_score DESC);
CREATE INDEX idx_defects_chainage_lookup ON assets_defect_log (normalized_chainage_km, source_system);
CREATE INDEX idx_sync_stale ON assets_sync_status (sync_status, is_stale_alert_active);
```

### 3.3 Redis Caching Strategy & Key Namespaces
- `railway:ast:health:[asset_tag]`: বর্তমান অ্যাসেট হেলথ ও টিরিআই ডেটা (TTL = 3600 সেকেন্ড বা ১ ঘণ্টা)।
- `railway:ast:sync:heartbeat:[source]`: লাস্ট সিঙ্ক টাইমস্ট্যাম্প (TTL = 86,400 সেকেন্ড)।
- `railway:ast:corridor_summary:[corridor_code]`: করিডোর ভিত্তিক ওপেন ডিফেক্ট কাউন্ট ও গড় হেলথ স্কোর (TTL = 300 সেকেন্ড)।
- **Stampede Protection:** Redis distributed lock `SET lock:etl:sync:[source_system] NX EX 30` নিশ্চিত করে যাতে একই সোর্সের একাধিক সিঙ্ক শিডিউলার একসাথে রান না করে।

---

## 4. API Endpoints Specification

সকল REST API স্ট্যান্ডার্ড প্ল্যাটফর্ম রেসপন্স এনভেলপ অনুসরণ করে:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-18T21:10:00.000Z",
  "correlation_id": "a98012bc-06ast-410a-b28e-c01928471920"
}
```

### 4.1 REST Endpoints Matrix

| Method | Endpoint Route | Auth / Role | Description & Function ID | Target SLA |
|---|---|---|---|:---:|
| `GET` | `/api/v1/assets/` | Authenticated | অ্যাসেট ইনভেন্টরি, ক্যাটাগরি ও চেইনেজ ফিল্টার (`FUNC-AST-001`) | p95 < 60ms |
| `GET` | `/api/v1/assets/{tag}/` | Authenticated | নির্দিষ্ট অ্যাসেটের পূর্ণ বিবরণ ও ডিফেক্ট হিস্ট্রি (`FUNC-AST-002`) | p95 < 35ms |
| `POST`| `/api/v1/assets/defects/` | Dept Engineer | নতুন ডিফেক্ট লগ তৈরি ও এজিং স্কোর অ্যাসাইন (`FUNC-AST-003`) | p95 < 80ms |
| `POST`| `/api/v1/assets/defects/import-file/` | Dept JE / Admin | CSV/XML ডাম্প ফাইল আপলোড ও পার্সিং (`FUNC-AST-004`) | p95 < 300ms|
| `POST`| `/api/v1/assets/normalize-chainage/` | System / Internal | র-লোকেশন স্ট্রিংকে ক্যানোনিকাল চেইনেজে রূপান্তর (`FUNC-AST-005`)| p95 < 25ms |
| `POST`| `/api/v1/assets/defects/merge/` | Senior Controller | ডুপ্লিকেট ডিফেক্ট মার্জ অনুমোদন (`FUNC-AST-006`) | p95 < 75ms |
| `GET` | `/api/v1/assets/freshness-status/` | Controller / JE | চার সোর্সের (TMS/SMMS/TDMS/COA) ডেটা ফ্রেশনেস (`FUNC-AST-007`)| p95 < 40ms |
| `GET` | `/api/v1/assets/risk-matrix/` | Authenticated | CoF × LoF রিস্ক হিটম্যাপ ও প্রায়োরিটি স্কোর (`FUNC-AST-008`)| p95 < 55ms |
| `GET` | `/api/v1/assets/predictive-maintenance/`| Controller / SE | প্রেডিক্টিভ ব্রেকডাউন পূর্বাভাস ও ব্লক রিকমেন্ডেশন (`FUNC-AST-009`)| p95 < 70ms |

---

## 5. Event-Driven Contracts & Integrations

### 5.1 Published Events (via Redis Channel Layer / Outbox)

#### Event 1: `assets.critical_defect.detected`
যখন ইউএসএফডি বা টিএমএস থেকে রেল ফ্র্যাকচার বা ওএইচই সাই ত্রুটি ইনজেস্ট হয়:
```json
{
  "event_id": "b9101284-0611-477a-9011-889123401928",
  "event_type": "assets.critical_defect.detected",
  "timestamp": "2026-09-18T21:12:00.000Z",
  "payload": {
    "defect_code": "DEF-2026-ENG-00892",
    "asset_tag": "AST-HWH-BWN-DN-KM-45.200",
    "department": "CIVIL_ENGG",
    "defect_type": "INTERNAL_RAIL_FRACTURE",
    "severity": "CRITICAL",
    "corridor_code": "HWH-BWN",
    "chainage_km": 45.200,
    "imposed_tsr_kmh": 30,
    "block_mandatory": true,
    "cof_lof_score": 25
  }
}
```

#### Event 2: `assets.sync.stale_alert` (Feature #89)
যখন কোনো ডিপার্টমেন্টাল ডাম্প বা এপিআই নির্ধারিত ফ্রেশনেস থ্রেশহোল্ড অতিক্রম করে:
```json
{
  "event_id": "f8192837-89aa-419b-a019-918273645102",
  "event_type": "assets.sync.stale_alert",
  "timestamp": "2026-09-18T21:12:05.000Z",
  "payload": {
    "source_system": "SMMS",
    "department_code": "S_AND_T",
    "last_successful_sync": "2026-09-17T14:30:00.000Z",
    "hours_stale": 30.7,
    "threshold_hours": 24,
    "alert_level": "WARNING_YELLOW"
  }
}
```

### 5.2 Consumed Events
- **`blocks.work.completed` (`SVC-BLK` থেকে):** সফল ব্লক সম্পন্ন হওয়ার পর সম্পৃক্ত ডিফেক্ট লগ `is_rectified = True` হিসেবে মার্ক করে এবং অ্যাসেটের হেলথ স্কোর রিক্যালকুলেট করে।
- **`departments.gang.deployed` (`SVC-DEPT` থেকে):** গ্যাং সাইটে উপস্থিত হলে সংশ্লিষ্ট অ্যাসেটের স্ট্যাটাস `UNDER_MAINTENANCE`-এ আপডেট করে।

---

## 6. Mathematical Algorithms & Pure Logic Formulations

### 6.1 Chainage Normalization Engine Pure Function (Feature #87)
```python
import re

def normalize_railway_chainage(raw_location_string: str) -> dict:
    """
    Standardizes disparate railway location formats into a clean decimal chainage (Feature #87).
    Supports formats:
    - 'KM 45/2' or '45/2' -> 45.200 KM
    - 'KM 45+250' -> 45.250 KM
    - 'KM 45.5' -> 45.500 KM
    """
    raw = raw_location_string.strip().upper()
    
    # Pattern 1: KM 45/2 (45 KM and 2 telegraph posts out of 10)
    match_slash = re.search(r'(?:KM\s*)?(\d+)/(\d+)', raw)
    if match_slash:
        km = int(match_slash.group(1))
        tp = int(match_slash.group(2))
        decimal_km = round(km + (tp / 10.0), 3)
        return {"success": True, "normalized_km": decimal_km, "format": "TELEGRAPH_POST"}
        
    # Pattern 2: KM 45+250 (45 KM and 250 meters)
    match_plus = re.search(r'(?:KM\s*)?(\d+)\+(\d+)', raw)
    if match_plus:
        km = int(match_plus.group(1))
        meters = int(match_plus.group(2))
        decimal_km = round(km + (meters / 1000.0), 3)
        return {"success": True, "normalized_km": decimal_km, "format": "METER_PLUS"}
        
    # Pattern 3: Standard decimal KM 45.5
    match_dec = re.search(r'(?:KM\s*)?(\d+(?:\.\d+)?)', raw)
    if match_dec:
        decimal_km = round(float(match_dec.group(1)), 3)
        return {"success": True, "normalized_km": decimal_km, "format": "DECIMAL_KM"}
        
    return {"success": False, "normalized_km": None, "error": f"Invalid chainage string: '{raw_location_string}'"}
```

### 6.2 CoF × LoF Risk Matrix Priority Scoring (Feature #92)
```python
def calculate_risk_matrix_score(cof: int, lof: int, corridor_is_critical: bool) -> dict:
    """
    International Asset Management Standard: Risk = Consequence of Failure (1-5) * Likelihood (1-5)
    Scores range from 1 to 25. Critical corridors receive a 1.25 multiplier with a 25 cap.
    """
    assert 1 <= cof <= 5, "CoF must be between 1 and 5"
    assert 1 <= lof <= 5, "LoF must be between 1 and 5"
    
    base_risk = cof * lof
    multiplier = 1.25 if corridor_is_critical else 1.00
    final_score = round(min(25.0, base_risk * multiplier), 2)
    
    if final_score >= 16:
        category = "EXTREME_RISK"
        action = "IMMEDIATE_BLOCK_MANDATORY"
    elif final_score >= 10:
        category = "HIGH_RISK"
        action = "SCHEDULE_IN_WEEKLY_PLAN"
    elif final_score >= 5:
        category = "MEDIUM_RISK"
        action = "SCHEDULE_IN_MONTHLY_PLAN"
    else:
        category = "LOW_RISK"
        action = "ROUTINE_MONITORING"
        
    return {
        "cof": cof,
        "lof": lof,
        "base_risk": base_risk,
        "final_risk_score": final_score,
        "category": category,
        "recommended_action": action
    }
```

### 6.3 Defect Aging Score Exponential Logic (Feature #93)
```python
import math

def calculate_defect_aging_score(base_severity_score: float, overdue_days: int) -> float:
    """
    Overdue sleeping defects gain exponential priority to prevent critical neglect (Feature #93).
    Formula: FinalScore = BaseSeverity * exp(k * min(overdue_days, max_cap_days))
    Damping constant k = 0.035 ensures ~3x escalation at 30 days overdue.
    """
    if overdue_days <= 0:
        return round(base_severity_score, 2)
        
    k = 0.035
    capped_days = min(overdue_days, 60) # Dampening ceiling
    aging_factor = math.exp(k * capped_days)
    
    escalated_score = base_severity_score * aging_factor
    return round(min(100.0, escalated_score), 2)
```

### 6.4 Duplicate Defect Detection & Similarity Matching (Feature #90)
```python
def find_duplicate_defect_candidates(
    new_defect: dict, 
    existing_open_defects: list[dict], 
    distance_threshold_km: float = 0.150 # 150 meters window
) -> list[dict]:
    """
    Detects if a new defect reported from one system (e.g., SMMS) is a duplicate
    of an existing open defect reported by another system (e.g., TMS) (Feature #90).
    """
    candidates = []
    for existing in existing_open_defects:
        # 1. Line and corridor must match
        if (existing['corridor_code'] == new_defect['corridor_code'] and 
            existing['track_line_type'] == new_defect['track_line_type']):
            
            # 2. Distance delta must be within 150 meters
            dist_delta = abs(float(existing['normalized_chainage_km']) - float(new_defect['normalized_chainage_km']))
            if dist_delta <= distance_threshold_km:
                # 3. Calculate spatial-temporal similarity confidence
                confidence_pct = round((1.0 - (dist_delta / distance_threshold_km)) * 100.0, 1)
                candidates.append({
                    "existing_defect_code": existing['defect_code'],
                    "existing_source": existing['source_system'],
                    "new_source": new_defect['source_system'],
                    "distance_delta_meters": round(dist_delta * 1000, 1),
                    "confidence_pct": confidence_pct,
                    "recommended_action": "MERGE_AS_DUPLICATE"
                })
    return candidates
```

---

## 7. Demo Data Specification & SIH Scenario Alignment

### 7.1 Master Asset Seeds (Howrah–Bardhaman Chord Corridor)
সিস্টেমে সিড করা মূল টেস্ট অ্যাসেটসমূহ:

| Asset Tag | Category | Type | Chainage (KM) | Line | TMS/SMMS/TDMS Mapping |
|---|---|---|---|:---:|---|
| `AST-HWH-BWN-DN-KM-22.300` | TRACK_CIVIL | 60KG_UIC_RAIL | 22.300 | DOWN | TMS: `ENG-RAIL-223` |
| `AST-HWH-BWN-DN-KM-39.200` | SIGNAL_TELECOM | POINT_MACHINE_143 | 39.200 | DOWN | SMMS: `SIG-SW-392` |
| `AST-HWH-BWN-UP-KM-45.200` | OHE_TRACTION | OHE_MAST_PORTAL | 45.200 | UP | TDMS: `TRD-PORTAL-452` |
| `AST-HWH-BWN-DN-KM-67.450` | TRACK_CIVIL | TURNOUT_1_IN_12 | 67.450 | DOWN | TMS: `ENG-TO-674` |
| `AST-HWH-BWN-BID-KM-78.100`| BRIDGES | STEEL_GIRDER_BR_42 | 78.100 | REVERSIBLE | TMS: `ENG-BR-781` |

### 7.2 Ingestion Feeds & Freshness Simulation
1. **TMS Feeds:** 15 ট্র্যাক ত্রুটি (যেমন: Weld Kink, Rail Flaw, Corrugation)।
2. **SMMS Feeds:** 6 সিগন্যালিং ত্রুটি (যেমন: Point Detection Timeout, Axle Counter Reset Required)।
3. **TDMS Feeds:** 8 ট্র্যাকশন বিদ্যুৎ ত্রুটি (যেমন: Insulator Flashing, Contact Wire Wear)।
4. **Freshness Mock:** SMMS ফিডকে ২৬ ঘণ্টা পুরনো রেখে **"Yellow Stale Feed Alert"** ট্রিগার করা বিচারকদের সামনে ডেটা কোয়ালিটি গার্ড প্রদর্শনের জন্য।

---

## 8. Next File Dependency Note

> **পরবর্তী ফাইল:** [03-service-blueprints/07-analytics.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/07-analytics.md)

`06-assets.md` (`SVC-AST`) সফলভাবে এবং পুঙ্খানুপুঙ্খভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `07-analytics.md`-এ **Asset Availability Analytics, Variance Auto-Analysis & Reporting Service (`SVC-ANL`)**-এর প্রোডাকশন ব্লুপ্রিন্ট সংজ্ঞায়িত করা হবে, যা সামগ্রিক অ্যাসেট প্রাপ্যতা স্কোর (Feature #50) এবং বৈচিত্র্য বিশ্লেষণ (Feature #109) তৈরি করবে।
