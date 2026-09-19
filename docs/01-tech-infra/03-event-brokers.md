# 03-event-brokers.md

> **ফাইল ক্রম:** ৭/৪৫  
> **ডিরেক্টরি:** `01-tech-infra/`  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/02-data-layer.md` (PostgreSQL স্কিমা, Redis ক্যাশ কি, স্প্যাশিয়াল স্ট্রাকচার)  
> **পরবর্তী ফাইল:** `01-tech-infra/04-internal-api-and-messaging.md` (সার্ভিস কমিউনিকেশন, সার্কিট ব্রেকার, সাগা প্যাটার্ন)  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ৪টি মূল সমস্যা স্তম্ভ, ১৫টি সেফটি ফিচার) এবং `ai-project-spec-generator (1).md`।  
> **ডাটাবেস ও ব্রোকার নীতি:** **Redis 7 (In-Memory Pub/Sub & Stream Broker)** + **Celery 5.3 (4 Dedicated Task Queues)** + **PostgreSQL 15/16** (নো MySQL)।

---

## 1. Broker Selection, Architecture & Topology

### 1.1 Broker Selection Justification
রেলওয়ের রিয়েল-টাইম অপারেশনাল কন্ট্রোল রুমে সাব-মিলিসেকেন্ড ল্যাটেন্সিতে ট্রেনের অবস্থান আপডেট, জরুরি ব্লক লাল ফ্ল্যাশ এবং ডিজিটাল টোকেন আদান-প্রদানের জন্য **Redis 7** এবং **Celery 5.3**-কে কেন্দ্রীয় ইভেন্ট ব্রোকার হিসেবে নির্বাচন করা হয়েছে।

| Broker Candidate | Evaluation in PS 26027 | Status & Concrete Rationale |
|:---|:---|:---:|
| **Redis 7 (Streams + Pub/Sub)** | ইন-মেমোরি অতি-দ্রুত (< ৫ms ল্যাটেন্সি), Django Channels-এর সাথে নেটিভ `channels_redis` সাপোর্ট, ক্যাশ ও ব্রোকারের দ্বৈত ক্ষমতা। | ✅ **Selected Primary** |
| **Celery 5.3 (4 Dedicated Queues)** | অ্যাসিনক্রোনাস কাজগুলোকে গুরুত্ব অনুযায়ী ৪টি সারিতে ভাগ করে Head-of-Line Blocking দূর করে। | ✅ **Selected Asynchronous** |
| **Apache Kafka** | হ্যাকাথন ও ডিভিশনাল ট্রাফিকে (৫০-১০০ সেকশন, ১০০০ ট্রেন) Zookeeper/KRaft ক্লাস্টার পরিচালনা অপ্রয়োজনীয় জটিলতা তৈরি করে। | ❌ Rejected (Future Zonal Scale) |
| **RabbitMQ** | আলাদা Erlang VM এবং কনফিগারেশন জটিলতা; পাইথন/ডিজ্যাঙ্গো ইকোসিস্টেমে Redis-এর চেয়ে ভারী। | ❌ Rejected |
| **AWS SQS / GCP Pub/Sub** | ইন্টারনেট সংযোগের ওপর নির্ভরশীল এবং ক্লাউড ভেন্ডর লক-ইন তৈরি করে; রেলওয়ে লোকাল ইন্ট্রানেটে অফলাইন চলে না। | ❌ Rejected |

### 1.2 Redis Database & Channel Topology
ডেটা ওভারল্যাপ রোধে একক Redis 7 ইনস্ট্যান্সের ডাটাবেসগুলো সুনির্দিষ্টভাবে পৃথকীকৃত:

```
Redis 7 Engine (Port 6379)
├── DB 0: API Cache & Spatial Corridor Rate Limiting
├── DB 1: JWT Session Blacklist & Active User State
├── DB 2: Celery Broker (4 Queues: high, notify, symbolic_ai, default_low)
└── DB 3: Django Channels Layer (WebSocket Broadcast Groups)
```

---

## 2. WebSocket Real-Time Broadcast Channels (Django Channels)

ড্যাফনে (Daphne Port 8001) এএসজিআই সার্ভারের মাধ্যমে ফ্রন্টএন্ডের সাথে সার্বক্ষণিক সংযুক্ত ওয়েবসকেট চ্যানেল গ্রুপ:

| Channel Group Name Pattern | Purpose & Operational Target | Producers | Consumers |
|:---|:---|:---|:---|
| `ws:group:control_room` | মাস্টার কন্ট্রোল রুম ও বিগ স্ক্রিন ড্যাশবোর্ড আপডেট (#3) | `blocks`, `trains`, `emergency` | COA Chief Controller, Big Screen |
| `ws:group:dept:ENGG` | ট্র্যাক ইঞ্জিনিয়ারিং ও পি-ওয়ে ডিফেক্ট আপডেট | `blocks`, `maintenance` | Civil JE/SSE Dashboard |
| `ws:group:dept:TRD` | ওএইচই পাওয়ার লাইন ও সাবস্টেশন আইসোলেশন অ্যালার্ট | `blocks`, `departments` | Traction JE/SSE Dashboard |
| `ws:group:dept:SNT` | সিগন্যাল ও পয়েন্ট মেশিন ফেইলিওর আপডেট | `blocks`, `maintenance` | S&T JE/SSE Dashboard |
| `ws:group:section:{section_id}`| নির্দিষ্ট রেলওয়ে সেকশনের স্থানিক স্ট্যাটাস পরিবর্তন | `blocks`, `trains` | GIS Map Viewers focusing on section |
| `ws:group:emergency` | জরুরি ব্রেকডাউন (SOS #79, Derailment Guard) ফ্ল্যাশ | `emergency`, `blocks` | All Connected Clients (Audio + Red) |
| `ws:user:{user_id}` | নির্দিষ্ট ইঞ্জিনিয়ারের জন্য ডিজিটাল টোকেন ও সাইন পুশ | `notifications` | Individual Field Tablet / Mobile |

---

## 3. Master Event Catalog

প্ল্যাটফর্মের প্রতিটি বিজনেস অ্যাকশন একটি সুনির্দিষ্ট ইভেন্ট উৎপন্ন করে যা সেলিরি ওয়ার্কার এবং ওয়েবসকেট ক্লায়েন্টদের দ্বারা প্রসেস হয়:

| Event Name | Redis Topic / Queue | Producer App | Primary Consumers | Schema Version | Frequency | PII? |
|:---|:---|:---|:---|:---:|:---:|:---:|
| `block.request_submitted` | `railway:events:block` | `apps.blocks` | `notifications`, `analytics` | v1.0 | Medium | No |
| `block.combined_formed` | `railway:events:block` | `apps.blocks` | `ws:group:control_room`, `analytics` | v1.0 | Medium | No |
| `block.sanctioned_approved` | `railway:events:block` | `apps.blocks` | `celery:symbolic_ai`, `celery:default_low` | v1.0 | Medium | No |
| `safety.digital_token_issued`| `railway:events:safety`| `apps.blocks` | `ws:user:{id}`, `celery:notify` | v1.0 | High | Yes (Phone) |
| `safety.ohe_isolated_loto` | `railway:events:safety`| `apps.blocks` | `ws:group:dept:TRD`, `ws:section` | v1.0 | Medium | No |
| `safety.section_cleared` | `railway:events:safety`| `apps.blocks` | `ws:group:control_room`, `trains` | v1.0 | Medium | No |
| `train.delay_detected` | `railway:events:train` | `apps.trains` | `celery:high` (Delay Cascade Recalculator) | v1.0 | High | No |
| `emergency.override_triggered`| `railway:events:emergency`| `apps.emergency`| `ws:group:emergency`, `celery:notify` | v1.0 | Low | No |
| `report.sanction_pdf_ready` | `railway:events:report`| `apps.analytics`| `ws:group:control_room`, `ws:user` | v1.0 | Medium | No |

---

## 4. Top 5 Mission-Critical Event Schemas (JSON Specification)

### 4.1 `block.combined_formed` (Feature #98 Core USP)
যখন ট্র্যাক, সিগন্যাল ও ওএইচই কাজকে একত্রিত করে কম্বাইন্ড উইন্ডো গঠিত হয়:
```json
{
  "event_id": "EVT-COMB-7b8f9e12-4c3a-4a21",
  "event_type": "block.combined_formed",
  "version": "1.0",
  "timestamp": "2026-09-18T09:25:00.102+05:30",
  "trace_id": "TRACE-9812401",
  "payload": {
    "combined_window_id": "COMB-HWH-20260918-01",
    "section_id": "HWH-BWN-L1",
    "section_code": "HOWRAH_BARDDHAMAN_LINE_1",
    "start_time": "2026-09-19T02:00:00+05:30",
    "end_time": "2026-09-19T05:00:00+05:30",
    "duration_minutes": 180,
    "participating_departments": ["ENGG", "TRD"],
    "shadow_time_saved_minutes": 120,
    "affected_train_numbers": ["12301"]
  }
}
```

### 4.2 `safety.digital_token_issued` (Feature #71 Digital Token)
কন্ট্রোলার কর্তৃক ফিল্ড গ্যাং সুপারভাইজারকে ডিজিটাল টোকেন হ্যান্ডওভার:
```json
{
  "event_id": "EVT-TOKN-8c9d0f23-5d4b-5b32",
  "event_type": "safety.digital_token_issued",
  "version": "1.0",
  "timestamp": "2026-09-18T09:25:15.340+05:30",
  "trace_id": "TRACE-9812402",
  "payload": {
    "token_code": "TKN-HWH-SEC4-20260918-X99",
    "block_id": "BLK-20260918-042",
    "issued_to_gang_code": "ENGG_GANG_04",
    "supervisor_username": "eng_supervisor_das",
    "issued_by_controller": "coa_delhi_chief",
    "section_code": "HWH-BWN-L1",
    "handover_timestamp": "2026-09-18T09:25:15+05:30",
    "status": "ISSUED_LINE_CLOSED"
  }
}
```

### 4.3 `train.delay_detected` (Feature #116 Schedule Deviation Detector)
NTES লাইভ ফিড থেকে ট্রেনের লেট শনাক্তকরণ ও তাৎক্ষণিক রিক্যালকুলেশন ট্রিগার:
```json
{
  "event_id": "EVT-TRN-1a2b3c4d-6e5f-4a11",
  "event_type": "train.delay_detected",
  "version": "1.0",
  "timestamp": "2026-09-18T09:25:30.005+05:30",
  "trace_id": "TRACE-9812403",
  "payload": {
    "train_no": "12305",
    "train_name": "Kolkata Rajdhani Express",
    "priority_class": "RAJDHANI",
    "reported_station": "ASANSOL_JN",
    "delay_minutes": 45,
    "current_speed_kmph": 115.5,
    "threatened_block_id": "BLK-20260918-042",
    "recalculation_enqueued": true
  }
}
```

### 4.4 `safety.ohe_isolated_loto` (Feature #73, #74 Power Isolation & LOTO)
ওভারহেড তারের বিদ্যুৎ বিচ্ছিন্নকরণ ও নিরাপত্তা লক নিশ্চিতকরণ:
```json
{
  "event_id": "EVT-LOTO-3d4e5f6a-7b8c-9d01",
  "event_type": "safety.ohe_isolated_loto",
  "version": "1.0",
  "timestamp": "2026-09-18T09:26:00.220+05:30",
  "trace_id": "TRACE-9812404",
  "payload": {
    "ptw_number": "PTW-TRD-20260918-009",
    "block_id": "BLK-20260918-042",
    "substation_code": "SUB_BWN_02",
    "ohe_feed_zone": "FEED_ZONE_BARDDHAMAN_SOUTH",
    "power_cut_confirmed": true,
    "loto_switch_padlock_id": "LOTO-PAD-8821",
    "safety_officer_verified": true
  }
}
```

### 4.5 `emergency.override_triggered` (Feature #79 SOS & Track Breach)
জরুরি ট্র্যাক ফ্র্যাকচার বা ট্রেন লাইনচ্যুত হওয়ার চরম সতর্কতা:
```json
{
  "event_id": "EVT-EMG-9a8b7c6d-5e4f-3a21",
  "event_type": "emergency.override_triggered",
  "version": "1.0",
  "timestamp": "2026-09-18T09:26:30.001+05:30",
  "trace_id": "TRACE-9812405",
  "payload": {
    "emergency_type": "TRACK_FRACTURE_REPORTED",
    "section_code": "HWH-BWN-L1",
    "exact_chainage_km": 24.600,
    "gps_coordinates": [22.784, 88.241],
    "reported_by": "track_patrol_kumar",
    "audio_alert_broadcast": true,
    "instant_signals_red": ["SIG_HWH_UP_24", "SIG_HWH_UP_25"]
  }
}
```

---

## 5. Producer & Consumer Architectural Patterns

### 5.1 Producer Pattern: At-Least-Once Delivery & Outbox
গুরুত্বপূর্ণ রেলওয়ে ইভেন্টগুলো ডেটাবেস ট্রানজ্যাকশনের সাথে সমন্বিত রেখে ডিসপ্যাচ করা হয়:

```python
# apps/blocks/services.py
from django.db import transaction
from apps.notifications.tasks import broadcast_websocket_event
from apps.blocks.models import BlockRequest

class BlockService:
    @transaction.atomic
    def approve_block(self, block_id, controller_user):
        block = BlockRequest.objects.select_for_update().get(id=block_id)
        block.status = "APPROVED"
        block.approved_by = controller_user
        block.save()

        # Transaction Commit নিশ্চিত হওয়ার পর ইভেন্ট পাঠানো
        transaction.on_commit(lambda: broadcast_websocket_event.delay(
            channel_group="ws:group:control_room",
            event_name="block.sanctioned_approved",
            payload={"block_id": str(block.id), "request_code": block.request_code}
        ))
        return block
```

### 5.2 Consumer Idempotency Pattern (Duplicate Elimination)
নেটওয়ার্ক বিভ্রাটের কারণে একই ইভেন্ট একাধিকবার পৌঁছালেও ডাবল এক্সিকিউশন রোধে Redis কি-লক:

```python
# apps/core/consumers.py
from django.core.cache import cache

def process_idempotent_event(event_id: str, event_handler_func, *args, **kwargs):
    idempotency_key = f"railway:event:processed:{event_id}"
    
    # Atomic SETNX: কী আগে থেকে থাকলে False রিটার্ন করে
    is_new = cache.add(idempotency_key, "PROCESSED", timeout=86400) # 24 Hours TTL
    if not is_new:
        logger.warning("DUPLICATE_EVENT_DROPPED", event_id=event_id)
        return None
        
    return event_handler_func(*args, **kwargs)
```

---

## 6. Celery Dedicated 4-Queue Worker Architecture & Dead Letter Queue (DLQ)

```
Celery Task Broker (Redis DB 2)
├── Queue 1: `high`          --> Worker 1 (Concurrency: 4, Prefetch: 1)
│   • Conflict Detection Engine, Emergency SOS Override
├── Queue 2: `notify`        --> Worker 2 (Concurrency: 8, I/O Bound)
│   • Twilio/CDAC SMS, Push Notifications, Telegram Bots
├── Queue 3: `symbolic_ai`   --> Worker 3 (Concurrency: 2, CPU/Memory Bound)
│   • Owlready2 Knowledge Graph, HermiT Reasoner Verification
└── Queue 4: `default_low`   --> Worker 4 (Concurrency: 2)
    • Sanction Order PDF Generation (#107), Audit Log Archive, Data Rollups
```

### 6.1 Dead Letter Queue (DLQ) ও Exponential Backoff Retry Policy
কোনো ব্যাকগ্রাউন্ড কাজ ব্যর্থ হলে স্বয়ংক্রিয় রিট্রাই নীতি:
- **প্রাথমিক ব্যাকঅফ (Initial Delay):** ২ সেকেন্ড
- **ব্যাকঅফ ফ্যাক্টর:** ২ গুণ (২s ➔ ৪s ➔ ৮s ➔ ১৬s ➔ ৩২s)
- **সর্বোচ্চ চেষ্টা (Max Retries):** ৫ বার
- **চূড়ান্ত ব্যর্থতা:** ৫ বার ব্যর্থ হলে টাস্কটি `railway:dlq:failed_tasks` সারিতে জমা হয় এবং অ্যাডমিনের কাছে CRITICAL নোটিফিকেশন পাঠায়।

```python
# apps/analytics/tasks.py
from celery import shared_task
import structlog

logger = structlog.get_logger()

@shared_task(
    bind=True,
    queue="default_low",
    max_retries=5,
    default_retry_delay=2,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=32,
    retry_jitter=True
)
def generate_sanction_pdf_task(self, block_id):
    try:
        from apps.analytics.services import SanctionPDFService
        return SanctionPDFService().generate(block_id)
    except Exception as exc:
        logger.error("PDF_GENERATION_RETRYING", block_id=block_id, attempt=self.request.retries, error=str(exc))
        raise self.retry(exc=exc)
```

---

## 7. Traceability to Subsequent Specification Documents

| Target Document | Direct Broker Dependency |
|:---|:---|
| **`01-tech-infra/04-internal-api-and-messaging.md`** | ইভেন্ট-চালিত আর্কিটেকচারের ওপর ভিত্তি করে সিঙ্ক বনাম অ্যাসিঙ্ক মেসেজিং কন্ট্রাক্ট ও সাগা প্যাটার্ন। |
| **`01-tech-infra/07-workers-consumers.md`** | ৪টি Celery কিউ কনফিগারেশন, রিট্রাই পলিসি ও ডকার কম্পোজ সার্ভিস ফাইল। |
| **`03-service-blueprints/01-block-planning-service.md`** | `block.combined_formed` ও `block.sanctioned_approved` ইভেন্ট হ্যান্ডলিং। |
