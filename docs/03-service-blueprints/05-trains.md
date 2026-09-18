# 05-trains.md

> **ফাইল ক্রম:** ২১/৪৫  
> **পূর্ববর্তী ফাইল:** [03-service-blueprints/04-ontology.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/04-ontology.md)  
> **পরবর্তী ফাইল:** [03-service-blueprints/06-assets.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/06-assets.md)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে `SVC-TRN` (Train Operations, Timetable & Live Punctuality Engine)-এর প্রোডাকশন আর্কিটেকচার ব্লুপ্রিন্ট সংজ্ঞায়িত করা হয়েছে। এটি COA (Control Office Application) এবং FOIS (Freight Operations Information System)-এর সাথে ইন্টিগ্রেট করে ট্রেনের লাইভ লোকেশন, টাইমটেবিল এবং প্রায়োরিটি ডেটা সরবরাহ করে, যা `SVC-BLK`-এর এআই কনফ্লিক্ট ইঞ্জিনের (AI Conflict Engine) গ্রাউন্ড-ট্রুথ (Ground-Truth) হিসেবে কাজ করে।

---

# SVC-TRN: Train Operations, Timetable & Live Punctuality Service

> **Service ID:** `SVC-TRN`  
> **Bounded Context App:** `apps.trains`  
> **Owning Team:** Train Operations & Timetable Engineering Team  
> **Business Criticality:** `Mission-Critical (Tier 1 - Traffic Data Source)`  
> **Primary SLA:** Availability $\ge 99.95\%$, p95 REST Latency $< 60\text{ ms}$  
> **Execution Runtime:** Gunicorn WSGI (:8000) + Daphne ASGI (:8001) + Celery 5.3 High Priority Queue (`high`)

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission & Railway Mandate
`SVC-TRN` হলো প্যাসেঞ্জার এবং মালবাহী ট্রেনের (Freight Trains) টাইমটেবিল, লাইভ লোকেশন এবং রানিং স্ট্যাটাস ট্র্যাকিং সিস্টেম। এটি COA এবং FOIS থেকে রিয়েল-টাইম ফিড গ্রহণ করে এবং ট্রেনের প্রায়োরিটি ক্যাটাগরি (যেমন- বন্দে ভারত, রাজধানী, এক্সপ্রেস, মালগাড়ি) নির্ধারণ করে। এই ডেটার ওপর ভিত্তি করেই `SVC-BLK`-এর **PriorityScorer** (Expert System AI) সিদ্ধান্ত নেয় কোন ব্লককে স্যাংশন করা হবে এবং কোন ট্রেনকে প্রায়োরিটি দেওয়া হবে।

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - COA এবং FOIS থেকে টাইমটেবিল এবং লাইভ রানিং ডেটা (Live Running Data) ইনজেশন।
  - ট্রেনের প্রায়োরিটি ক্যাটাগরাইজেশন (`PRESTIGE`, `EXPRESS`, `SUBURBAN`, `FREIGHT`)।
  - PostGIS ব্যবহার করে রিয়েল-টাইম স্পেশিয়াল জিওলোকেশন (Spatial Geolocation) ট্র্যাকিং।
  - প্যাসেঞ্জার ও ফ্রেইট ট্রেনের সম্ভাব্য বিলম্ব (Delay cascade) ক্যালকুলেশন।
- **Explicit Exclusions (Out of Scope):**
  - মেইনটেন্যান্স ব্লক বা কনফ্লিক্ট ডিটেকশন (এটি `SVC-BLK` এর দায়িত্ব)।
  - লোকোমোটিভ বা ওয়াগন অ্যাসেট ম্যানেজমেন্ট (এটি `SVC-AST` এর দায়িত্ব)।

---

## 2. Technical Stack & Runtime Topology

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SVC-TRN RUNTIME ARCHITECTURE                                        │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Inbound Traffic: REST API (/api/v1/trains/*) via Gunicorn (:8000) & WebSockets via Daphne (:8001)     │
│  Framework: Django 5.0 + Django REST Framework 3.15                                                    │
│  Database & GIS: PostgreSQL 15 + PostGIS 3.3 (Spatial points for live train locations)                 │
│  Asynchronous Ingestion: Celery 5.3 Worker on Queue: `high` (Polling COA/FOIS APIs)                    │
│  Cache Store: Redis 7.2 (DB 3) - Live Train Geospatial Bounding Box Cache                              │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema & Persistence (PostgreSQL 15 + PostGIS 3.3)

### 3.1 Table Definitions & Data Dictionary

```sql
-- 1. Master Train Catalog
CREATE TABLE trains_train (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    train_number VARCHAR(10) NOT NULL UNIQUE,
    train_name VARCHAR(150) NOT NULL,
    train_type VARCHAR(30) NOT NULL DEFAULT 'EXPRESS', -- PRESTIGE, EXPRESS, SUBURBAN, FREIGHT
    priority_rank INT NOT NULL DEFAULT 100, -- Lower number = Higher priority (e.g. Vande Bharat = 1)
    
    source_station VARCHAR(20) NOT NULL,
    destination_station VARCHAR(20) NOT NULL,
    is_daily BOOLEAN NOT NULL DEFAULT TRUE,
    operating_days_mask VARCHAR(7) NOT NULL DEFAULT '1111111', -- MTWTFSS
    
    traction_type VARCHAR(20) NOT NULL DEFAULT 'ELECTRIC',
    max_speed_kmh INT NOT NULL DEFAULT 130,
    length_meters NUMERIC(7, 2) NOT NULL DEFAULT 650.00,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Scheduled Station Stoppages & Timetables
CREATE TABLE trains_trainschedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    train_id UUID NOT NULL,
    station_code VARCHAR(20) NOT NULL,
    station_sequence INT NOT NULL,
    
    scheduled_arrival_time TIME NULL,
    scheduled_departure_time TIME NOT NULL,
    platform_number VARCHAR(10) NULL,
    km_milestone NUMERIC(8, 3) NOT NULL,
    
    CONSTRAINT fk_schedule_train FOREIGN KEY (train_id) 
        REFERENCES trains_train(id) ON DELETE CASCADE,
    UNIQUE (train_id, station_sequence)
);

-- 3. Real-Time Live Running Status (PostGIS Enabled)
CREATE TABLE trains_livelocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    train_id UUID NOT NULL,
    journey_date DATE NOT NULL,
    
    current_station_code VARCHAR(20) NOT NULL,
    current_km NUMERIC(8, 3) NOT NULL,
    
    -- PostGIS Exact Live Location Point
    current_location GEOMETRY(Point, 4326) NULL,
    
    delay_minutes INT NOT NULL DEFAULT 0,
    speed_kmh NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    last_reported_at TIMESTAMPTZ NOT NULL,
    
    CONSTRAINT fk_live_train FOREIGN KEY (train_id) 
        REFERENCES trains_train(id) ON DELETE CASCADE,
    UNIQUE (train_id, journey_date)
);
```

### 3.2 Spatial Indexing
```sql
CREATE INDEX idx_trains_livelocation_geom ON trains_livelocation USING GIST (current_location);
CREATE INDEX idx_trains_type_priority ON trains_train (train_type, priority_rank);
```

---

## 4. API Endpoints Specification

| Method | Endpoint Route | Auth & RBAC | Payload / Params | Response DTO | SLA Target |
|---|---|---|---|---|:---:|
| `GET` | `/api/v1/trains/` | Authenticated | `?type=PRESTIGE` | Paginated Train List | p95 < 50ms |
| `GET` | `/api/v1/trains/{number}/schedule/` | Authenticated | URL UUID Parameter | Timetable Schedule DTO | p95 < 40ms |
| `GET` | `/api/v1/trains/live/` | Authenticated | `?delay_greater_than=15` | Live Status & PostGIS GeoJSON | p95 < 50ms |
| `POST`| `/api/v1/trains/ingest-coa/`| `SYSTEM_API` | External COA API JSON | Bulk Update Live Status | p95 < 150ms |

---

## 5. Event-Driven Contracts & Integrations

### 5.1 Published Events (Redis Outbox -> `SVC-BLK`)
যখন একটি ট্রেনের লাইভ লোকেশন আপডেট হয় বা বড় ধরনের বিলম্ব (Delay) ধরা পড়ে, তখন এটি ইভেন্ট পাবলিশ করে যা `SVC-BLK`-এর `ResolutionEngine`-কে অ্যালার্ট করতে পারে।

```json
{
  "event_id": "f10928bb-7811-4de2-9844-012984501234",
  "event_type": "trains.live.updated",
  "timestamp": "2026-09-18T10:25:00.000Z",
  "payload": {
    "train_number": "22436",
    "train_name": "Vande Bharat Express",
    "journey_date": "2026-09-18",
    "current_km": 28.5,
    "delay_minutes": 5,
    "current_location": {"type": "Point", "coordinates": [77.2167, 28.6139]}
  }
}
```

---

## 6. Next File Dependency Note

> **পরবর্তী ফাইল:** [03-service-blueprints/06-assets.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/06-assets.md)

`05-trains.md` (`SVC-TRN`) সম্পূর্ণ প্রস্তুত। পরবর্তী ফাইল `06-assets.md`-এ **Locomotive & Infrastructure Asset Management Service (`SVC-AST`)**-এর প্রোডাকশন ব্লুপ্রিন্ট সংজ্ঞায়িত করা হবে।
