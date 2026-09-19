# 03-event-brokers.md

> **ফাইল ক্রম:** ৭/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/02-data-layer.md` (Redis cache keys, MySQL tables, audit_logs, JSON fields)  
> **পরবর্তী ফাইল:** `01-tech-infra/04-internal-api-and-messaging.md`  
> **সংযোগ:** এই ফাইলে নির্ধারিত event topic names (`block.status_changed`, `section.status_changed`, `notification.sent`) এবং message schemas `04-internal-api-and-messaging.md`-এর service-to-service communication pattern (sync vs async), circuit breaker thresholds, এবং distributed transaction (SAGA) design-এ ব্যবহৃত হবে।

---

## 1. Broker Selection & Topology

**Selected:** Redis 7 (Pub/Sub + Lists + Streams)

**Rejected Alternatives:**
- **Apache Kafka:** Rejected — ৩ দিনের হ্যাকাথনে Zookeeper/KRaft + Broker cluster ম্যানেজ করার অপারেশনাল ওভারহেড অপ্রয়োজনীয়; MVP স্কেলে অতিরিক্ত জটিল।
- **RabbitMQ:** Rejected — AMQP প্রটোকল, পৃথক Erlang VM, এবং অতিরিক্ত কানেকশন হ্যান্ডলিং লাগে; Python/Django ইকোসিস্টেমে Redis অনেক বেশি নেটিভ।
- **AWS SQS / Google Cloud Pub/Sub:** Rejected — ক্লাউড ভেন্ডর লক-ইন এবং ইন্টারনেট ডিপেনডেন্সি থাকে, লোকাল অফলাইন ডেভেলপমেন্ট ও হ্যাকাথন ডেমোতে জটিলতা তৈরি করে।

**Redis Justification:**
- Django Channels-এর সাথে অফিসিয়াল নেটিভ `channels_redis` লাইব্রেরি সাপোর্ট।
- Celery-র দ্রুততম ও নির্ভরযোগ্য মেসেজ ব্রোকার।
- ক্যাশিং, সেশন, রিয়েল-টাইম পাব/সাব এবং ব্যাকগ্রাউন্ড টাস্ক কিউ—সব একটি সিঙ্গেল ইনফ্রাস্ট্রাকচার ইউনিটে চলে।
- মেমোরি-ভিত্তিক অতিদ্রুত কার্যক্ষমতা (< 5ms পাবলিশ লেটেন্সি), যা রিয়েল-টাইম রেলওয়ে অ্যালার্টের জন্য অত্যন্ত গুরুত্বপূর্ণ।

**Topology (MVP / Phase 1):**
- Single Redis 7 Instance
- Memory Limit: 512MB
- Persistence: AOF (Append Only File) `fsync everysec` (কিউ ডিউরেবিলিটি নিশ্চিত করতে)
- Database Separation:
  - `DB 0`: Cache & Rate Limiting
  - `DB 1`: Django Session & JWT Blacklist
  - `DB 2`: Celery Task Queue
  - `DB 3`: Django Channels Layer

---

## 2. Redis Pub/Sub Channel Topology

### 2.1 WebSocket Broadcast Channels (Django Channels)

| Channel Name Pattern | Purpose | Producers | Consumers |
|---------------------|---------|-----------|-----------|
| `ws:group:dept:ENG` | Engineering department updates | blocks, ontology | ENG dashboard clients |
| `ws:group:dept:TRD` | Traction department updates | blocks, ontology | TRD dashboard clients |
| `ws:group:dept:SNT` | Signal department updates | blocks, ontology | SNT dashboard clients |
| `ws:group:dept:COA` | Control room updates | all apps | COA dashboard + Big Screen |
| `ws:group:section:{section_id}` | Section-specific alerts | blocks, trains | Map clients viewing that section |
| `ws:group:emergency` | Emergency broadcast (all hands) | blocks | All connected clients |
| `ws:user:{user_id}` | Personal notifications | notifications | Specific user's browser |

**Channel Layer Configuration:**
```python
# settings.py
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
            "prefix": "railway_ai",
            "capacity": 1500,  # Max messages in channel
            "expiry": 10,      # Message expiry in seconds
        },
    }
}
```

### 2.2 Application Event Channels (Redis Pub/Sub)

| Channel | Event Type | Payload Size | Frequency |
|---------|------------|--------------|-----------|
| `events:block` | Block lifecycle updates | < 2 KB | 10/min peak |
| `events:conflict` | Conflict detection & resolution | < 3 KB | 2/min |
| `events:ontology` | Digital twin semantic sync | < 5 KB | 5/min |
| `events:notification` | Alert dispatch & delivery | < 1 KB | 20/min peak |
| `events:audit` | Audit trail recording | < 4 KB | 30/min |
| `events:train` | Train position updates | < 1 KB | Every 30s (simulated) |

---

## 3. Event Topic Catalog

| Event Name | Topic / Channel | Producer | Consumers | Schema Version | Frequency | PII? |
|------------|-----------------|----------|-----------|----------------|-----------|------|
| `block.created` | `events:block` | blocks app | notifications, ontology, audit | v1 | High | No (IDs only) |
| `block.approved` | `events:block` | blocks app | notifications, ontology, ws:COA | v1 | Medium | No |
| `block.rejected` | `events:block` | blocks app | notifications, ws:dept | v1 | Low | No |
| `block.completed` | `events:block` | blocks app | notifications, ontology, audit | v1 | Medium | No |
| `block.emergency` | `events:block` | blocks app | ws:emergency, notifications | v1 | Low | No |
| `block.status_changed` | `events:block` | blocks app | audit, ws:section | v1 | High | No |
| `conflict.detected` | `events:conflict` | blocks app | ws:COA, notifications | v1 | Low | No |
| `conflict.resolved` | `events:conflict` | blocks app | ws:dept, notifications | v1 | Low | No |
| `section.status_changed` | `events:block` | blocks app | ws:section, map clients | v1 | High | No |
| `ontology.sync_requested` | `events:ontology` | blocks app (signal) | ontology app (celery) | v1 | Medium | No |
| `ontology.reasoning_complete` | `events:ontology` | ontology app | analytics, ws:COA | v1 | Low | No |
| `notification.sent` | `events:notification` | notifications app | audit | v1 | High | Yes (phone) |
| `notification.failed` | `events:notification` | notifications app | DLQ, audit | v1 | Low | Yes (phone) |
| `train.position_updated` | `events:train` | trains app (cron) | ws:section, map clients | v1 | Continuous | No |
| `train.delayed` | `events:train` | trains app | notifications, ws:COA | v1 | Medium | No |
| `audit.record_created` | `events:audit` | all apps | audit app (async insert) | v1 | High | Yes (IP, agent) |
| `crew.assigned` | `events:block` | blocks app | departments, ws:dept | v1 | Medium | No |
| `material.low_stock` | `events:notification` | departments app | notifications, ws:COA | v1 | Low | No |

---

## 4. Message Schemas

### 4.1 Block Lifecycle Event (`block.created`)

```json
{
  "event_id": "evt_550e8400-e29b-41d4-a716-446655440000",
  "event_type": "block.created",
  "version": "1",
  "timestamp": "2026-09-02T15:30:00+05:30",
  "producer": "blocks",
  "correlation_id": "req_abc123xyz",
  "payload": {
    "block_id": "BLK-20260902-089",
    "block_uuid": "550e8400-e29b-41d4-a716-446655440001",
    "department": "ENG",
    "section_id": "sec_hwh_kgp",
    "section_name": "Howrah-Kharagpur",
    "from_km": 15.00,
    "to_km": 20.50,
    "start_time": "2026-09-03T02:00:00+05:30",
    "end_time": "2026-09-03T04:00:00+05:30",
    "priority": "CRITICAL",
    "work_type": "Track Crack Repair",
    "requester_id": "usr_42",
    "emergency": false
  }
}
```

### 4.2 Conflict Event (`conflict.detected`)

```json
{
  "event_id": "evt_550e8400-e29b-41d4-a716-446655440002",
  "event_type": "conflict.detected",
  "version": "1",
  "timestamp": "2026-09-02T15:35:00+05:30",
  "producer": "blocks",
  "correlation_id": "req_def456uvw",
  "payload": {
    "conflict_id": "CNF-20260902-012",
    "primary_block_id": "BLK-20260902-089",
    "primary_dept": "ENG",
    "conflicting_block_id": "BLK-20260902-090",
    "conflicting_dept": "TRD",
    "section_id": "sec_hwh_kgp",
    "overlap_start": "2026-09-03T02:30:00+05:30",
    "overlap_end": "2026-09-03T04:00:00+05:30",
    "conflict_type": "TIME_OVERLAP",
    "severity": "HIGH",
    "ai_resolution": {
      "suggestion": "SPLIT_BLOCK",
      "primary_slot": "02:00-04:00",
      "conflicting_slot": "04:30-06:30",
      "explanation_bn": "ট্র্যাক ফাটল মেরামতের অগ্রাধিকার বেশি হওয়ায় ইঞ্জিনিয়ারিং বিভাগকে ১ম স্লট দেওয়া হলো।"
    }
  }
}
```

### 4.3 Section Status Change (`section.status_changed`)

```json
{
  "event_id": "evt_550e8400-e29b-41d4-a716-446655440003",
  "event_type": "section.status_changed",
  "version": "1",
  "timestamp": "2026-09-02T15:40:00+05:30",
  "producer": "blocks",
  "correlation_id": "req_hwh789xyz",
  "payload": {
    "section_id": "sec_hwh_kgp",
    "section_name": "Howrah-Kharagpur",
    "old_status": "FREE",
    "new_status": "BLOCKED",
    "active_block_id": "BLK-20260902-089",
    "department": "ENG",
    "block_start": "2026-09-03T02:00:00+05:30",
    "block_end": "2026-09-03T04:00:00+05:30",
    "affected_trains": [
      {
        "train_no": "12301",
        "train_name": "Rajdhani Express",
        "impact": "DELAY_45_MIN",
        "passenger_count": 1200
      }
    ]
  }
}
```

### 4.4 Ontology Sync Event (`ontology.sync_requested`)

```json
{
  "event_id": "evt_550e8400-e29b-41d4-a716-446655440004",
  "event_type": "ontology.sync_requested",
  "version": "1",
  "timestamp": "2026-09-02T15:30:05+05:30",
  "producer": "blocks",
  "correlation_id": "req_onto_001",
  "payload": {
    "entity_type": "BlockEvent",
    "entity_id": "BLK-20260902-089",
    "operation": "CREATE",
    "rdf_triples": [
      {
        "subject": "BlockEvent_BLK20260902089",
        "predicate": "rdf:type",
        "object": "BlockEvent"
      },
      {
        "subject": "BlockEvent_BLK20260902089",
        "predicate": "affectsSection",
        "object": "Section_HWH_KGP"
      },
      {
        "subject": "BlockEvent_BLK20260902089",
        "predicate": "hasPriority",
        "object": "CRITICAL"
      }
    ],
    "reasoning_required": true
  }
}
```

### 4.5 Notification Event (`notification.sent`)

```json
{
  "event_id": "evt_550e8400-e29b-41d4-a716-446655440005",
  "event_type": "notification.sent",
  "version": "1",
  "timestamp": "2026-09-02T15:30:10+05:30",
  "producer": "notifications",
  "correlation_id": "req_sms_445",
  "payload": {
    "notification_id": "NTF-20260902-045",
    "type": "SMS",
    "recipient_id": "usr_42",
    "recipient_phone": "+91*****1234",
    "block_id": "BLK-20260902-089",
    "message": "Block BLK-20260902-089 approved. Report at Bardhaman 01:30.",
    "message_bn": "ব্লক BLK-20260902-089 অনুমোদিত। বর্ধমানে ০১:৩০-এ রিপোর্ট করুন।",
    "provider": "twilio",
    "status": "SENT",
    "sid": "SM1234567890abcdef"
  }
}
```

---

## 5. Celery Task Routing & Queues

### 5.1 Queue Configuration

```python
# settings.py
CELERY_TASK_ROUTES = {
    # High priority — conflict resolution, emergency broadcasts
    'blocks.tasks.detect_conflict': {'queue': 'high'},
    'blocks.tasks.resolve_conflict': {'queue': 'high'},
    'blocks.tasks.emergency_broadcast': {'queue': 'high'},
    
    # Notifications — SMS, email, push, websocket
    'notifications.tasks.send_sms': {'queue': 'notify'},
    'notifications.tasks.send_email': {'queue': 'notify'},
    'notifications.tasks.push_ws': {'queue': 'notify'},
    
    # Ontology — semantic graph sync, reasoning
    'ontology.tasks.sync_to_graph': {'queue': 'ontology'},
    'ontology.tasks.run_reasoning': {'queue': 'ontology'},
    'ontology.tasks.execute_sparql': {'queue': 'ontology'},
    
    # Analytics & Reports — PDF generation, heavy impact math
    'analytics.tasks.generate_pdf': {'queue': 'low'},
    'analytics.tasks.calculate_impact': {'queue': 'low'},
    'analytics.tasks.export_csv': {'queue': 'low'},
    
    # Default — general database maintenance & audit logs
    '*': {'queue': 'default'},
}

CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # Fair task distribution
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
```

### 5.2 Worker Concurrency Table

| Queue | Worker Processes | Concurrency | Task Types |
|-------|------------------|-------------|------------|
| `high` | 2 workers | 4 threads | Conflict detection, emergency override |
| `notify` | 2 workers | 4 threads | SMS via Twilio, WebSocket broadcast |
| `ontology` | 1 worker | 2 threads | OWL 2 sync, SPARQL reasoning |
| `low` | 1 worker | 1 thread | PDF report generation, CSV export |
| `default` | 2 workers | 4 threads | General CRUD, MySQL audit logging |

### 5.3 Retry Policy

```python
# tasks.py
from celery import shared_task
from twilio.base.exceptions import TwilioRestException

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
)
def send_sms_task(self, phone, message):
    try:
        # Twilio API call
        return twilio_client.messages.create(to=phone, body=message)
    except TwilioRestException as exc:
        raise self.retry(exc=exc)
```

---

## 6. Dead Letter Queue (DLQ) Strategy

DLQ is implemented via Redis Lists with structured error payloads.

### 6.1 DLQ Channels

| DLQ Key | Source Queue | Failure Condition | Retention | Action |
|---------|--------------|-------------------|-----------|--------|
| `dlq:notify:sms` | `notify` | Twilio API error, invalid phone | 7 days | Manual retry via admin |
| `dlq:ontology:sync` | `ontology` | Ontology file locked, parse error | 7 days | Auto-retry on unlock |
| `dlq:high:conflict` | `high` | MySQL deadlock / timeout | 1 day | Immediate auto-retry |
| `dlq:low:pdf` | `low` | PDF renderer crash | 3 days | Manual re-trigger |

### 6.2 DLQ Processing Command

```python
# management command: python manage.py process_dlq --queue notify --max 10
import json
from django.core.management.base import BaseCommand
from django.core.cache import cache
from celery import current_app

class Command(BaseCommand):
    help = "Process Dead Letter Queue items"

    def add_arguments(self, parser):
        parser.add_argument('--queue', type=str, default='notify')
        parser.add_argument('--max', type=int, default=10)

    def handle(self, *args, **options):
        queue_name = options['queue']
        max_items = options['max']
        dlq_key = f"dlq:{queue_name}"
        redis_client = cache.client.get_client()

        for _ in range(max_items):
            item = redis_client.lpop(dlq_key)
            if not item:
                self.stdout.write("DLQ is empty.")
                break
            event = json.loads(item)
            current_app.send_task(event['task_name'], args=event['args'], queue=queue_name)
            self.stdout.write(f"Re-queued task: {event['task_name']}")
```

---

## 7. Idempotency Key Generation

**Purpose:** Prevent duplicate processing (e.g., button double-clicks, retry storms).

### 7.1 Key Generation Strategy

| Event Type | Idempotency Key Format | Storage | TTL |
|------------|------------------------|---------|-----|
| **Block Create** | `idemp:block:create:{requester_id}:{section_id}:{start_time_iso}` | Redis | 5 min |
| **Block Approve** | `idemp:block:approve:{block_id}:{approver_id}` | Redis | 10 min |
| **SMS Send** | `idemp:sms:{phone}:{message_hash}` | Redis | 1 hour |
| **Ontology Sync** | `idemp:onto:{entity_type}:{entity_id}:{operation}` | Redis | 10 min |
| **Emergency Block** | `idemp:emergency:{requester_id}:{timestamp_minute}` | Redis | 15 min |

### 7.2 Implementation

```python
# utils/idempotency.py
import hashlib
from django.core.cache import cache

def get_idempotency_key(operation, **params):
    key_parts = [operation] + [f"{k}={v}" for k, v in sorted(params.items())]
    raw_key = "|".join(key_parts)
    return f"idemp:{hashlib.sha256(raw_key.encode()).hexdigest()[:16]}"

def check_idempotent(key, ttl=300):
    """Returns True if already processed (duplicate), False if first time."""
    if cache.get(key):
        return True
    cache.set(key, "1", ttl)
    return False
```

---

## 8. Producer & Consumer Patterns

### 8.1 Fire-and-Forget (Audit Logs)

```python
# Producer (non-blocking)
from django.db.models.signals import post_save
from django.dispatch import receiver
from blocks.models import BlockRequest
import json

@receiver(post_save, sender=BlockRequest)
def emit_audit_event(sender, instance, created, **kwargs):
    event = {
        "event_type": "audit.record_created",
        "payload": {
            "table_name": "block_requests",
            "record_id": str(instance.id),
            "action": "CREATE" if created else "UPDATE",
        }
    }
    redis_client.publish("events:audit", json.dumps(event))
```

### 8.2 At-Least-Once (Notifications)

```python
# Producer with retries
@shared_task(bind=True, max_retries=3)
def send_block_approval_sms(self, block_id, user_id):
    from blocks.models import BlockRequest
    from django.contrib.auth import get_user_model
    User = get_user_model()

    block = BlockRequest.objects.get(id=block_id)
    user = User.objects.get(id=user_id)
    message = f"Block {block.block_code} approved for {block.section.name}."
    send_sms_task.delay(phone=user.phone, message=message)
```

### 8.3 Exactly-Once (Ontology Sync with Idempotency)

```python
@shared_task(bind=True)
def sync_block_to_ontology(self, block_id):
    idem_key = get_idempotency_key("onto:sync", entity_id=block_id, op="CREATE")
    if check_idempotent(idem_key, ttl=600):
        return
    
    manager = DigitalTwinManager()
    manager.sync_block(block_id)
    
    redis_client.publish("events:ontology", json.dumps({
        "event_type": "ontology.reasoning_complete",
        "payload": {"block_id": block_id}
    }))
```

---

## 9. Next File Dependency Note

> পরবর্তী ফাইল: `01-tech-infra/04-internal-api-and-messaging.md`

`03-event-brokers.md` থেকে `04-internal-api-and-messaging.md`-এ নেওয়া হবে:

| Event Broker Element | Internal API Impact |
|---------------------|---------------------|
| `events:block` topic | Sync/async boundary — `POST /api/v1/blocks/` sync MySQL response vs async event broadcast |
| `events:conflict` topic | Circuit breaker on AI Resolver — if Gemini fails, fallback to local rule-engine |
| `events:ontology` topic | Inter-service coordination — ontology background worker updates semantic digital twin |
| `ws:group:*` channels | Dynamic WebSocket connection grouping by department and active section |
| Celery queues | Distributed transaction (SAGA) — block approval saga: MySQL update → SMS queue → Ontology queue → Audit queue |
| DLQ strategy | Compensating transaction strategy for unrecoverable third-party failures |
| Idempotency keys | HTTP `Idempotency-Key` header on mutating POST endpoints |

`04-internal-api-and-messaging.md`-এ নিচের বিষয়গুলো থাকবে:
- Sync vs Async communication pattern matrix
- Service discovery (Django app registry)
- API versioning strategy (`/api/v1/`)
- Circuit breaker configuration (Gemini API, Twilio API)
- Retry & timeout policies per service
- Distributed transaction: Block approval SAGA pattern with compensating actions
- Distributed tracing with Correlation ID propagation
