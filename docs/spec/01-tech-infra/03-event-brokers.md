# 03-event-brokers.md

> **File Order:** 7/45  
> **Previous File:** `01-tech-infra/02-data-layer.md` (Data Storage & Redis Cache)  
> **Next File:** `01-tech-infra/04-internal-api-and-messaging.md`  
> **Connection:** The Event Brokers detailed here (Redis Pub/Sub & Celery) rely on the Redis instance specified in the Data Layer, and they facilitate the Internal Messaging patterns described in the next file.

---

## 1. Event Broker Strategy

The AI Block Planning platform relies heavily on asynchronous event processing and real-time WebSocket broadcasting. Since the architecture is a Modular Monolith, we do not need heavy enterprise service buses (ESB) like Apache Kafka or RabbitMQ. 

**Decision:** We use **Redis (v7+)** as our universal event broker.

Redis handles three distinct broker responsibilities:
1. **Django Channels Layer:** Pub/Sub for real-time WebSocket communication.
2. **Celery Task Broker:** Queue management for background tasks (SMS, PDF, AI).
3. **Internal Event Bus (Future Scope):** Decoupling modules if the monolith is split later.

---

## 2. Django Channels (WebSocket Pub/Sub)

The `channels_redis` package uses Redis Pub/Sub to pass messages between Django server processes and WebSocket consumers.

### 2.1 Channel Layer Configuration

```python
# settings.py
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(env('REDIS_HOST', '127.0.0.1'), env('REDIS_PORT', 6379))],
            "capacity": 1500, # Max messages to hold in memory
            "expiry": 10,     # Discard unread messages after 10 seconds
        },
    },
}
```

### 2.2 Pub/Sub Groups & Topics

Clients connect to WebSockets and are assigned to Redis Groups. When an event occurs (e.g., a block is approved), a message is published to the group.

| Group Name | Subscribers | Trigger Events | Payload Structure |
|------------|-------------|----------------|-------------------|
| `coa_dashboard` | Control Office Admins | New Block, Block Approved, Conflict Detected | `{"type": "new_block", "block_id": "...", "status": "PENDING"}` |
| `dept_eng` | Engineering JEs/SEs | Block Rejected, Block Approved (ENG only) | `{"type": "block_update", "block_id": "..."}` |
| `dept_trd` | Traction JEs/SEs | Block Rejected, Block Approved (TRD only) | `{"type": "block_update", "block_id": "..."}` |
| `dept_snt` | Signal JEs/SEs | Block Rejected, Block Approved (SNT only) | `{"type": "block_update", "block_id": "..."}` |
| `emergency_all` | All Connected Users | Emergency Block Created (RED ALERT) | `{"type": "emergency", "block_id": "...", "section": "HWH-KGP"}` |

### 2.3 Broadcasting Example

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def broadcast_emergency(block_instance):
    channel_layer = get_channel_layer()
    # Publish to the Redis group
    async_to_sync(channel_layer.group_send)(
        "emergency_all",
        {
            "type": "emergency_alert", # Maps to consumer method
            "message": f"Emergency Block active on {block_instance.section.name}",
            "block_id": block_instance.id
        }
    )
```

---

## 3. Celery Message Broker (Background Tasks)

Tasks that take longer than 500ms (e.g., calling Gemini API, sending Twilio SMS) are offloaded to Celery. Redis acts as the message broker storing the task queues.

### 3.1 Celery Configuration

```python
# railway_ai/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_ai.settings')

app = Celery('railway_ai')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# settings.py
CELERY_BROKER_URL = env('REDIS_URL')
CELERY_RESULT_BACKEND = env('REDIS_URL')
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60 # 30 mins hard kill
```

### 3.2 Task Queues & Routing

We use separate queues in Redis to prevent slow tasks (like AI resolution) from blocking fast tasks (like SMS alerts).

| Queue Name | Priority | Use Case | Concurrency Target (MVP) |
|------------|----------|----------|--------------------------|
| `urgent` | High | Emergency SMS (Twilio), WebSocket triggers | 4 workers |
| `default` | Normal | Database syncs, Block creation workflows | 4 workers |
| `ai_tasks` | Normal | Gemini API calls (Conflict Resolution) | 2 workers (Rate limit control) |
| `reporting`| Low | PDF/Excel Generation, Nightly Analytics | 1 worker |

**Routing Configuration:**

```python
# settings.py
CELERY_TASK_ROUTES = {
    'notifications.tasks.send_emergency_sms': {'queue': 'urgent'},
    'blocks.tasks.resolve_conflict_ai': {'queue': 'ai_tasks'},
    'analytics.tasks.generate_daily_report': {'queue': 'reporting'},
}
```

### 3.3 Task State & Results

When Celery finishes a task, the result is stored in Redis (`CELERY_RESULT_BACKEND`).
Because we don't strictly need the results of most async tasks (we use WebSockets to notify the UI instead of polling), we configure Celery to ignore results for performance where possible:

```python
@shared_task(ignore_result=True)
def send_emergency_sms(phone_number, message):
    # Twilio API call
    pass
```

---

## 4. Redis Memory Management

Since Redis handles caching, sessions, websockets, and background queues, memory exhaustion is a risk.

### 4.1 Eviction Policies
- **Max Memory Strategy:** `allkeys-lru` (Evict least recently used keys when memory is full).
- **Session Expiry:** Django session keys are set to expire automatically in Redis.
- **Channels Expiry:** `expiry: 10` (seconds) drops undelivered socket messages fast.
- **Celery Results:** `CELERY_RESULT_EXPIRES = 3600` (1 hour).

### 4.2 Namespace Separation
To prevent key collisions, we use Redis logical databases or key prefixes (if using a single managed Redis instance on Railway/Render).

- DB `0`: Default cache, sessions, rate limiting.
- DB `1`: Celery Broker.
- DB `2`: Celery Result Backend.
- DB `3`: Django Channels (Pub/Sub).

*Note: If using Railway Free Tier (single DB), we prefix keys using `django-redis` settings (`KEY_PREFIX = "railway_cache"`).*
