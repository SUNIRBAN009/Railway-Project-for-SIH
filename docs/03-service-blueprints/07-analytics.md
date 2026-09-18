# 07-analytics.md

> **ফাইল ক্রম:** ২৩/৪৫  
> **পূর্ববর্তী ফাইল:** [03-service-blueprints/06-assets.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/06-assets.md) (`SVC-AST`: Locomotive, Rolling Stock & Track Asset Management Service)  
> **পরবর্তী ফাইল:** [03-service-blueprints/08-notifications.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/08-notifications.md) (`SVC-NOTIF`: Critical Safety Broadcast, SOS Emergency & Multi-Channel Alert Service)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের এক্সিকিউটিভ ইন্টেলিজেন্স ও রিপোর্টিং ইঞ্জিন **`SVC-ANL` (Asset Availability Analytics, Variance Auto-Analysis & Reporting Service)**-এর পূর্ণাঙ্গ প্রোডাকশন আর্কিটেকচার ব্লুপ্রিন্ট সংজ্ঞায়িত করা হয়েছে। এটি প্ল্যাটফর্মের প্রাথমিক সাফল্য পরিমাপক—**অ্যাসেট অ্যাভেইলেবিলিটি স্কোর (Asset Availability Score #50)**, সাপ্তাহিক ও মাসিক প্ল্যানের কার্যকারিতা বিশ্লেষণ (`Plan Variance Auto-Analysis #109`), ব্লক ইউটিলাইজেশন ড্যাশবোর্ড (`#49`), অফিশিয়াল স্যাংশন অর্ডার পিডিএফ জেনারেটর (`#107`), এবং অপরিবর্তনীয় অডিট ট্রেইল (`#67`) পরিচালনা করে।

---

# SVC-ANL: Asset Availability Analytics, Variance Auto-Analysis & Reporting Service

> **Service ID:** `SVC-ANL`  
> **Bounded Context App:** `apps.analytics`  
> **Owning Team:** Railway Operations Intelligence, Business Analytics & Reporting Team  
> **Business Criticality:** `Operational-Core (Executive Decision Support, Regulatory Audit & Primary Success Metric Guard)`  
> **Primary SLA:** Availability $\ge 99.95\%$, p95 Dashboard KPI Queries $< 60\text{ ms}$, p95 PDF Report Generation $< 1200\text{ ms}$  
> **Execution Runtime:** Gunicorn WSGI (:8000) + Celery 5.3 Batch Rollup Worker Queue (`analytics`)

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission & Railway Mandate
স্মার্ট ইন্ডিয়া হ্যাকাথনের মূল প্রবলেম স্টেটমেন্টের (PS26027) শিরোনামই হলো: **"AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways"**। সুতরাং প্ল্যাটফর্মটির সবচেয়ে গুরুত্বপূর্ণ সাফল্যের প্রমাণপত্র (Primary Success Metric) হলো এই অ্যানালিটিক্স সার্ভিসের মাধ্যমে গণনা করা **অ্যাসেট প্রাপ্যতা স্কোর (Asset Availability Score)**।

`SVC-ANL`-এর মূল দায়িত্ব হলো:
1. **অ্যাসেট অ্যাভেইলেবিলিটি স্কোরিং (Asset Availability Score #50):** প্রতিটি সেকশন ও করিডোরের মোট কার্যক্ষম ঘণ্টার বিপরীতে ডাউনটাইম বাদ দিয়ে সার্বিক প্রাপ্যতা শতাংশ ($A = 1 - \frac{\text{Downtime Hours}}{\text{Total Hours}}$) নির্ণয় করা এবং ট্রেন্ড প্রদর্শন করা।
2. **প্ল্যান ভ্যারিয়েন্স অটো-অ্যানালাইসিস (Plan Variance Auto-Analysis #109):** প্রতি সপ্তাহের "পরিকল্পিত বনাম বাস্তবায়িত" (Planned vs Actual) ব্লকের পার্থক্যের মূল কারণ (যেমন: বৃষ্টি, মালামাল দেরিতে পৌঁছানো, ক্রু সংকট, ট্রাফিক ক্যান্সেলেশন) ১-ট্যাপ রিজন কোডের মাধ্যমে বিশ্লেষণ করে কন্টিনিউয়াস ইম্প্রুভমেন্ট ফিডব্যাক লুপ তৈরি করা।
3. **ব্লক ইউটিলাইজেশন ড্যাশবোর্ড (Block Utilization Dashboard #49):** স্যাংশন করা সময়ের কতটা ফলপ্রসূভাবে কাজে লেগেছে এবং কতটা নষ্ট (Wasted) হয়েছে তার ট্র্যাকিং ($U = \frac{T_{\text{actual}}}{T_{\text{sanctioned}}}$)।
4. **অটোমেটেড ডেইলি ও উইকলি রিপোর্ট (Automated Daily Report #53):** ডিভিশনাল রেলওয়ে ম্যানেজার (DRM) এবং প্রিন্সিপাল চিফ অপারেশনস ম্যানেজারের (PCOM) জন্য স্বয়ংক্রিয় কার্যবিবরণী পিডিএফ তৈরি ও ইমেল প্রেরণ।
5. **অফিশিয়াল স্যাংশন অর্ডার পিডিএফ (Sanction Order PDF Generator #107):** অনুমোদিত সাপ্তাহিক/মাসিক ব্লকের অফিশিয়াল ভারতীয় রেলওয়ে ফরম্যাটে ডিজিটাল সাইন-রেডি স্যাংশন লেটার প্রস্তুতকরণ।
6. **অপরিবর্তনীয় অডিট ট্রেইল (Audit Trail & Compliance Log #67):** কে কখন কোন ব্লক অনুমোদন, পরিবর্তন বা ওভাররাইড করেছে তার ক্রিপ্টোগ্রাফিক টাইমস্ট্যাম্পযুক্ত অপরিবর্তনীয় রেকর্ড রাখা।
7. **হোয়াট-ইফ সিনারিও সিমুলেটর (What-If Scenario Simulator #62):** প্ল্যাটফর্মে সিদ্ধান্ত চূড়ান্ত করার পূর্বে স্যান্ডবক্সে পরীক্ষা করা: "এই ব্লকটি বৃহস্পতিবার দুপুরে সরালে ট্রাফিক ও অ্যাসেট প্রাপ্যতায় কী প্রভাব পড়বে?"

#### Problem Statement PS26027 Alignment:
- [x] **Primary Success Metric:** Asset Availability Score (Feature #50) — প্ল্যাটফর্ম চালুর পূর্বে ৭৮% বনাম প্ল্যাটফর্মের পর ৯৪%+ কার্যক্ষমতার তুলনামূলক গ্রাফ।
- [x] **Point 3 — Optimization:** Block Utilization Dashboard (Feature #49), Multi-Department Co-Possession Metric (Feature #98 Integration), এবং Backlog Burn-down Chart (Feature #96)।
- [x] **Point 4 — Multi-Horizon Planning & Reporting:** Plan Variance Auto-Analysis (Feature #109), Automated Daily Report (Feature #53), Sanction Order PDF Generator (Feature #107), এবং Approval SLA Tracker (Feature #63)।

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - হিস্টোরিক্যাল ব্লক ও ট্রাফিক এক্সিকিউশন ডেটা থেকে ওএলএপি (OLAP) ডেইল ও উইকলি অ্যাগ্রিগেশন।
  - অ্যাসেট প্রাপ্যতা স্কোর ($A$), ইউটিলাইজেশন রেট ($U$), এবং ভ্যারিয়েন্স রুট-কজ বিশ্লেষণ।
  - রিপোর্ট ও অফিসিয়াল স্যাংশন পিডিএফ জেনারেশন (ReportLab / WeasyPrint ইঞ্জিন)।
  - অপরিবর্তনীয় অডিট ট্রেইল লগিং (`analytics_audit_trail`)।
  - স্যান্ডবক্স সিমুলেশন ও ডিসিশন ইমপ্যাক্ট প্রেডিকশন।
- **Explicit Exclusions (Out of Scope):**
  - লাইভ ট্রানজ্যাকশনাল ব্লক স্যাংশনিং ও ইন্টারলকিং ভ্যালিডেশন (ম্যানেজ করে `SVC-BLK`)।
  - লাইভ ট্রেন ট্র্যাকিং ও জিওস্পেশিয়াল পয়েন্ট ক্যালকুলেশন (ম্যানেজ করে `SVC-TRN`)।
  - এসএমএস বা পুশ নোটিফিকেশন ডেলিভারি পাইপলাইন (ম্যানেজ করে `SVC-NOTIF`)।

---

## 2. Technical Stack & Infrastructure Runtime

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SVC-ANL RUNTIME TOPOLOGY                                             │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Inbound Queries: Gunicorn WSGI (:8000) -> /api/v1/analytics/*                                         │
│  Framework: Django 5.0.3 + Django REST Framework 3.15.1                                                │
│  Data Warehouse & Marts: PostgreSQL 15.6 (TimescaleDB / Hypertable-ready, Window Aggregate Functions)   │
│  Scientific Analytics: Pandas 2.2 + NumPy 1.26 (Root Cause Clustering, Trend Regressions)              │
│  Document Generation Engine: WeasyPrint 61.2 + ReportLab 4.1 (Railway Standard PDF Templates)          │
│  In-Memory KPI Cache: Redis 7.2.4 (DB 7: Executive KPI Cards, TTL = 15 Minutes)                         │
│  Rollup Worker Queue: Celery 5.3.6 Worker on Queue: `analytics` (Nightly/Hourly Rollup Tasks)           │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| উপাদান | প্রযুক্তি | সংস্করণ | উদ্দেশ্য ও কার্যকারিতা |
|---|---|---|---|
| **Programming Language** | Python | 3.11.8 | ওএলএপি কুয়েরি প্রসেসিং ও পিডিএফ জেনারেশন |
| **Backend Framework** | Django + DRF | 5.0.3 / 3.15.1 | রেস্ট কন্ট্রোলার, রোল-বেসড অ্যানালিটিক্স অ্যাক্সেস |
| **Database Engine** | PostgreSQL | 15.6 | হাইপার-ফাস্ট টাইম-সিরিজ উইন্ডো ফাংশন ও JSONB এগ্রিগেশন |
| **Document Compiler** | WeasyPrint / ReportLab | 61.2 / 4.1 | ভারতীয় রেলওয়ের স্ট্যান্ডার্ড ফরম্যাটের স্যাংশন অর্ডার ও ডেইলি রিপোর্ট পিডিএফ |
| **Data Engine** | Pandas & NumPy | 2.2 / 1.26 | ভ্যারিয়েন্স রুট-কজ বিশ্লেষণ এবং রিগ্রেশন ট্রেন্ড লাইন |
| **In-Memory Store** | Redis | 7.2.4 (DB 7) | এক্সিকিউটিভ ড্যাশবোর্ড কেপিআই কার্ড ক্যাশিং (TTL = ১৫ মিনিট) |
| **Background Queue** | Celery Beat | 5.3.6 | মধ্যরাতে ও প্রতি ঘণ্টার শেষে কেপিআই রোলআপ সামারি তৈরি |

---

## 3. Database Schema & Persistence (PostgreSQL 15.6)

### 3.1 Data Definition Language (DDL)

```sql
-- =============================================================================
-- SVC-ANL PostgreSQL 15.6 DDL Specification
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Corridor Daily KPI & Asset Availability Rollup Mart (Features #49, #50)
CREATE TABLE analytics_corridor_daily_kpi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    division_code VARCHAR(10) NOT NULL,            -- e.g., "HWH", "SDAH", "ASN"
    corridor_code VARCHAR(32) NOT NULL,            -- e.g., "HWH-BWN"
    
    -- Block Volume Metrics
    total_blocks_requested INT NOT NULL DEFAULT 0,
    total_blocks_sanctioned INT NOT NULL DEFAULT 0,
    total_blocks_executed INT NOT NULL DEFAULT 0,
    total_blocks_cancelled INT NOT NULL DEFAULT 0,
    
    -- Duration Accounting (Minutes)
    sanctioned_duration_minutes INT NOT NULL DEFAULT 0,
    actual_utilized_duration_minutes INT NOT NULL DEFAULT 0,
    burst_overstay_duration_minutes INT NOT NULL DEFAULT 0,
    
    -- Multi-Department Synergy (Feature #98)
    combined_co_possession_blocks_count INT NOT NULL DEFAULT 0,
    hours_saved_by_bundling NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    
    -- Train Traffic Impact Metrics
    total_trains_delayed_count INT NOT NULL DEFAULT 0,
    total_passenger_delay_minutes INT NOT NULL DEFAULT 0,
    total_freight_delay_minutes INT NOT NULL DEFAULT 0,
    corridor_punctuality_pct NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    
    -- PRIMARY SUCCESS METRIC (Feature #50)
    total_corridor_track_km NUMERIC(8, 2) NOT NULL DEFAULT 95.50,
    downtime_track_km_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    asset_availability_score_pct NUMERIC(5, 2) NOT NULL DEFAULT 94.50 CHECK (asset_availability_score_pct BETWEEN 0.00 AND 100.00),
    
    computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_analytics_corridor_date UNIQUE (metric_date, division_code, corridor_code)
);

-- 2. Granular Block Execution Efficiency Record (Feature #49)
CREATE TABLE analytics_block_efficiency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL UNIQUE,                 -- References SVC-BLK Block Record
    block_reference_code VARCHAR(32) NOT NULL,     -- e.g., "BLK-20260918-004"
    corridor_code VARCHAR(32) NOT NULL,
    lead_department VARCHAR(20) NOT NULL,          -- ENGG, S_AND_T, TRD
    is_combined_block BOOLEAN NOT NULL DEFAULT FALSE,
    participating_departments VARCHAR(50) NOT NULL DEFAULT 'ENGG',
    
    -- Time Accounting
    sanctioned_minutes INT NOT NULL,
    actual_minutes INT NOT NULL,
    burst_minutes INT NOT NULL DEFAULT 0,          -- Minutes exceeded past permit
    utilization_rate NUMERIC(5, 2) NOT NULL,       -- actual / sanctioned
    
    -- Crew & Asset Metrics
    gang_productivity_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    trains_delayed_count INT NOT NULL DEFAULT 0,
    total_traffic_delay_minutes INT NOT NULL DEFAULT 0,
    
    -- Outcome & Root-Cause (Feature #109)
    execution_status VARCHAR(24) NOT NULL,         -- COMPLETED_ON_TIME, COMPLETED_OVERSTAY, CANCELLED, ABORTED
    primary_variance_reason_code VARCHAR(32) NULL, -- WEATHER_RAIN, MATERIAL_DELAY, CREW_SHORTAGE, TRAFFIC_HOLD
    variance_remarks TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Plan Variance Auto-Analysis Summary (Feature #109)
CREATE TABLE analytics_variance_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_horizon VARCHAR(10) NOT NULL,             -- WEEKLY, MONTHLY
    horizon_start_date DATE NOT NULL,
    horizon_end_date DATE NOT NULL,
    corridor_code VARCHAR(32) NOT NULL,
    
    planned_blocks_count INT NOT NULL,
    executed_blocks_count INT NOT NULL,
    adherence_rate_pct NUMERIC(5, 2) NOT NULL,     -- (executed / planned) * 100
    
    -- Root-Cause Breakdown JSONB (e.g. {"WEATHER_RAIN": 3, "MATERIAL_DELAY": 2})
    root_cause_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    continuous_improvement_recommendations TEXT NULL,
    
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_variance_horizon UNIQUE (plan_horizon, horizon_start_date, corridor_code)
);

-- 4. Immutable Audit Trail & Regulatory Compliance Ledger (Feature #67)
CREATE TABLE analytics_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    user_name VARCHAR(64) NOT NULL,
    user_role VARCHAR(32) NOT NULL,                -- CHIEF_CONTROLLER, JUNIOR_ENGINEER, ADMIN
    
    action_type VARCHAR(32) NOT NULL,              -- BLOCK_REQUEST, BLOCK_SANCTION, EMERGENCY_OVERRIDE, BLOCK_CANCEL
    entity_name VARCHAR(32) NOT NULL,              -- Block, Train, AssetDefect
    entity_id VARCHAR(64) NOT NULL,
    
    -- Pre and Post State Snapshots for Formal Railway Safety Inquiries
    before_state_snapshot JSONB NULL,
    after_state_snapshot JSONB NOT NULL,
    override_reason TEXT NULL,
    client_ip_address VARCHAR(45) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Official Sanction Orders Repository (Feature #107)
CREATE TABLE analytics_sanction_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(64) NOT NULL UNIQUE,      -- e.g., "SANCTION-HWH-DIV-2026-W38"
    plan_horizon VARCHAR(10) NOT NULL,             -- WEEKLY, MONTHLY
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    division_code VARCHAR(10) NOT NULL,
    
    total_blocks_included INT NOT NULL,
    total_maintenance_hours NUMERIC(8, 2) NOT NULL,
    pdf_file_path VARCHAR(255) NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,          -- Digital Verification Hash
    
    is_signed_by_drm BOOLEAN NOT NULL DEFAULT FALSE,
    signed_by_user VARCHAR(64) NULL,
    signed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Performance Indexing & Aggregations
```sql
-- Fast Window Queries on Daily Corridor KPIs
CREATE INDEX idx_analytics_kpi_corridor ON analytics_corridor_daily_kpi (corridor_code, metric_date DESC);
CREATE INDEX idx_analytics_kpi_division ON analytics_corridor_daily_kpi (division_code, metric_date DESC);

-- Block Efficiency & Variance Filtering
CREATE INDEX idx_analytics_eff_lead ON analytics_block_efficiency (lead_department, execution_status);
CREATE INDEX idx_analytics_eff_reason ON analytics_block_efficiency (primary_variance_reason_code) WHERE primary_variance_reason_code IS NOT NULL;

-- Immutable Audit Trail Searching
CREATE INDEX idx_analytics_audit_entity ON analytics_audit_trail (entity_name, entity_id);
CREATE INDEX idx_analytics_audit_user ON analytics_audit_trail (user_name, created_at DESC);
```

### 3.3 Redis Caching Architecture
- `railway:anl:kpi:corridor:[corridor_code]`: সর্বশেষ ৭ দিনের রোলআপ কেপিআই কার্ডস (TTL = 900 সেকেন্ড বা ১৫ মিনিট)।
- `railway:anl:availability:summary`: প্ল্যাটফর্মের বর্তমান সার্বিক প্রাপ্যতা স্কোর ও ট্রেন্ড (TTL = 900 সেকেন্ড)।
- `railway:anl:variance:latest`: সর্বশেষ সপ্তাহের ভ্যারিয়েন্স পাই-চার্ট ডেটা (TTL = 1800 সেকেন্ড)।

---

## 4. API Endpoints Specification

সকল REST API স্ট্যান্ডার্ড প্ল্যাটফর্ম রেসপন্স এনভেলপ অনুসরণ করে:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-18T21:18:00.000Z",
  "correlation_id": "e81019ab-07anl-481c-991f-a09182736412"
}
```

### 4.1 REST Endpoints Matrix

| Method | Endpoint Route | Auth / Role | Description & Function ID | Target SLA |
|---|---|---|---|:---:|
| `GET` | `/api/v1/analytics/availability-score/` | Authenticated | মূল সাফল্য মেট্রিক: সেকশন প্রাপ্যতা শতাংশ (`FUNC-ANL-001`)| p95 < 50ms |
| `GET` | `/api/v1/analytics/utilization-dashboard/`| Authenticated | ব্লক সময় ব্যবহারের দক্ষতা ও অপচয় ট্র্যাকার (`FUNC-ANL-002`)| p95 < 60ms |
| `GET` | `/api/v1/analytics/variance-analysis/` | Senior Officer | পরিকল্পিত বনাম প্রকৃত কাজের পার্থক্য বিশ্লেষণ (`FUNC-ANL-003`)| p95 < 65ms |
| `POST`| `/api/v1/analytics/reports/daily/` | Officer / SE | দৈনিক সারাংশ পিডিএফ রিপোর্ট জেনারেশন (`FUNC-ANL-004`) | p95 < 800ms|
| `POST`| `/api/v1/analytics/reports/sanction-order/`| DRM / Sr. DOM | অফিসিয়াল সাপ্তাহিক/মাসিক স্যাংশন অর্ডার পিডিএফ (`FUNC-ANL-005`)| p95 < 1200ms|
| `GET` | `/api/v1/analytics/audit-trail/` | Safety Auditor | সকল অনুমোদন ও পরিবর্তনের অপরিবর্তনীয় অডিট লগ (`FUNC-ANL-006`)| p95 < 70ms |
| `POST`| `/api/v1/analytics/simulator/what-if/` | Planner / SE | স্যান্ডবক্স সিমুলেটর: ব্লক পরিবর্তনের সম্ভাব্য প্রভাব (`FUNC-ANL-007`)| p95 < 150ms|

---

## 5. Event-Driven Contracts & Integrations

### 5.1 Consumed Events (via Redis Outbox)

#### Event 1: `blocks.possession.completed` (`SVC-BLK` থেকে)
ব্লক শেষ হওয়ার সাথে সাথে অ্যানালিটিক্স ইঞ্জিন ব্লকটির স্যাংশন সময় বনাম প্রকৃত সময়ের তুলনা করে ইউটিলাইজেশন রেকর্ড সেভ করে:
```json
{
  "event_id": "a9018273-0711-482a-9911-b01928374612",
  "event_type": "blocks.possession.completed",
  "timestamp": "2026-09-18T21:20:00.000Z",
  "payload": {
    "block_id": "BLK-20260918-004",
    "corridor_code": "HWH-BWN",
    "sanctioned_minutes": 180,
    "actual_minutes": 172,
    "burst_minutes": 0,
    "lead_department": "ENGG",
    "is_combined": true,
    "trains_delayed": 0
  }
}
```

#### Event 2: `blocks.plan.frozen` (`SVC-BLK` থেকে)
সাপ্তাহিক প্ল্যান ফ্রিজ হলে স্বয়ংক্রিয়ভাবে স্যাংশন অর্ডার পিডিএফ জেনারেশন টাস্ক শিডিউল হয়।

---

## 6. Mathematical Algorithms & Pure Logic Formulations

### 6.1 Asset Availability Score Formula (Feature #50)
```python
def calculate_asset_availability_score(
    total_track_length_km: float,
    evaluation_hours: float,
    outage_records: list[dict]
) -> dict:
    """
    Core Primary Metric (Feature #50):
    Availability % = (1.0 - (Total Downtime KM-Hours / Total Operational KM-Hours)) * 100
    """
    total_capacity_km_hours = total_track_length_km * evaluation_hours
    assert total_capacity_km_hours > 0, "Total capacity must be greater than zero"
    
    total_downtime_km_hours = 0.0
    for out in outage_records:
        impacted_km = float(out['end_km']) - float(out['start_km'])
        downtime_hours = float(out['duration_minutes']) / 60.0
        total_downtime_km_hours += (impacted_km * downtime_hours)
        
    availability_ratio = 1.0 - (total_downtime_km_hours / total_capacity_km_hours)
    availability_pct = round(max(0.0, min(100.0, availability_ratio * 100.0)), 2)
    
    return {
        "total_capacity_km_hours": round(total_capacity_km_hours, 2),
        "total_downtime_km_hours": round(total_downtime_km_hours, 2),
        "availability_score_pct": availability_pct,
        "is_sla_met": availability_pct >= 90.0 # Standard Indian Railways Benchmark
    }
```

### 6.2 Block Utilization Rate & Burst Penalty (Feature #49)
```python
def compute_block_utilization_metrics(sanctioned_mins: int, actual_mins: int) -> dict:
    """
    Evaluates efficiency of block time execution (Feature #49):
    Utilization Rate U = Actual / Sanctioned
    Penalizes burst overstay (> 1.0) due to cascading disruption risks.
    """
    assert sanctioned_mins > 0, "Sanctioned minutes must be positive"
    raw_rate = round(actual_mins / sanctioned_mins, 2)
    
    if actual_mins <= sanctioned_mins:
        burst_mins = 0
        wasted_mins = sanctioned_mins - actual_mins
        rating = "EFFICIENT" if raw_rate >= 0.85 else "UNDER_UTILIZED"
    else:
        burst_mins = actual_mins - sanctioned_mins
        wasted_mins = 0
        rating = "CRITICAL_BURST_OVERSTAY"
        
    return {
        "sanctioned_minutes": sanctioned_mins,
        "actual_minutes": actual_mins,
        "utilization_rate": raw_rate,
        "burst_minutes": burst_mins,
        "wasted_minutes": wasted_mins,
        "performance_rating": rating
    }
```

### 6.3 Plan Variance Root-Cause Decomposition (Feature #109)
```python
from collections import Counter

def analyze_plan_variance(planned_blocks: list[dict], executed_blocks: list[dict]) -> dict:
    """
    Automated root-cause decomposition for weekly/monthly planned vs executed blocks (Feature #109).
    """
    total_planned = len(planned_blocks)
    total_executed = len(executed_blocks)
    adherence_pct = round((total_executed / total_planned * 100.0), 2) if total_planned > 0 else 0.0
    
    unexecuted_blocks = [b for b in planned_blocks if b['block_id'] not in {e['block_id'] for e in executed_blocks}]
    reason_codes = [b.get('cancellation_reason_code', 'UNSPECIFIED') for b in unexecuted_blocks]
    breakdown = dict(Counter(reason_codes))
    
    recommendations = []
    if breakdown.get('WEATHER_RAIN', 0) >= 2:
        recommendations.append("Consider increasing weather buffer for monsoon forecast windows.")
    if breakdown.get('MATERIAL_DELAY', 0) >= 2:
        recommendations.append("Material logistics SLA breach detected. Enforce Material Slot Check (#101).")
        
    return {
        "planned_count": total_planned,
        "executed_count": total_executed,
        "adherence_rate_pct": adherence_pct,
        "root_cause_breakdown": breakdown,
        "recommendations": recommendations
    }
```

### 6.4 What-If Scenario Impact Simulator (Feature #62)
```python
def simulate_block_reschedule(
    target_block: dict,
    proposed_new_start_time: str,
    corridor_timetabled_trains: list[dict]
) -> dict:
    """
    Sandbox What-If Simulator (Feature #62):
    Tests impact on train delays and conflict points if a block is shifted to a new time window.
    """
    simulated_conflicts = []
    projected_passenger_delay_mins = 0
    
    # Check intersecting trains
    for train in corridor_timetabled_trains:
        # If train schedule falls in proposed new block window
        if (target_block['start_km'] <= train['route_km'] <= target_block['end_km']):
            simulated_conflicts.append(train['train_number'])
            projected_passenger_delay_mins += (train['passenger_capacity'] * 20) // 1000 # Approximation
            
    can_proceed = len(simulated_conflicts) == 0
    return {
        "proposed_window": proposed_new_start_time,
        "can_proceed_cleanly": can_proceed,
        "conflicting_train_count": len(simulated_conflicts),
        "conflicting_train_numbers": simulated_conflicts,
        "projected_passenger_delay_impact": projected_passenger_delay_mins,
        "verdict": "FEASIBLE" if can_proceed else "HIGH_CONFLICT_RISK"
    }
```

---

## 7. Demo Data Specification & SIH Presentation Alignment

### 7.1 Seeded 7-Day Asset Availability Trend
বিচারকদের সামনে প্রকল্পের মূল লক্ষ্য (Maximize Asset Availability) প্রমাণের জন্য সিড করা ৭ দিনের অগ্রগতি চার্ট:

| দিন | তারিখ | ব্লক সংখ্যা | ডাউনটাইম (KM-ঘণ্টা) | প্রাপ্যতা স্কোর (%) | মন্তব্য |
|---|---|:---:|:---:|:---:|---|
| Day 1 (Baseline) | 2026-09-12 | 14 (Uncoordinated) | 480.5 | **78.4%** | ম্যানুয়াল প্ল্যানিংয়ের বিশৃঙ্খলা |
| Day 2 | 2026-09-13 | 12 | 410.0 | **81.6%** | পৃথক পৃথক ডিপার্টমেন্টের আবেদন |
| Day 3 | 2026-09-14 | 10 (Bundled) | 310.2 | **86.1%** | যৌথ সম্মিলিত ব্লক শুরু |
| Day 4 | 2026-09-15 | 8 (Combined) | 220.0 | **90.1%** | এআই কম্বাইন্ড ব্লক উইন্ডো সক্রিয় |
| Day 5 | 2026-09-16 | 7 (Optimized) | 165.4 | **92.6%** | পিক-আওয়ার সুরক্ষা প্রয়োগ |
| Day 6 | 2026-09-17 | 6 (Deconflicted) | 130.0 | **94.2%** | জিরো ট্রাফিক কনফ্লিক্ট অর্জন |
| Day 7 (Today) | 2026-09-18 | 6 (Full AI Suite)| 105.0 | **95.3%** | বিশ্বমানের অপারেশনাল প্রাপ্যতা |

### 7.2 Sanction Order PDF Template Mock
- **অর্ডার নং:** `IR/ER/HWH/BLOCK-SANCTION/2026-W38`
- **স্বাক্ষরকারী:** Divisional Railway Manager (DRM), Howrah
- **ডিজিটাল কিউআর কোড ভেরিফিকেশন হ্যাশ:** `e4b029a1f7c...26027`

---

## 8. Next File Dependency Note

> **পরবর্তী ফাইল:** [03-service-blueprints/08-notifications.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/08-notifications.md)

`07-analytics.md` (`SVC-ANL`) সফলভাবে ও পুঙ্খানুপুঙ্খভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `08-notifications.md`-এ **Critical Safety Broadcast, SOS Emergency & Multi-Channel Alert Service (`SVC-NOTIF`)**-এর প্রোডাকশন ব্লুপ্রিন্ট সংজ্ঞায়িত করা হবে, যাতে ১৫টি সেফটি ফিচারের লাইভ অ্যালার্ট এবং বহুভাষিক ক্রু নোটিফিকেশন যুক্ত থাকবে।
