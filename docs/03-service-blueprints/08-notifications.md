# 08-notifications.md

> **ফাইল ক্রম:** ২৪/৪৫  
> **পূর্ববর্তী ফাইল:** [03-service-blueprints/07-analytics.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/07-analytics.md) (`SVC-ANL`: Asset Availability Analytics, Variance Auto-Analysis & Reporting Service)  
> **পরবর্তী ফাইল:** [04-function-maps/00-function-id-registry.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/00-function-id-registry.md) (Global Microservices Function ID Registry)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের লাইফ-সেফটি ও রিয়েল-টাইম অ্যালার্ট ডিসপ্যাচার **`SVC-NOTIF` (Critical Safety Broadcast, SOS Emergency & Multi-Channel Alert Service)**-এর পূর্ণাঙ্গ প্রোডাকশন আর্কিটেকচার ব্লুপ্রিন্ট সংজ্ঞায়িত করা হয়েছে। এটি প্ল্যাটফর্মের ১৫টি সেফটি ফিচারের লাইফলাইন হিসেবে কাজ করে—যার মধ্যে রয়েছে ট্রেনের নিকটবর্তী হওয়ার সতর্কবার্তা (`Train Approach Warning #76`), তাৎক্ষণিক জরুরি সংকেত (`SOS Emergency Button #79`), লোন ওয়ার্কার ডেড-ম্যান হার্টবিট (`#78`), ডিজিটাল টোকেন ও পাওয়ার আইসোলেশন অ্যালার্ট (`#71`, `#73`), তিন ডিপার্টমেন্টের লাইভ চ্যাটরুম (`#43`), এবং আঞ্চলিক ভাষায় ক্রু নোটিফিকেশন (`#41`)।

---

# SVC-NOTIF: Critical Safety Broadcast, SOS Emergency & Multi-Channel Alert Service

> **Service ID:** `SVC-NOTIF`  
> **Bounded Context App:** `apps.notifications`  
> **Owning Team:** Real-Time Infrastructure, Field Safety & Telecommunications Engineering Team  
> **Business Criticality:** `Safety-Critical (SIL-2 equivalent - Life Safety, Derailment Prevention & SOS Alarm Dispatch)`  
> **Primary SLA:** Availability $\ge 99.99\%$, In-App WebSocket Push $< 50\text{ ms}$, SOS Dispatch $< 100\text{ ms}$, SMS Gateway $< 3000\text{ ms}$  
> **Execution Runtime:** Daphne ASGI (:8001) + Celery 5.3 Dedicated High-Priority Worker (`notify`)

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission & Railway Mandate
ভারতীয় রেলওয়েতে ট্র্যাক মেইনটেন্যান্স চলাকালীন শ্রমিক ও ইঞ্জিনিয়ারদের নিরাপত্তা নিশ্চিত করা অত্যন্ত ঝুঁকিপূর্ণ। ট্রেন চলাচলের তথ্য সময়মতো না পৌঁছানো, অসাবধানতাবশত লাইভ ওভারহেড তারের বিদ্যুৎস্পৃষ্ট হওয়া, কিংবা কাজের সময়সীমা পার হয়ে ট্রেনের সাথে সংঘর্ষ ঘটার ঝুঁকি থাকে। 

`SVC-NOTIF`-এর মূল দায়িত্ব হলো:
1. **ট্রেন অ্যাপ্রোচ ওয়ার্নিং সিস্টেম (Train Approach Warning System #76):** কোনো সক্রিয় ব্লক সেকশনের ২-৩ স্টেশন পূর্বে ট্রেন পৌঁছামাত্র ট্র্যাকে কর্মরত গ্যাং লিডারের মোবাইল অ্যাপে অডিও সাইরেন ও জরুরি এসএমএস পাঠানো: *"Train Approaching, Clear the Line!"*
2. **এসওএস এমার্জেন্সি বাটন (SOS Emergency Button #79):** ট্র্যাকে কোনো দুর্ঘটনা বা স্বাস্থ্যগত জরুরি অবস্থায় ফিল্ড ক্রু এক ট্যাপে পোস্টজিআইএস জিপিএস লোকেশনসহ কন্ট্রোল রুম ও নিকটবর্তী স্টেশনে লাল বিপ সংকেত জারি করবে।
3. **লোন ওয়ার্কার সেফটি মনিটর (Lone Worker Safety Heartbeat #78):** একাকী ট্র্যাক পেট্রোলম্যানের জন্য ডেড-ম্যান চেকিং; প্রতি ৩০ মিনিটে রেসপন্স না পেলে কন্ট্রোল রুমে স্বয়ংক্রিয় এস্কেলেশন।
4. **ওভারস্টে কাউন্টডাউন ও টিএসআর সাজেশন (Overstay Countdown & TSR Suggestion #77):** ব্লক শেষ হওয়ার ৩০, ১৫ এবং ৫ মিনিট পূর্বে গ্যাংকে কাউন্টডাউন অ্যালার্ট এবং ওভারস্টে হলে অবিলম্বে ট্রেনের জন্য অস্থায়ী গতিসীমা (Temporary Speed Restriction - TSR) সুপারিশ।
5. **মাল্টি-চ্যানেল ও আঞ্চলিক ভাষার অ্যালার্ট (Multi-Channel Alerts #40, #41):** সেলুলার ডাটা সংযোগ দুর্বল থাকলে স্বয়ংক্রিয়ভাবে এসএমএস গেটওয়েতে ফলব্যাক এবং ফিল্ড ক্রুদের জন্য বাংলা/হিন্দি আঞ্চলিক ভাষায় মেসেজ প্রদান।
6. **ডিপার্টমেন্ট চ্যাটরুম (Department Chat Room #43):** ইঞ্জিনিয়ারিং, সিগন্যালিং ও টিআরডি—তিন ডিপার্টমেন্টের অফিসারদের একই চ্যানেলে রিয়েল-টাইমে আলোচনার সুবিধা।

#### Problem Statement PS26027 Alignment:
- [x] **Pillar 3 — Permissive Safety & Site Execution Compliance:** Digital Token Alerts (Feature #71), Crew Headcount (Feature #72), OHE Power Isolation Confirmation (Feature #73), Digital LOTO Record (Feature #74), Weather Safety Gate (Feature #75), Train Approach Warning (Feature #76), Block Overstay Escalation (Feature #77), Lone Worker Protection (Feature #78), এবং SOS Emergency Button (Feature #79)।
- [x] **Communication Suite:** Multi-Channel Alerts (Feature #40), Crew Regional Notification System (Feature #41), Department Chat Room (Feature #43), এবং WhatsApp Bot PoC (Feature #60)।

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - ড্যাফনি এএসজিআই (Daphne ASGI) ভিত্তিক ব্রডকাস্ট এবং ডিস্ট্রিবিউটেড ওয়েবসকেট চ্যানেল গ্রুপ।
  - পোস্টজিআইএস স্থানাঙ্কসহ এসওএস এমার্জেন্সি ইভেন্ট হ্যান্ডলিং ও লাইভ সাইরেন ম্যানেজমেন্ট।
  - ভারতীয় রেলওয়ে এসএমএস গেটওয়ে (`NIC_SMS_GATEWAY`) অ্যাডাপ্টার ও এক্সপোনেনশিয়াল রিট্রাই।
  - জেমিনি এআই ভিত্তিক বহুভাষিক (বাংলা/হিন্দি) ক্রু নোটিফিকেশন টেমপ্লেট রেন্ডারিং।
  - লোন ওয়ার্কার অডিট ট্র্যাকার এবং ইন্টার-ডিপার্টমেন্ট চ্যাট হিস্ট্রি।
- **Explicit Exclusions (Out of Scope):**
  - ব্লকের ভৌগোলিক ইন্টারসেকশন গণনা (ম্যানেজ করে `SVC-BLK`)।
  - ট্রেনের স্পিড ও টাইমটেবিল ট্র্যাকিং (ম্যানেজ করে `SVC-TRN`)।
  - শারীরিক ক্রু উপস্থিতির বায়োমেট্রিক ডিভাইস ম্যানেজমেন্ট (ম্যানেজ করে `SVC-DEPT`)।

---

## 2. Technical Stack & Infrastructure Runtime

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SVC-NOTIF RUNTIME TOPOLOGY                                           │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  WebSocket Client Connections: Daphne ASGI (:8001) -> /ws/v1/notifications/, /ws/v1/safety/sos/       │
│  Inbound REST API Traffic: Gunicorn WSGI (:8000) -> /api/v1/notifications/*                            │
│  Framework: Django 5.0.3 + Django Channels 4.0.0 + GeoDjango                                           │
│  Authoritative Storage: PostgreSQL 15.6 + PostGIS 3.3.4 (SOS Event Coordinates Point SRID 4326)        │
│  Channel Layer Broker: Redis 7.2.4 (DB 0: Distributed Channel Groups, SOS Heartbeats, DB Lock)         │
│  Dispatcher Queue: Celery 5.3.6 Worker on Queue: `notify` (Isolated High-Priority Dispatchers)          │
│  External Dispatcher Gateways: Indian Railways NIC SMS Gateway + SMTP Gateway + WhatsApp PoC Mock     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| উপাদান | প্রযুক্তি | সংস্করণ | উদ্দেশ্য ও কার্যকারিতা |
|---|---|---|---|
| **Programming Language** | Python | 3.11.8 | উচ্চ-গতির অ্যাসিনক্রোনাস ওয়েবসকেট কো-রুটিন ও ইভেন্ট হ্যান্ডলিং |
| **ASGI Engine** | Daphne | 4.1.0 | Twisted-ভিত্তিক লাইভ বাই-ডিরেকশনাল ওয়েবসকেট কানেকশন হ্যান্ডলার |
| **Channel Layer** | channels-redis | 4.2.0 | রেডিস ব্যাকড ক্লাস্টার মেসেজ ব্রডকাস্টার |
| **Spatial Database** | PostgreSQL + PostGIS | 15.6 / 3.3.4 | এসওএস কলার লোকেশন ও নিকটবর্তী স্টেশন দূরত্ব কোয়ারি (`ST_Distance`) |
| **Message Broker** | Redis | 7.2.4 (DB 0) | সাব-সেকেন্ড চ্যানেল ডিস্ট্রিবিউশন এবং লোন ওয়ার্কার হার্টবিট ডেডলাইন |
| **Worker Queue** | Celery | 5.3.6 | ডেডিকেটেড কিউ (`notify`), এসএমএস ডিসপ্যাচ ও ফেইলিউর রিট্রাই |

---

## 3. Database Schema & Persistence (PostgreSQL 15 + PostGIS 3.3)

### 3.1 Data Definition Language (DDL)

```sql
-- =============================================================================
-- SVC-NOTIF PostgreSQL 15 + PostGIS 3.3 DDL Specification
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Master Notification Records Ledger (Features #40, #41)
CREATE TABLE notifications_notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL,
    recipient_role VARCHAR(32) NOT NULL,           -- CHIEF_CONTROLLER, GANG_LEADER, JE_PWAY, TRD_OPERATOR
    
    priority VARCHAR(24) NOT NULL DEFAULT 'ROUTINE_INFO', -- CRITICAL_EMERGENCY, HIGH_SAFETY, ROUTINE_INFO
    category VARCHAR(32) NOT NULL,                 -- TRAIN_APPROACH, SOS_ALARM, OVERSTAY_BURST, TOKEN_EXCHANGE, LONE_WORKER
    
    title VARCHAR(150) NOT NULL,
    message_body TEXT NOT NULL,
    localized_body_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"bn": "...", "hi": "...", "en": "..."}
    
    target_entity_type VARCHAR(32) NOT NULL,       -- Block, Train, AssetDefect
    target_entity_id VARCHAR(64) NOT NULL,
    corridor_code VARCHAR(32) NULL,
    
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Multi-Channel Dispatch Audit Log (Features #40, #41)
CREATE TABLE notifications_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL,
    channel VARCHAR(20) NOT NULL,                  -- WEBSOCKET_INAPP, SMS_GATEWAY, EMAIL, PUSH, WHATSAPP_MOCK
    
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'QUEUED', -- QUEUED, DISPATCHED, DELIVERED, FAILED, DEAD_LETTER
    external_carrier_ref VARCHAR(100) NULL,
    retry_attempts INT NOT NULL DEFAULT 0,
    delivery_latency_ms INT NULL,
    error_details TEXT NULL,
    
    dispatched_at TIMESTAMPTZ NULL,
    delivered_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_delivery_notif FOREIGN KEY (notification_id) 
        REFERENCES notifications_notification(id) ON DELETE CASCADE
);

-- 3. SOS Emergency Events Register (Feature #79)
CREATE TABLE notifications_sos_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_reference_code VARCHAR(32) NOT NULL UNIQUE, -- e.g., "SOS-20260918-001"
    caller_user_id UUID NOT NULL,
    caller_name VARCHAR(64) NOT NULL,
    caller_phone VARCHAR(15) NOT NULL,
    gang_code VARCHAR(32) NOT NULL,
    
    -- PostGIS Exact Geolocation (SRID 4326)
    caller_coordinates GEOMETRY(Point, 4326) NOT NULL,
    corridor_code VARCHAR(32) NOT NULL,
    nearest_station_code VARCHAR(20) NOT NULL,
    distance_to_station_meters NUMERIC(8, 2) NOT NULL,
    
    emergency_type VARCHAR(32) NOT NULL DEFAULT 'ACCIDENT_MEDICAL', -- COLLISION_RISK, ACCIDENT_MEDICAL, OHE_HAZARD
    siren_acknowledged_by_controller BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_controller_name VARCHAR(64) NULL,
    acknowledged_at TIMESTAMPTZ NULL,
    
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolution_remarks TEXT NULL,
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inter-Department Collaboration Chat Ledger (Feature #43)
CREATE TABLE notifications_department_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id VARCHAR(64) NOT NULL,               -- e.g., "chat_block_BLK-20260918-004"
    block_id UUID NULL,
    sender_user_id UUID NOT NULL,
    sender_name VARCHAR(64) NOT NULL,
    sender_department VARCHAR(20) NOT NULL,        -- ENGG, S_AND_T, TRD, OPERATING
    
    message_text TEXT NOT NULL,
    has_action_item BOOLEAN NOT NULL DEFAULT FALSE,
    action_item_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Lone Worker Dead-Man Check-in Tracker (Feature #78)
CREATE TABLE notifications_lone_worker_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_user_id UUID NOT NULL UNIQUE,
    worker_name VARCHAR(64) NOT NULL,
    assigned_section_code VARCHAR(32) NOT NULL,
    
    checkin_interval_minutes INT NOT NULL DEFAULT 30,
    last_checkin_timestamp TIMESTAMPTZ NOT NULL,
    next_deadline_timestamp TIMESTAMPTZ NOT NULL,
    
    missed_checkin_count INT NOT NULL DEFAULT 0,
    is_alarm_active BOOLEAN NOT NULL DEFAULT FALSE,
    alarm_escalated_to_sse BOOLEAN NOT NULL DEFAULT FALSE,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Spatial & Performance Indexing
```sql
-- PostGIS Spatial GiST Index for SOS Coordinates
CREATE INDEX idx_notif_sos_coords ON notifications_sos_event USING GIST (caller_coordinates);

-- B-tree Composite Indexes for Rapid Queue Fetching
CREATE INDEX idx_notif_recipient_unread ON notifications_notification (recipient_user_id, is_read, priority);
CREATE INDEX idx_notif_priority_created ON notifications_notification (priority, created_at DESC);
CREATE INDEX idx_delivery_status_retry ON notifications_delivery_log (delivery_status, retry_attempts);
CREATE INDEX idx_chat_channel_created ON notifications_department_message (channel_id, created_at ASC);
CREATE INDEX idx_loneworker_deadline ON notifications_lone_worker_tracker (is_alarm_active, next_deadline_timestamp);
```

### 3.3 Redis Caching Strategy & Key Namespaces
- `railway:notif:sos:active`: সক্রিয় জরুরি এসওএস ইভেন্ট তালিকা (TTL = 86,400 সেকেন্ড)।
- `railway:notif:unread_count:[user_id]`: ইউজারের না পড়া নোটিফিকেশন সংখ্যা (TTL = 3600 সেকেন্ড)।
- `railway:notif:loneworker:deadline:[user_id]`: পরবর্তী হার্টবিট ডেডলাইন টাইমস্ট্যাম্প (TTL = 1800 সেকেন্ড)।
- **Stampede Protection:** Redis distributed lock `SET lock:sos:dispatch:[event_id] NX EX 15` নিশ্চিত করে যাতে একই এসওএস কলার একাধিক কন্ট্রোলারকে ডুপ্লিকেট অ্যালার্ম স্প্যাম না করে।

---

## 4. API & WebSocket Endpoints Specification

### 4.1 REST Endpoints Matrix

| Method | Endpoint Route | Auth / Role | Description & Function ID | Target SLA |
|---|---|---|---|:---:|
| `GET` | `/api/v1/notifications/` | Authenticated | ইউজারের নোটিফিকেশন লিস্ট ও ফিল্টারিং (`FUNC-NOTIF-001`)| p95 < 40ms |
| `PATCH`| `/api/v1/notifications/{id}/read/`| Authenticated | নোটিফিকেশন পড়া সম্পন্ন হিসেবে মার্ক (`FUNC-NOTIF-002`)| p95 < 30ms |
| `POST`| `/api/v1/notifications/sos/trigger/` | Field Crew | ১-ট্যাপ জিপিএস এসওএস জরুরি অ্যালার্ম জারি (`FUNC-NOTIF-003`)| p95 < 75ms |
| `POST`| `/api/v1/notifications/sos/ack/` | Chief Controller | কন্ট্রোল রুম থেকে সাইরেন একনলেজ করা (`FUNC-NOTIF-004`) | p95 < 50ms |
| `POST`| `/api/v1/notifications/train-approach/`| Automated System | ট্রেন অ্যাপ্রোচ ওয়ার্নিং সাইরেন পুশ (`FUNC-NOTIF-005`)| p95 < 45ms |
| `POST`| `/api/v1/notifications/lone-worker/ping/`| Patrolman | লোন ওয়ার্কার ৩০-মিনিট ডেড-ম্যান হার্টবিট চেক-ইন (`FUNC-NOTIF-006`)| p95 < 35ms |
| `GET` | `/api/v1/notifications/chat/{block_id}/`| Authenticated | ইন্টার-ডিপার্টমেন্টাল চ্যাট হিস্ট্রি (`FUNC-NOTIF-007`)| p95 < 45ms |
| `POST`| `/api/v1/notifications/chat/{block_id}/`| Dept Officials | চ্যাটরুমে বার্তা প্রেরণ ও অ্যাকশন আইটেম ট্যাগ (`FUNC-NOTIF-008`)| p95 < 50ms |

### 4.2 WebSocket Connection Contracts (Daphne ASGI)

#### Channel 1: Personal User Alert Stream (`ws://[host]:8001/ws/v1/notifications/`)
- **JWT Auth Query:** `?token=<access_token>`
- **Payload Example:**
```json
{
  "type": "NOTIFICATION_RECEIVED",
  "data": {
    "id": "f8910284-0811-472a-9911-c01928471629",
    "title": "Train Approaching!",
    "body": "Train 12301 crossed SRP Station. Clear the track immediately!",
    "priority": "CRITICAL_EMERGENCY",
    "category": "TRAIN_APPROACH",
    "audio_cue": "SIREN_WARNING_ALARM"
  }
}
```

#### Channel 2: Control Room Emergency SOS Broadcast (`ws://[host]:8001/ws/v1/safety/sos/`)
- **Broadcast Group:** `control_room_emergency_broadcast`
- **Controller Action:** স্ক্রিনে লাল ফ্ল্যাশিং স্ক্রিন ও অবিরাম সাইরেন বাজানো হয় যতক্ষণ না কন্ট্রোলার "Acknowledge" বাটনে ক্লিক করে।

---

## 5. Event-Driven Contracts & Integrations

### 5.1 Published Events (via Redis Channel Layer)

#### Event 1: `safety.train_approach.alert` (Feature #76)
```json
{
  "event_id": "a9102837-7611-482a-9911-e01928374829",
  "event_type": "safety.train_approach.alert",
  "timestamp": "2026-09-18T21:30:00.000Z",
  "payload": {
    "approaching_train_number": "12301",
    "approaching_train_name": "Howrah Rajdhani Express",
    "block_id": "BLK-20260918-004",
    "corridor_code": "HWH-BWN",
    "current_train_km": 32.500,
    "block_start_km": 45.200,
    "distance_remaining_km": 12.700,
    "estimated_seconds_to_arrival": 360,
    "action_required": "IMMEDIATE_TRACK_CLEARANCE"
  }
}
```

#### Event 2: `safety.sos.triggered` (Feature #79)
```json
{
  "event_id": "e8102938-7911-482a-9911-f01928374930",
  "event_type": "safety.sos.triggered",
  "timestamp": "2026-09-18T21:30:05.000Z",
  "payload": {
    "sos_code": "SOS-20260918-001",
    "caller_name": "Ramesh Kumar (Gang #4 Leader)",
    "phone": "+91-9876543210",
    "corridor_code": "HWH-BWN",
    "coordinates": {"latitude": 23.2324, "longitude": 87.8615},
    "nearest_station": "BWN",
    "distance_meters": 1420.0,
    "emergency_type": "ACCIDENT_MEDICAL"
  }
}
```

---

## 6. Mathematical Algorithms & Pure Logic Formulations

### 6.1 Train Proximity Calculation Pure Logic (Feature #76)
```python
def should_trigger_train_approach_warning(
    train_current_km: float,
    train_speed_kmh: float,
    block_start_km: float,
    block_end_km: float,
    warning_buffer_seconds: int = 420 # 7 minutes warning window
) -> dict:
    """
    Life-Saving Safety Logic (Feature #76):
    Calculates if an approaching train is within the safety response threshold
    to give track crews ample time to clear heavy tools and evacuate.
    """
    if train_speed_kmh <= 0:
        return {"trigger_alert": False, "reason": "TRAIN_STATIONARY"}
        
    distance_to_block_km = block_start_km - train_current_km
    if distance_to_block_km <= 0:
        return {"trigger_alert": True, "criticality": "IMMEDIATE_ZONE_INVASION", "seconds_left": 0}
        
    seconds_to_arrival = (distance_to_block_km / train_speed_kmh) * 3600.0
    
    if seconds_to_arrival <= warning_buffer_seconds:
        return {
            "trigger_alert": True,
            "criticality": "CRITICAL_CLEAR_LINE",
            "distance_km": round(distance_to_block_km, 2),
            "seconds_left": int(seconds_to_arrival),
            "audio_alarm": True
        }
        
    return {"trigger_alert": False, "seconds_left": int(seconds_to_arrival)}
```

### 6.2 Block Overstay Countdown & TSR Escalation Logic (Feature #77)
```python
def check_block_overstay_and_escalate(
    sanctioned_end_timestamp: float,
    current_timestamp: float,
    is_line_cleared: bool
) -> dict:
    """
    Automatic Escalation Ladder (Feature #77):
    - T minus 15 mins: Warning countdown to gang leader
    - T minus 5 mins: Urgent countdown to JE
    - T plus 0 mins (Overstay): Alert to Senior Section Engineer & recommend TSR to Section Controller
    """
    if is_line_cleared:
        return {"status": "SAFE_CLEARED", "action_required": False}
        
    time_delta_seconds = current_timestamp - sanctioned_end_timestamp
    
    if time_delta_seconds > 0: # Overstay occurred!
        overstay_minutes = int(time_delta_seconds // 60)
        return {
            "status": "OVERSTAY_BURST",
            "overstay_minutes": overstay_minutes,
            "action_required": True,
            "escalate_to_sse": True,
            "recommend_tsr": True,
            "suggested_tsr_speed_kmh": 30, # Safe caution speed for uncompleted track
            "alert_message": f"Block Overstay detected ({overstay_minutes}m). Caution Order TSR 30 KM/H recommended to Control Office."
        }
    elif time_delta_seconds >= -900: # Within 15 minutes of expiry
        mins_remaining = int(abs(time_delta_seconds) // 60)
        return {
            "status": "COUNTDOWN_WARNING",
            "minutes_remaining": mins_remaining,
            "action_required": True,
            "escalate_to_sse": False,
            "recommend_tsr": False,
            "alert_message": f"Block possession expires in {mins_remaining} minutes. Prepare to pack tools."
        }
        
    return {"status": "NORMAL_OPERATION", "action_required": False}
```

### 6.3 Lone Worker Dead-Man Check-in Evaluator (Feature #78)
```python
def evaluate_lone_worker_deadman_timer(
    last_ping_timestamp: float,
    current_timestamp: float,
    interval_seconds: int = 1800 # 30 minutes
) -> dict:
    """
    Dead-man switch monitor (Feature #78):
    Flags missed check-in and auto-triggers emergency search escalation if two consecutive checks fail.
    """
    elapsed = current_timestamp - last_ping_timestamp
    if elapsed > (interval_seconds * 2): # Over 60 minutes
        return {
            "is_emergency": True,
            "alert_level": "RED_SEARCH_PARTY_DISPATCH",
            "message": "Lone patrolman unresponsive for over 60 minutes! Auto-dispatching nearest station staff."
        }
    elif elapsed > interval_seconds: # Over 30 minutes
        return {
            "is_emergency": False,
            "alert_level": "YELLOW_WARNING_PING",
            "message": "Check-in deadline exceeded. Sending vibratory alert ping to worker."
        }
    return {"is_emergency": False, "alert_level": "GREEN_HEALTHY"}
```

---

## 7. Demo Data Specification & SIH Presentation Alignment

### 7.1 Scenario D Live Safety Walkthrough (The Life-Saving Showcase)
বিচারকদের সামনে প্রকল্পের ১৫টি সেফটি ফিচারের সমন্বয় দেখানোর জন্য সিড করা সিনারিও D:
1. **টোকেন এক্সচেঞ্জ (#71) ও ক্রু হেডকাউন্ট (#72):** গ্যাং #4 বর্ধমানে ১২/১২ জন ক্রু পৌঁছানোর পর কন্ট্রোল রুম থেকে ডিজিটাল টোকেন রিসিভ করে।
2. **ওএইচই পাওয়ার আইসোলেশন (#73):** টিআরডি অপারেটর সাব-স্টেশন থেকে ডিজিটাল সাইন দেয়: *"25kV Feeder 04 earthed"*।
3. **জরুরি ট্রেন অ্যাপ্রোচ ওয়ার্নিং (#76):** ট্রেন ১২৩০১ কর্ড লাইনে ৪০ কিমি দূরে ঢুকতেই গ্যাং লিডারের ফোনে লাল ওয়ার্নিং ফ্ল্যাশ ও সাইরেন বেজে ওঠে: *"Train 12301 approaching Bandel, clear line!"*
4. **এসওএস এমার্জেন্সি ডেমো (#79):** একজন বিচারক স্ক্রিনে "SOS Emergency Button" প্রেস করবেন।
   - পোস্টজিআইএস পয়েন্ট `[23.2324, 87.8615]` তৈরি হবে।
   - কন্ট্রোল রুমের ড্যাশবোর্ডে পূর্ণ-স্ক্রিন লাল ফ্ল্যাশিং ও অডিও সাইরেন বেজে উঠবে।
   - কন্ট্রোলার এক ক্লিকে "Acknowledge & Hold Signal" বাটন প্রেস করবে।

---

## 8. Next File Dependency Note

> **পরবর্তী ফাইল:** [04-function-maps/00-function-id-registry.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/00-function-id-registry.md)

`08-notifications.md` (`SVC-NOTIF`) সফলভাবে ও পুঙ্খানুপুঙ্খভাবে সম্পূর্ণ হয়েছে। এর সাথে সাথে `03-service-blueprints/`-এর সকল ৮টি সার্ভিস সম্পূর্ণ প্রস্তুত হলো। পরবর্তী ফোল্ডার `04-function-maps/`-এর প্রথম ফাইল `00-function-id-registry.md`-এ সমগ্র মাইক্রোসার্ভিস প্ল্যাটফর্মের সকল ফাংশন আইডির ক্যানোনিকাল গ্লোবাল রেজিস্ট্রি তৈরি করা হবে।
