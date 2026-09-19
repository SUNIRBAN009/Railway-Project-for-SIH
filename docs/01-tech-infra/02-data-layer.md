# 02-data-layer.md

> **ফাইল ক্রম:** ৬/৪৫  
> **ডিরেক্টরি:** `01-tech-infra/`  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/01-frontend-core.md` (ক্লায়েন্ট স্টেট, কুয়েরি কি ও জিআইএস লেয়ার)  
> **পরবর্তী ফাইল:** `01-tech-infra/03-event-brokers.md` (Redis পাব/সাব ও চ্যানেলস ইভেন্ট স্ট্রিম)  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ৪টি মূল স্তম্ভ, ১৫টি সেফটি ফিচার) এবং `ai-project-spec-generator (1).md`।  
> **ডাটাবেস নীতি:** সম্পূর্ণ সিস্টেমে **PostgreSQL 15/16 + PostGIS 3.3 (SRID 4326/3857)** ব্যবহৃত হচ্ছে (কোনো MySQL নয়)।

---

## 1. Database Selection Matrix & CAP Theorem Position

| Database Technology | CAP Theorem Position | Core Operational Responsibility | Justification & Architectural Fit | Rejected Alternative |
|:---|:---:|:---|:---|:---|
| **PostgreSQL 15/16 + PostGIS 3.3** | **CP** (Consistency + Partition Tolerance) | প্রাইমারি রিলেশনাল ও স্থানিক (Spatial) ডেটাবেস | রেলওয়ে ট্র্যাক চেইনেজ, সেকশন লাইনস্ট্রিং জিওমেট্রি, GiST স্প্যাশিয়াল ইনডেক্সিং এবং কঠোর ACID ট্রানজ্যাকশন অখণ্ডতা। | **MySQL 8.0:** PostGIS-এর মতো উন্নত লিনিয়ার রেফারেন্সিং (LRS) ও `ST_Intersects` স্থানিক বিশ্লেষণ নেই। |
| **Redis 7 (Alpine)** | **AP** (Availability + Partition Tolerance) | ইন-মেমোরি ক্যাশ, পাব/সাব, সেশন ও Celery ব্রোকার | সাব-মিলিসেকেন্ড ল্যাটেন্সি, কি-লেভেল টিটিএল (TTL), Django Channels চ্যানেল লেয়ার ও ডিস্ট্রিবিউটেড লক। | **Memcached:** শুধুমাত্র কি-ভ্যালু ক্যাশ; পাব/সাব মেসেজিং বা জটিল ডেটা স্ট্রাকচার নেই। |
| **SQLite (Owlready2 Quadstore)** | **CP** | সিম্বলিক নলেজ গ্রাফ ও HermiT রিজনার স্টোর | পাইথনের লোকাল মেমোরি-ম্যাপড ফাইল-ভিত্তিক RDF কোয়াডস্টোর, জিরো নেটওয়ার্ক ওভারহেড ও ডেসক্রিপশন লজিক রিজনিং। | **Neo4j:** প্রপার্টি গ্রাফ; নেটিভ OWL 2 DL সেমান্টিক ইন্টারঅপারেবিলিটি এবং HermiT রিজনার সাপোর্ট নেই। |

---

## 2. Master Entity Relationship Diagram (ASCII ERD)

```text
┌───────────────────────────┐         ┌───────────────────────────┐         ┌───────────────────────────┐
│     core_station          │         │       core_section        │         │   maintenance_defectlog   │
├───────────────────────────┤         ├───────────────────────────┤         ├───────────────────────────┤
│ id (PK, UUID)             │         │ id (PK, UUID)             │◄────────│ id (PK, UUID)             │
│ code (UQ, VARCHAR(10))    │◄───┐    │ section_code (UQ)         │         │ source_system (TMS/SMMS)  │
│ name (VARCHAR(100))       │    │    │ from_station_id (FK)      │──────┐  │ defect_type (VARCHAR(50)) │
│ division (VARCHAR(50))    │    └───┼│ to_station_id (FK)        │      │  │ section_id (FK)           │
│ location (Point, 4326)    │        │ line_type (UP/DN/SL)       │      │  │ chainage_km (DECIMAL)     │
│ created_at (TIMESTAMPTZ)  │         │ start_km, end_km          │      │  │ lof (1-5), cof (1-5)      │
└───────────────────────────┘         │ geom (LineString, 4326)   │      │  │ defect_aging_days (INT)   │
                                      │ max_speed_kmph (INT)      │      │  │ is_resolved (BOOLEAN)     │
                                      │ current_status (STATUS)   │      │  └───────────────────────────┘
                                      └─────────────┬─────────────┘      │
                                                    │                    │
                                                    ▼                    │
┌───────────────────────────┐         ┌───────────────────────────┐      │  ┌───────────────────────────┐
│  blocks_combinedwindow    │         │   blocks_blockrequest     │      │  │    departments_gang       │
│  (Feature #98 Core USP)   │         ├───────────────────────────┤      │  ├───────────────────────────┤
├───────────────────────────┤         │ id (PK, UUID)             │      │  │ id (PK, UUID)             │
│ id (PK, UUID)             │◄────────│ combined_window_id (FK)   │      │  │ gang_code (UQ)            │
│ window_code (UQ)          │         │ request_code (UQ)         │      │  │ department (ENGG/TRD/SNT) │
│ section_id (FK)           │────────►│ section_id (FK)           │◄─────┘  │ home_base_station_id (FK) │
│ start_time (TIMESTAMPTZ)  │         │ department (ENGG/TRD/SNT) │         │ headcount (INT)           │
│ end_time (TIMESTAMPTZ)    │         │ work_type (TAMPING/OHE..) │         │ current_section_id (FK)   │
│ total_shadow_savings_mins │         │ start_time, end_time      │         └─────────────┬─────────────┘
│ participating_depts(JSONB)│         │ priority_score (DECIMAL)  │                       │
│ sanction_pdf_path (TEXT)  │         │ cof_score, lof_score      │                       │
│ status (APPROVED/ACTIVE)  │         │ status (PENDING/APPROVED) │◄──────────────────────┘
└───────────────────────────┘         │ is_combined (BOOLEAN)     │
                                      │ digital_token_hash (TEXT) │
                                      │ requester_id (FK)         │
                                      │ approved_by_id (FK)       │
                                      └─────────────┬─────────────┘
                                                    │
                                                    ▼
┌───────────────────────────┐         ┌───────────────────────────┐         ┌───────────────────────────┐
│   safety_digitaltoken     │         │   safety_permittowork     │         │   trains_trainlivestatus  │
│   (Feature #71 Token)     │         │   (Feature #84 PTW)       │         │   (Feature #114 / #116)   │
├───────────────────────────┤         ├───────────────────────────┤         ├───────────────────────────┤
│ id (PK, UUID)             │         │ id (PK, UUID)             │         │ id (PK, UUID)             │
│ token_code (UQ)           │         │ ptw_number (UQ)           │         │ train_no (UQ, VARCHAR(10))│
│ block_id (FK, 1-to-1)     │◄────────│ block_id (FK, 1-to-1)     │         │ train_name (VARCHAR(100)) │
│ issued_to_gang_id (FK)    │         │ ohe_power_isolated (BOOL) │         │ current_section_id (FK)   │
│ issued_by_controller (FK) │         │ loto_verified (BOOL)      │         │ delay_minutes (INT)       │
│ handover_time             │         │ weather_checked (BOOL)    │         │ schedule_deviation (BOOL) │
│ section_cleared_time      │         │ crew_headcount_verified   │         │ last_ntes_sync (TIME)     │
│ clearance_cert_no (#80)   │         │ safety_score_granted (#85)│         │ speed_kmph (DECIMAL)      │
└───────────────────────────┘         └───────────────────────────┘         └───────────────────────────┘
```

---

## 3. PostgreSQL 15 + PostGIS 3.3 Production Schemas (DDL)

### 3.1 Extensions ও কাস্টম ডোমেন ইনিশিয়ালাইজেশন
```sql
-- scripts/init_postgres.sh দ্বারা চালিত
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- কাস্টম ট্র্যাফিক স্ট্যাটাস টাইপস
CREATE TYPE section_traffic_status AS ENUM ('FREE', 'BLOCKED', 'COMBINED_BLOCK', 'CAUTION_TSR');
CREATE TYPE department_code AS ENUM ('ENGG', 'TRD', 'SNT', 'OPERATIONS', 'SAFETY');
CREATE TYPE block_lifecycle_status AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'CLEARED', 'CANCELLED', 'REJECTED');
```

---

### 3.2 টেবিল: `core_section` (রেলওয়ে করিডোর ও ট্র্যাক জিওমেট্রি)
```sql
CREATE TABLE core_section (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_code VARCHAR(50) NOT NULL UNIQUE,
    from_station_id UUID NOT NULL REFERENCES core_station(id) ON DELETE RESTRICT,
    to_station_id UUID NOT NULL REFERENCES core_station(id) ON DELETE RESTRICT,
    division VARCHAR(50) NOT NULL, -- HOWRAH, SEALDAH, KHARAGPUR, ASANSOL
    line_type VARCHAR(10) NOT NULL DEFAULT 'UP', -- UP, DN, SINGLE, CHORD
    start_chainage_km NUMERIC(8, 3) NOT NULL,    -- যেমন: 15.200
    end_chainage_km NUMERIC(8, 3) NOT NULL,      -- যেমন: 32.500
    geom GEOMETRY(LineString, 4326) NOT NULL,    -- PostGIS স্থানিক ট্র্যাক রেখা
    max_speed_kmph INTEGER NOT NULL DEFAULT 130,
    current_status section_traffic_status NOT NULL DEFAULT 'FREE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- স্প্যাশিয়াল ও কম্পোজিট ইনডেক্স
CREATE INDEX idx_section_geom ON core_section USING GIST(geom);
CREATE INDEX idx_section_division ON core_section(division);
CREATE INDEX idx_section_status ON core_section(current_status);
```

---

### 3.3 টেবিল: `blocks_combinedwindow` (Feature #98 Core USP)
```sql
CREATE TABLE blocks_combinedwindow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    window_code VARCHAR(50) NOT NULL UNIQUE,     -- যেমন: COMB-HWH-20260918-01
    section_id UUID NOT NULL REFERENCES core_section(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    total_shadow_savings_mins INTEGER NOT NULL DEFAULT 0, -- ট্রেনের বাঁচানো সময়
    participating_depts JSONB NOT NULL,                   -- ["ENGG", "TRD", "SNT"]
    sanction_order_pdf TEXT NULL,                         -- জেনারেট হওয়া PDF পাথ (#107)
    status block_lifecycle_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_combined_section_time ON blocks_combinedwindow(section_id, start_time, end_time);
CREATE INDEX idx_combined_status ON blocks_combinedwindow(status);
```

---

### 3.4 টেবিল: `blocks_blockrequest` (মাস্টার ব্লক শিডিউল)
```sql
CREATE TABLE blocks_blockrequest (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_code VARCHAR(50) NOT NULL UNIQUE,    -- যেমন: BLK-20260918-042
    combined_window_id UUID NULL REFERENCES blocks_combinedwindow(id) ON DELETE SET NULL,
    section_id UUID NOT NULL REFERENCES core_section(id) ON DELETE RESTRICT,
    department department_code NOT NULL,
    work_type VARCHAR(100) NOT NULL,             -- TRACK_TAMPING, OHE_INSPECTION, POINT_MACHINE
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    start_km NUMERIC(8, 3) NOT NULL,
    end_km NUMERIC(8, 3) NOT NULL,
    priority_score NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    cof_score INTEGER NOT NULL CHECK (cof_score BETWEEN 1 AND 5), -- Consequence of Failure
    lof_score INTEGER NOT NULL CHECK (lof_score BETWEEN 1 AND 5), -- Likelihood of Failure
    is_combined BOOLEAN NOT NULL DEFAULT FALSE,
    digital_token_hash VARCHAR(64) NULL,
    status block_lifecycle_status NOT NULL DEFAULT 'SUBMITTED',
    requester_id UUID NOT NULL REFERENCES accounts_user(id) ON DELETE RESTRICT,
    approved_by_id UUID NULL REFERENCES accounts_user(id) ON DELETE RESTRICT,
    emergency_override BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_time_window CHECK (end_time > start_time),
    CONSTRAINT chk_chainage CHECK (end_km >= start_km)
);

-- কনফ্লিক্ট ডিটেকশনের জন্য কম্পোজিট ইনডেক্স
CREATE INDEX idx_blocks_section_times ON blocks_blockrequest(section_id, start_time, end_time);
CREATE INDEX idx_blocks_status_dept ON blocks_blockrequest(status, department);
CREATE INDEX idx_blocks_priority ON blocks_blockrequest(priority_score DESC);
```

---

### 3.5 টেবিল: `safety_digitaltoken` (Feature #71 - Digital Token)
```sql
CREATE TABLE safety_digitaltoken (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_code VARCHAR(64) NOT NULL UNIQUE,       -- ক্রিপ্টোগ্রাফিক টোকেন স্ট্রিং
    block_id UUID NOT NULL UNIQUE REFERENCES blocks_blockrequest(id) ON DELETE CASCADE,
    issued_to_gang_id UUID NOT NULL REFERENCES departments_gang(id) ON DELETE RESTRICT,
    issued_by_controller_id UUID NOT NULL REFERENCES accounts_user(id) ON DELETE RESTRICT,
    handover_time TIMESTAMPTZ NOT NULL,
    section_cleared_time TIMESTAMPTZ NULL,
    clearance_cert_no VARCHAR(50) NULL,           -- Feature #80 Section Clearance
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_active ON safety_digitaltoken(token_code, is_active);
```

---

### 3.6 টেবিল: `safety_permittowork` (Feature #84 - PTW & Safety Gates)
```sql
CREATE TABLE safety_permittowork (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ptw_number VARCHAR(50) NOT NULL UNIQUE,
    block_id UUID NOT NULL UNIQUE REFERENCES blocks_blockrequest(id) ON DELETE CASCADE,
    ohe_power_isolated BOOLEAN NOT NULL DEFAULT FALSE,  -- Feature #73
    loto_verified BOOLEAN NOT NULL DEFAULT FALSE,       -- Feature #74
    weather_checked BOOLEAN NOT NULL DEFAULT FALSE,     -- Feature #75
    crew_headcount_verified INTEGER NOT NULL DEFAULT 0, -- Feature #72
    tool_count_verified INTEGER NOT NULL DEFAULT 0,     -- Feature #81
    digital_tbt_completed BOOLEAN NOT NULL DEFAULT FALSE,-- Feature #83
    safety_score_granted NUMERIC(4, 2) NOT NULL DEFAULT 100.00, -- Feature #85
    approved_by_safety_officer_id UUID NOT NULL REFERENCES accounts_user(id) ON DELETE RESTRICT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.7 টেবিল: `maintenance_defectlog` (TMS, SMMS, TDMS Ingestion)
```sql
CREATE TABLE maintenance_defectlog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system VARCHAR(10) NOT NULL,           -- TMS, SMMS, TDMS
    defect_code VARCHAR(50) NOT NULL,
    section_id UUID NOT NULL REFERENCES core_section(id) ON DELETE CASCADE,
    chainage_km NUMERIC(8, 3) NOT NULL,
    defect_type VARCHAR(100) NOT NULL,            -- FRACTURE, POINT_SLACK, CATENARY_SAG
    lof INTEGER NOT NULL CHECK (lof BETWEEN 1 AND 5),
    cof INTEGER NOT NULL CHECK (cof BETWEEN 1 AND 5),
    defect_aging_days INTEGER NOT NULL DEFAULT 0, -- Feature #93
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_defect_aging ON maintenance_defectlog(is_resolved, defect_aging_days DESC);
CREATE INDEX idx_defect_system ON maintenance_defectlog(source_system, section_id);
```

---

### 3.8 টেবিল: `trains_trainlivestatus` (NTES Live Delays & Delays Cascade #115, #116)
```sql
CREATE TABLE trains_trainlivestatus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_no VARCHAR(10) NOT NULL UNIQUE,         -- 12301, 12305, 13011
    train_name VARCHAR(100) NOT NULL,
    priority_class VARCHAR(20) NOT NULL,          -- RAJDHANI, EXPRESS, PASSENGER, FREIGHT
    current_section_id UUID NULL REFERENCES core_section(id) ON DELETE SET NULL,
    delay_minutes INTEGER NOT NULL DEFAULT 0,
    schedule_deviation_detected BOOLEAN NOT NULL DEFAULT FALSE, -- Feature #116
    last_ntes_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    speed_kmph NUMERIC(5, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX idx_train_deviation ON trains_trainlivestatus(schedule_deviation_detected, delay_minutes);
```

---

## 4. PostGIS Spatial Operations & Queries

সিস্টেমের মূল সেফটি ও কনফ্লিক্ট যাচাই সরাসরি পোস্টজিআইএস ফাংশন দিয়ে সম্পাদিত হয়:

### 4.1 দুটি কাজের মধ্যে স্থানিক ইন্টারসেকশন শনাক্তকরণ (`ST_Intersects`)
```sql
-- চেক করা হচ্ছে যে নতুন প্রস্তাবিত ব্লকের স্থানিক রেখা কোনো বিদ্যমান ব্লকের লাইনে পড়ে কিনা
SELECT r.request_code, r.department, r.start_time, r.end_time
FROM blocks_blockrequest r
JOIN core_section s ON r.section_id = s.id
WHERE s.id = :target_section_id
  AND r.status IN ('APPROVED', 'ACTIVE')
  AND (r.start_time, r.end_time) OVERLAPS (:new_start, :new_end)
  AND ST_Intersects(
      s.geom,
      ST_Buffer(ST_LineSubstring(s.geom, :start_ratio, :end_ratio), 0.0001)
  );
```

### 4.2 লাইভ ট্রেনের নিকটবর্তী বিপজ্জনক কাজের বাফার নির্ণয় (`ST_DWithin`)
```sql
-- ট্রেনের বর্তমান কোঅর্ডিনেট থেকে ৫০০ মিটারের ভেতর কোনো সক্রিয় ব্লক বা গ্যাং উপস্থিত কিনা
SELECT b.request_code, g.gang_code
FROM blocks_blockrequest b
JOIN core_section s ON b.section_id = s.id
JOIN departments_gang g ON b.id = g.current_block_id
WHERE b.status = 'ACTIVE'
  AND ST_DWithin(
      s.geom::geography,
      ST_SetSRID(ST_MakePoint(:train_lon, :train_lat), 4326)::geography,
      500 -- 500 Meters Safety Perimeter
  );
```

---

## 5. Redis Caching & In-Memory Key Design

| Key Pattern | Data Structure | TTL | Invalidation Trigger | Architectural Purpose |
|:---|:---:|:---:|:---|:---|
| `railway:block:active:list` | Redis Set / JSON | ৬০ সেকেন্ড | ব্লক অনুমোদন বা সমাপ্তি | কন্ট্রোল রুম ম্যাপে ব্লকের লাল/সবুজ স্ট্যাটাস দ্রুত লোড |
| `railway:section:status:{id}`| String (ENUM) | ১২০ সেকেন্ড | ওয়েবসকেট ইভেন্ট | করিডোর খালি নাকি ব্লক তা অতি-দ্রুত নির্ধারণ |
| `railway:token:hash:{token}` | String (User/Gang) | ব্লকের স্থায়িত্ব | সেকশন ক্লিয়ারেন্স (#80) | ফিল্ড স্টাফের ডিজিটাল টোকেন ভেরিফিকেশন |
| `railway:train:live:{train_no}`| Hash | ৩০ সেকেন্ড | NTES স্ট্রিম আপডেট | ট্রেনের বর্তমান লেট ও স্পিড ক্যাশিং |
| `railway:lock:block:{sec_id}`| String (Distributed Lock)| ১০ সেকেন্ড | ট্রানজ্যাকশন কমিট | একই সেকশনে ডাবল ব্লক বুকিং রোধ (Race Condition) |

---

## 6. Migration, Backup & Disaster Recovery (DR)

### 6.1 মাইগ্রেশন নীতি (Django GeoDjango)
- تمام ডেটাবেস স্কিমা পরিবর্তন Django-র `makemigrations` কমান্ড দিয়ে নিয়ন্ত্রিত।
- প্রোডাকশন ডেপ্লয়মেন্টের সময় `entrypoint.sh` স্ক্রিপ্ট স্বয়ংক্রিয়ভাবে `python manage.py migrate --noinput` সম্পন্ন করে।
- কোনো ব্রেকিং চেঞ্জের ক্ষেত্রে কলাম রিনেম না করে নতুন কলাম যোগ করে ব্যাকওয়ার্ড কম্প্যাটিবিলিটি বজায় রাখা হয়।

### 6.2 ব্যাকআপ ও ডিজাস্টার রিকভারি SLA
- **Recovery Point Objective (RPO):** < ১৫ মিনিট (PostgreSQL Write-Ahead Logging / WAL আর্কার্ভিং)।
- **Recovery Time Objective (RTO):** < ৫ মিনিট (স্বয়ংক্রিয় ডকার কন্টেইনার ফেইলওভার ও হেলথচেক)।
- **ব্যাকআপ রুটিন:** প্রতিদিন রাত ০২:০০ টায় স্বয়ংক্রিয় `pg_dump` সম্পন্ন হয়ে এনক্রিপ্টেড ব্যাকআপ ভলিউমে সংরক্ষিত হয়।

---

## 7. Connection Pooling

| Environment | Tool | Max Pool Connections | Idle Timeout | Min Spare Connections |
|:---|:---:|:---:|:---:|:---:|
| **Local Development** | Django Persistent Conn | ২০ | ৩০০ সেকেন্ড | ৫ |
| **Production / Cloud VM** | PgBouncer (Transaction Mode)| ১০০ | ৬০ সেকেন্ড | ২০ |

---

## 8. Traceability to Subsequent Infrastructure Documents

| Target Document | Direct Dependency from Data Layer |
|:---|:---|
| **`01-tech-infra/03-event-brokers.md`** | ডেটাবেসের টেবিল পরিবর্তন (`post_save`) থেকে Redis পাব/সাব চ্যানেলে ইভেন্ট ডিসপ্যাচ। |
| **`03-service-blueprints/01-block-planning-service.md`** | `blocks_blockrequest` ও `blocks_combinedwindow` স্কিমার ওপর ভিত্তি করে সার্ভিস মেথড। |
| **`03-service-blueprints/04-safety-compliance-service.md`** | `safety_digitaltoken` ও `safety_permittowork` টেবিলের ওপর ভিত্তি করে সেফটি ওয়ার্কফ্লো। |
