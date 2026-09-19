# 07-workers-consumers.md

> **ফাইল ক্রম:** ১১/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/06-security.md` (RBAC permissions, JWT blacklist, rate limiting, secret injection)  
> **পরবর্তী ফাইল:** `01-tech-infra/08-deployment.md`  
> **সংযোগ:** এই ফাইলে সংজ্ঞায়িত Celery Worker প্রসেস (`worker-high`, `worker-notify`, `worker-ontology`, `worker-low`, `worker-default`), Celery Beat শিডিউলার, এবং Django Channels (Daphne ASGI) WebSocket কনজিউমার `08-deployment.md`-এর Dockerfile, `docker-compose.yml`, এবং ক্লাউড ডিপ্লয়মেন্ট কনফিগারেশনে সরাসরি সার্ভিস কন্টেইনার হিসেবে ব্যবহৃত হবে।

---

## 1. Background Job Architecture

The asynchronous processing tier offloads all time-intensive, safety-critical, and third-party I/O tasks from the web server.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Django Web Layer (Gunicorn)                       │
│      (Triggers background tasks on HTTP requests or database signals)        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ Enqueue via Celery
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Redis 7 Broker (DB 2)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ Queue: high  │ │ Queue: notify│ │Queue:ontology│ │ Queue: default/low │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────────┬──────────┘  │
└─────────┼────────────────┼────────────────┼───────────────────┼─────────────┘
          │                │                │                   │
          ▼                ▼                ▼                   ▼
┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐
│  Worker (high)  ││ Worker (notify) ││Worker (ontology)││ Worker (default)│
│  • Overlap      ││ • Twilio SMS    ││ • Owlready2 OWL ││ • MySQL Audit   │
│    Conflict     ││ • Push alerts   ││ • HermiT Reason ││ • PDF Reports   │
│  • Emergency WS ││ • WhatsApp      ││ • SPARQL Graph  ││ • Cleanup jobs  │
└─────────────────┘└─────────────────┘└─────────────────┘└─────────────────┘
```

---

## 2. Celery Worker Architecture & Concurrency

### 2.1 Queue Routing Matrix

| Queue | Priority | Concurrency | Prefetch | Tasks Executed | SLA Target |
|-------|----------|-------------|----------|----------------|------------|
| `high` | 1 (Critical) | 4 threads | 1 | `blocks.tasks.detect_conflict`<br>`blocks.tasks.resolve_conflict`<br>`blocks.tasks.emergency_broadcast` | < 500ms |
| `notify` | 2 (High) | 4 threads | 2 | `notifications.tasks.send_sms`<br>`notifications.tasks.send_email`<br>`notifications.tasks.push_ws` | < 3s |
| `ontology` | 3 (Medium) | 2 threads | 1 | `ontology.tasks.sync_to_graph`<br>`ontology.tasks.run_reasoning`<br>`ontology.tasks.execute_sparql` | < 5s |
| `default` | 4 (Normal) | 4 threads | 4 | `analytics.tasks.create_audit_log`<br>`trains.tasks.update_schedule`<br>`blocks.tasks.cleanup_stale` | < 10s |
| `low` | 5 (Batch) | 1 thread | 1 | `analytics.tasks.generate_pdf`<br>`analytics.tasks.export_csv` | < 60s |

### 2.2 Worker Startup Commands

```bash
# High Priority Worker (Conflict & Emergency)
celery -A railway_ai worker -Q high -c 4 --loglevel=INFO -n worker_high@%h

# Notification Worker (Twilio SMS & Alerts)
celery -A railway_ai worker -Q notify -c 4 --loglevel=INFO -n worker_notify@%h

# Semantic Ontology Worker (Digital Twin Reasoning)
celery -A railway_ai worker -Q ontology -c 2 --loglevel=INFO -n worker_ontology@%h

# Default & Low Priority Worker (Audit, Reports)
celery -A railway_ai worker -Q default,low -c 4 --loglevel=INFO -n worker_default@%h
```

---

## 3. Django Channels WebSocket Consumers

Daphne runs as the ASGI server on port `8001` handling all persistent WebSocket connections.

### 3.1 Block & Map Stream Consumer

```python
# blocks/consumers.py
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()

class BlockStreamConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # 1. Extract JWT token from query string
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = dict(qc.split('=') for qc in query_string.split('&') if '=' in qc)
        token = params.get('token', None)

        if not token:
            await self.close(code=4001)
            return

        # 2. Authenticate user from JWT
        user = await self.get_user_from_token(token)
        if not user or not user.is_active:
            await self.close(code=4003)
            return

        self.user = user
        self.scope['user'] = user

        # 3. Join department and broadcast groups
        self.dept_group = f"ws:group:dept:{user.department_code}" if user.role != 'COA' else "ws:group:COA"
        await self.channel_layer.group_add(self.dept_group, self.channel_name)
        await self.channel_layer.group_add("ws:group:emergency", self.channel_name)
        await self.channel_layer.group_add(f"ws:user:{user.id}", self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'dept_group'):
            await self.channel_layer.group_discard(self.dept_group, self.channel_name)
            await self.channel_layer.group_discard("ws:group:emergency", self.channel_name)
            await self.channel_layer.group_discard(f"ws:user:{self.user.id}", self.channel_name)

    async def receive_json(self, content):
        # Handle client ping or section subscription
        action = content.get('action')
        if action == 'subscribe_section':
            section_id = content.get('section_id')
            await self.channel_layer.group_add(f"ws:group:section:{section_id}", self.channel_name)
        elif action == 'unsubscribe_section':
            section_id = content.get('section_id')
            await self.channel_layer.group_discard(f"ws:group:section:{section_id}", self.channel_name)

    # Event handlers for channel layer broadcasts
    async def block_update(self, event):
        await self.send_json({'type': 'block_update', 'payload': event['payload']})

    async def conflict_alert(self, event):
        await self.send_json({'type': 'conflict_alert', 'payload': event['payload']})

    async def emergency_broadcast(self, event):
        await self.send_json({'type': 'emergency_broadcast', 'payload': event['payload']})

    async def section_status_change(self, event):
        await self.send_json({'type': 'section_status_change', 'payload': event['payload']})

    @database_sync_to_async
    def get_user_from_token(self, token_str):
        try:
            token = AccessToken(token_str)
            user_id = token['user_id']
            return User.objects.select_related('department').get(id=user_id)
        except Exception:
            return None
```

---

## 4. Celery Beat Periodic Jobs Schedule

Celery Beat triggers recurring automated maintenance, simulation, and data sync tasks.

```python
# settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # 1. Simulate Train GPS Movement (Every 30 Seconds)
    'simulate_train_positions_every_30s': {
        'task': 'trains.tasks.simulate_train_gps_stream',
        'schedule': 30.0,
        'options': {'queue': 'default'}
    },

    # 2. Weather Advisory & Monsoon Alert Sync (Every 15 Minutes)
    'sync_weather_advisories_15m': {
        'task': 'analytics.tasks.sync_open_meteo_weather',
        'schedule': crontab(minute='*/15'),
        'options': {'queue': 'default'}
    },

    # 3. System Deep Health Check & Alert Digest (Every 5 Minutes)
    'system_health_check_every_5m': {
        'task': 'railway_ai.tasks.run_deep_health_audit',
        'schedule': crontab(minute='*/5'),
        'options': {'queue': 'high'}
    },

    # 4. Cleanup Stale Pending Blocks & Expired Drafts (Every Midnight)
    'daily_midnight_maintenance': {
        'task': 'blocks.tasks.archive_expired_blocks',
        'schedule': crontab(hour=0, minute=0),
        'options': {'queue': 'low'}
    },

    # 5. Daily Morning 6 AM Maintenance Summary Report
    'generate_morning_block_summary_6am': {
        'task': 'analytics.tasks.generate_daily_division_summary',
        'schedule': crontab(hour=6, minute=0),
        'options': {'queue': 'low'}
    }
}
```

---

## 5. Dead Letter Queue & Poison Pill Mitigation

### 5.1 Poison Pill Protection
A "poison pill" is a malformed task payload that repeatedly crashes the worker process. To mitigate this:
1. `max_retries = 3` is strictly enforced.
2. `task_reject_on_worker_lost = True` ensures orphaned tasks are not endlessly recycled.
3. Once retry limit is breached, the exception handler intercepts the task and routes the payload to the Redis Dead Letter Queue (`dlq:{queue_name}`).

### 5.2 Resilient Task Handler Implementation

```python
# notifications/tasks.py
import json
from celery import shared_task
from django.core.cache import cache
import logging

logger = logging.getLogger('railway_ai.tasks')

@shared_task(bind=True, max_retries=3, default_retry_delay=5, retry_backoff=True)
def send_sms_notification(self, recipient_phone, message_text, correlation_id=None):
    try:
        # Call Twilio API Client
        from services.twilio_client import twilio_service
        return twilio_service.send_message(recipient_phone, message_text)
    except Exception as exc:
        logger.warning(f"SMS delivery attempt {self.request.retries} failed for {recipient_phone}: {str(exc)}")
        if self.request.retries >= self.max_retries:
            # Route to Dead Letter Queue
            logger.error(f"Task {self.name} failed permanently. Routing to DLQ.")
            dlq_item = {
                "task_name": self.name,
                "args": [recipient_phone, message_text],
                "kwargs": {"correlation_id": correlation_id},
                "error": str(exc),
                "failed_at": str(timezone.now()),
                "retries": self.request.retries
            }
            redis_client = cache.client.get_client()
            redis_client.rpush("dlq:notify:sms", json.dumps(dlq_item))
            return {"status": "FAILED", "routed_to_dlq": True}
        
        raise self.retry(exc=exc)
```

---

## 6. Worker Scaling Strategy

| Stage | Infrastructure | Worker Configuration | Scaling Trigger |
|-------|----------------|----------------------|-----------------|
| **MVP (Current)** | Single Docker Host | 4 specialized Celery processes sharing 2 CPUs | Manual baseline |
| **Phase 2 (Division)** | Docker Compose / Multi-container | Scale `worker-high` to 2 containers, `worker-notify` to 2 containers | Redis Queue depth > 50 messages |
| **Phase 3 (Zonal)** | Kubernetes (HPA) | KEDA Autoscaler based on Redis list lengths: `high` queue target 5 tasks, `notify` target 20 tasks | CPU > 70% or Queue latency > 2s |

---

## 7. Next File Dependency Note

> পরবর্তী ফাইল: `01-tech-infra/08-deployment.md`

`07-workers-consumers.md` থেকে `08-deployment.md`-এ নেওয়া হবে:

| Worker Element | Deployment Requirement |
|----------------|------------------------|
| Gunicorn (WSGI) | Web process running on port `8000` handling DRF REST APIs |
| Daphne (ASGI) | Async process running on port `8001` handling WebSockets |
| Celery Workers | 4 independent container entrypoints (`worker_high`, `worker_notify`, `worker_ontology`, `worker_default`) |
| Celery Beat | Single singleton container running scheduler daemon |
| Redis Service | Redis 7 container with persistence volume and port `6379` |
| MySQL Service | MySQL 8.0 container with InnoDB tablespace persistence on port `3306` |

`08-deployment.md`-এ নিচের বিষয়গুলো থাকবে:
- Complete `docker-compose.yml` defining all backend, frontend, worker, database, and cache containers
- Production Dockerfiles (Backend Django & Frontend Vite)
- Nginx reverse proxy configuration (HTTP to Gunicorn, `/ws/` to Daphne, static file serving)
- CI/CD automated pipeline (`.github/workflows/deploy.yml`)
- Environment variable configuration strategy for Dev, Staging, and Production
