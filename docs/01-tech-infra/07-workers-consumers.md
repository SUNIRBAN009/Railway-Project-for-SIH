# 07-workers-consumers.md

> **ফাইল ক্রম:** ১১/৪৫  
> **ডিরেক্টরি:** `01-tech-infra/`  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/06-security.md` (RBAC, সিক্রেট ম্যানেজমেন্ট, পারমিশন)  
> **পরবর্তী ফাইল:** `01-tech-infra/08-deployment.md` (ডকার, কন্টেইনার কম্পোজিশন, ক্লাউড আর্কিটেকচার)  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ৪টি মূল স্তম্ভ), `ai-project-spec-generator (1).md`।  
> **টাস্ক ও ব্রোকার ইঞ্জিন:** **Celery 5.3 + Celery Beat + Redis 7 (DB 2)**, ৪টি ডেডিকেটেড কিউ (`high`, `notify`, `symbolic_ai`, `default_low`) এবং **PostgreSQL 15/16 + PostGIS** (নো MySQL)।

---

## 1. Background Job Architecture

রেলওয়ে সিস্টেমের জটিল এআই অপ্টিমাইজেশন, এনটিইএস ডিলে ক্যাসকেড প্রসেসিং, ডিজিটাল টোকেন হ্যান্ডওভার এবং হেভি স্যাংশন পিডিএফ জেনারেশনকে ওয়েব সার্ভার (Gunicorn) থেকে সম্পূর্ণ বিচ্ছিন্ন করে ব্যাকগ্রাউন্ড সেলিরি ওয়ার্কারদের ওপর ন্যস্ত করা হয়েছে:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                             Django Application Layer (Gunicorn)                         │
│                    (Emits background tasks on HTTP requests or DB commits)              │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼ Enqueue via Celery (Redis DB 2)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                Celery 5.3 Broker Topology                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  ┌────────────────┐ │
│  │  Queue: high   │  │  Queue: notify │  │   Queue: symbolic_ai   │  │Queue:default_low││
│  └────────┬───────┘  └────────┬───────┘  └───────────┬────────────┘  └───────┬────────┘ │
└───────────┼───────────────────┼──────────────────────┼───────────────────────┼──────────┘
            │                   │                      │                       │
            ▼                   ▼                      ▼                       ▼
┌───────────────────┐ ┌───────────────────┐ ┌──────────────────────┐ ┌────────────────────┐
│   Worker: high    │ │  Worker: notify   │ │  Worker: symbolic_ai │ │ Worker: default_low│
│ • Conflict Engine │ │ • Twilio/CDAC SMS │ │ • Owlready2 Graph    │ │ • ReportLab PDF Gen│
│ • Delay Cascade   │ │ • WebSocket Push  │ │ • HermiT Reasoner    │ │ • Defect Aging #93 │
│ • Emergency SOS   │ │ • Telegram Bots   │ │ • SHACL Rule Verify  │ │ • PostgreSQL Audit │
└───────────────────┘ └───────────────────┘ └──────────────────────┘ └────────────────────┘
```

---

## 2. Dedicated 4-Queue Routing Matrix & Concurrency

| Queue Name | Priority Level | Concurrency Pool | Prefetch Count | Assigned Tasks (Feature Alignment) | Target SLA |
|:---|:---:|:---:|:---:|:---|:---:|
| **`high`** | **1 (Critical)** | ৪ থ্রেড (CPU) | ১ | `blocks.tasks.detect_conflicts_task`<br>`trains.tasks.recalculate_delay_cascade_task` (#115)<br>`emergency.tasks.process_emergency_override_task` (#79) | **< ৫০০ ms** |
| **`notify`** | **2 (High)** | ৮ থ্রেড (I/O) | ৪ | `notifications.tasks.send_crew_sms_task`<br>`notifications.tasks.broadcast_websocket_event`<br>`safety.tasks.deliver_digital_token_sms` (#71) | **< ২ সে.** |
| **`symbolic_ai`**| **3 (Compute)**| ২ থ্রেড (Memory)| ১ | `ontology.tasks.run_hermit_reasoner_task`<br>`ontology.tasks.sync_digital_twin_graph`<br>`ontology.tasks.verify_shacl_safety_rules` | **< ৫ সে.** |
| **`default_low`**| **4 (Batch)** | ২ থ্রেড (General)| ২ | `analytics.tasks.generate_sanction_pdf_task` (#107)<br>`maintenance.tasks.recalculate_defect_aging_task` (#93)<br>`analytics.tasks.rollup_shift_kpi_task` (#50) | **< ৬০ সে.** |

---

## 3. Production Worker Startup Configuration (`config/celery.py`)

```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("railway_block_ai")
app.config_from_object("django.conf:settings", namespace="CELERY")

# Queue Routing Definition
app.conf.task_routes = {
    "apps.blocks.tasks.detect_conflicts_task": {"queue": "high"},
    "apps.trains.tasks.recalculate_delay_cascade_task": {"queue": "high"},
    "apps.emergency.tasks.*": {"queue": "high"},
    
    "apps.notifications.tasks.*": {"queue": "notify"},
    "apps.safety.tasks.deliver_digital_token_sms": {"queue": "notify"},
    
    "apps.ontology.tasks.*": {"queue": "symbolic_ai"},
    
    "apps.analytics.tasks.generate_sanction_pdf_task": {"queue": "default_low"},
    "apps.maintenance.tasks.*": {"queue": "default_low"},
    "apps.core.tasks.*": {"queue": "default_low"},
}

app.conf.task_default_queue = "default_low"
app.autodiscover_tasks()
```

### 3.1 Worker Execution Commands
```bash
# 1. High-Priority Queue Worker (Real-time Safety & Delays)
celery -A config worker -Q high -c 4 --loglevel=INFO -n worker_high@%h

# 2. Notification Worker (SMS & WebSocket Broadcasts)
celery -A config worker -Q notify -c 8 --loglevel=INFO -n worker_notify@%h

# 3. Symbolic AI Worker (Digital Twin & HermiT Reasoner)
celery -A config worker -Q symbolic_ai -c 2 --loglevel=INFO -n worker_symbolic_ai@%h

# 4. Default & Low Priority Worker (PDF Generation & Audits)
celery -A config worker -Q default_low -c 2 --loglevel=INFO -n worker_default_low@%h
```

---

## 4. Scheduled Periodic Jobs (Celery Beat Orchestration)

সিস্টেমের সার্বক্ষণিক মনিটরিং ও স্বয়ংক্রিয় রক্ষণাবেক্ষণের জন্য Celery Beat শিডিউল:

```python
# config/settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Feature #116: প্রতি ৩০ সেকেন্ডে NTES ডিলে ফিড সিঙ্ক ও শিডিউল ডেভিয়েশন ডিটেকশন
    "sync-ntes-live-delays-30s": {
        "task": "apps.trains.tasks.sync_ntes_live_delays_task",
        "schedule": 30.0,
        "options": {"queue": "high"},
    },
    
    # Feature #75: প্রতি ১৫ মিনিটে ওপেন-মেটিও ওয়েদার চেক (Weather Gate)
    "poll-weather-hazards-15m": {
        "task": "apps.blocks.tasks.poll_weather_hazards_task",
        "schedule": crontab(minute="*/15"),
        "options": {"queue": "notify"},
    },
    
    # Feature #93: প্রতিদিন রাত ০০:০১ মিনিটে ডিফেক্ট এজিং ও প্রায়োরিটি স্কোর রিক্যালকুলেশন
    "recalculate-defect-aging-daily": {
        "task": "apps.maintenance.tasks.recalculate_defect_aging_task",
        "schedule": crontab(hour=0, minute=1),
        "options": {"queue": "default_low"},
    },
    
    # Feature #71: প্রতি ১ ঘণ্টায় অব্যবহৃত মেয়াদোত্তীর্ণ ডিজিটাল টোকেন বাতিলকরণ
    "cleanup-expired-digital-tokens-hourly": {
        "task": "apps.blocks.tasks.cleanup_expired_tokens_task",
        "schedule": crontab(minute=0),
        "options": {"queue": "default_low"},
    },
    
    # Feature #53: প্রতি ৮ ঘণ্টায় শিফট হ্যান্ডওভার ও অ্যাসেট ইউটিলাইজেশন KPI রিপোর্ট তৈরি
    "generate-shift-kpi-report-8h": {
        "task": "apps.analytics.tasks.rollup_shift_kpi_task",
        "schedule": crontab(minute=0, hour="6,14,22"),
        "options": {"queue": "default_low"},
    },
}
```

---

## 5. Dead Letter Queue (DLQ) & Fault Tolerance Pattern

কোনো টাস্ক বাহ্যিক সংযোগ বা সাময়িক কারণে ব্যর্থ হলে স্বয়ংক্রিয় রিট্রাই নীতি:

```
[Task Triggered]
       │
       ▼ (Executes)
[Task Fails?] ──► No ──► [Success / Prometheus Metric Logged]
       │
       ▼ Yes (Retries 1 to 5 with Exponential Jitter Backoff: 2s ➔ 4s ➔ 8s ➔ 16s ➔ 32s)
[Max Retries Exceeded? (5 Retries)]
       │
       ▼ Yes
[Route to Dead Letter Queue: `railway:dlq:failed_tasks`]
       │
       ├──► Emit Alertmanager P2/P1 Warning
       └──► Persist in PostgreSQL `core_failedtasklog` for Administrative Triage
```

### 5.1 Fault-Tolerant Task Implementation Example
```python
# apps/blocks/tasks.py
from celery import shared_task
import structlog

logger = structlog.get_logger()

@shared_task(
    bind=True,
    queue="high",
    max_retries=5,
    default_retry_delay=2,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=32,
    retry_jitter=True,
)
def detect_conflicts_task(self, block_request_id):
    try:
        from apps.blocks.services import ConflictDetectionEngine
        return ConflictDetectionEngine().evaluate_request(block_request_id)
    except Exception as exc:
        logger.error(
            "TASK_EXECUTION_FAILED_RETRIED",
            task_id=self.request.id,
            queue="high",
            block_request_id=block_request_id,
            attempt=self.request.retries,
            error=str(exc)
        )
        raise self.retry(exc=exc)
```

---

## 6. Django Channels WebSocket Consumers (Daphne ASGI)

কন্ট্রোল রুম ও ফিল্ড অ্যাপ্লিকেশনে পুশ মেসেজ সরবরাহের জন্য Daphne পোর্ট `8001`-এ রিয়েল-টাইম ইভেন্ট কনজিউমার:

```python
# apps/notifications/consumers.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from apps.accounts.services import verify_jwt_token_async

class ControlRoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # 1. Authenticate via JWT from WebSocket Query String
        token = self.scope.get("query_string", b"").decode("utf-8").split("token=")[-1]
        user = await verify_jwt_token_async(token)
        
        if not user or not user.is_active:
            await self.close(code=4001)
            return

        self.user = user
        self.division = user.division
        self.room_group_name = f"ws_division_{self.division}"

        # 2. Join Division Broadcast Group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.channel_layer.group_add("ws_emergency_all", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            await self.channel_layer.group_discard("ws_emergency_all", self.channel_name)

    # Handler for WebSocket Broadcast Event
    async def dispatch_event(self, event):
        await self.send_json({
            "event": event["event_name"],
            "data": event["payload"],
            "timestamp": event["timestamp"]
        })
```

---

## 7. Container Resource Allocation & Scaling Strategy

ডকার কম্পোজ (`docker-compose.yml`)-এ সেলিরি ওয়ার্কারদের জন্য সংজ্ঞায়িত রিসোর্স কোটা:

| Container Service | CPU Limit | Memory Limit | Graceful Shutdown Timeout (`SIGTERM`) | Scaling Trigger |
|:---|:---:|:---:|:---:|:---|
| `railway_celery_high` | ১.০ Core | ১ GB | ১৫ সেকেন্ড | `queue_depth > 20` |
| `railway_celery_notify`| ০.৫ Core | ৫১২ MB | ১০ সেকেন্ড | `queue_depth > 100` |
| `railway_celery_symbolic_ai`| ১.৫ Core | ২ GB (HermiT Reasoner) | ৩০ সেকেন্ড | `queue_depth > 10` |
| `railway_celery_default_low`| ০.৫ Core | ১ GB | ৬০ সেকেন্ড (PDF Generation) | `queue_depth > 50` |

---

## 8. Traceability to Subsequent Infrastructure Documents

| Target Document | Direct Worker / Consumer Dependency |
|:---|:---|
| **`01-tech-infra/08-deployment.md`** | ডকার কম্পোজে ৪টি Celery ওয়ার্কার ও Beat সার্ভিসের মাল্টি-কন্টেইনার বিল্ড কনফিগারেশন। |
| **`01-tech-infra/09-testing-strategy.md`** | Celery টাস্ক টেস্টিং (`CELERY_TASK_ALWAYS_EAGER=True`) এবং মক ব্রোকার টেস্ট। |
| **`09-execution-tracker/00-implementation-checklist.md`** | প্রতিটি ব্যাকগ্রাউন্ড টাস্ক তৈরি ও আউটপুট ভেরিফিকেশনের চেকলিস্ট প্রুফ। |
