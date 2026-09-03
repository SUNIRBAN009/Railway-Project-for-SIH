# 07-workers-consumers.md

> **File Order:** 11/45  
> **Previous File:** `01-tech-infra/06-security.md` (Security constraints for workers)  
> **Next File:** `01-tech-infra/08-deployment.md`  
> **Connection:** This file details the architecture of the background workers (Celery) and real-time consumers (Channels). These background processes will be orchestrated in the Docker Compose and deployment environments defined in the next file.

---

## 1. Celery Worker Architecture

We use Celery to offload heavy processing (AI Resolution, Ontology Sync, SMS Sending, Reports) from the main HTTP request-response cycle.

### 1.1 Queues & Concurrency Strategy

To prevent a sudden influx of AI reasoning requests from blocking critical SMS alerts, we split our workers across distinct queues.

| Queue | Concurrency (MVP) | Purpose | Example Tasks |
|-------|-------------------|---------|---------------|
| `urgent` | 4 processes | Fast, critical tasks | `send_emergency_sms`, `broadcast_alert` |
| `default` | 4 processes | General background work | `sync_ontology`, `process_file_upload` |
| `ai_tasks` | 2 processes | Slow, external API bound | `resolve_conflict_ai` (Gemini API) |
| `reporting`| 1 process | Heavy DB queries, PDF generation | `generate_daily_report` |

### 1.2 Worker Launch Commands (Docker)

```bash
# Urgent worker (High priority, fast execution)
celery -A railway_ai worker -Q urgent --concurrency=4 --loglevel=info

# AI worker (Low concurrency to respect API rate limits)
celery -A railway_ai worker -Q ai_tasks --concurrency=2 --loglevel=info
```

### 1.3 Error Handling & Dead Letter Queues

If a Celery task fails (e.g., Twilio API is down), we implement automatic retries with exponential backoff.

```python
# notifications/tasks.py
from celery import shared_task
import requests

@shared_task(
    bind=True, 
    max_retries=3, 
    default_retry_delay=60, # Delay increases: 60s, 120s, 240s
    queue='urgent'
)
def send_sms_with_retry(self, phone, message):
    try:
        # Twilio logic here
        pass
    except requests.exceptions.RequestException as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 60)
```

**Dead Letter Queue (DLQ):** If a task fails all 3 retries, we catch the final exception using a Celery signal (`task_failure`) and log it permanently in the database for manual review by the IT admin.

---

## 2. Scheduled Jobs (Celery Beat)

We use `celery-beat` for cron-like scheduled tasks.

### 2.1 Schedule Definition

```python
# railway_ai/celery.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    'daily-morning-report': {
        'task': 'analytics.tasks.generate_daily_report',
        'schedule': crontab(hour=6, minute=0), # 6:00 AM every day
        'args': (),
    },
    'cleanup-expired-tokens': {
        'task': 'accounts.tasks.flush_blacklisted_tokens',
        'schedule': crontab(minute=0, hour='*/12'), # Every 12 hours
    },
    'ontology-consistency-check': {
        'task': 'ontology.tasks.run_hermit_reasoner',
        'schedule': crontab(minute=0, hour=2), # 2:00 AM every day
    }
}
```

---

## 3. Django Channels Consumer Patterns

Consumers in Django Channels are the equivalent of Views in standard Django, but they handle persistent WebSocket connections instead of single HTTP requests.

### 3.1 WebSocket Authentication

Because WebSockets cannot easily send standard HTTP headers (like `Authorization: Bearer <token>`) during the handshake in browser JS, we pass the JWT in the query string and authenticate it using custom middleware.

```python
# railway_ai/middleware.py
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import UntypedToken

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope["query_string"].decode())
        token = query_string.get("token")
        
        if token:
            try:
                # Validate JWT
                UntypedToken(token[0])
                # In a real app, query DB here (async) to get User object
                scope["user"] = "AuthenticatedUser"
            except Exception:
                scope["user"] = None
        else:
            scope["user"] = None
            
        return await super().__call__(scope, receive, send)
```

### 3.2 Group Management (Pub/Sub)

When a user connects, we add their WebSocket connection to specific groups based on their department and role.

```python
# notifications/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NetworkDashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if not self.user:
            await self.close(code=4001)
            return
            
        # 1. Join global emergency channel
        await self.channel_layer.group_add("emergency_all", self.channel_name)
        
        # 2. Join department specific channel
        # Assuming user object has department attribute
        dept_group = f"dept_{self.user.department.lower()}"
        await self.channel_layer.group_add(dept_group, self.channel_name)
        
        # 3. If COA, join COA dashboard channel
        if self.user.role == 'COA':
            await self.channel_layer.group_add("coa_dashboard", self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Leave all groups
        await self.channel_layer.group_discard("emergency_all", self.channel_name)
        # ... discard others

    # Receive message from room group
    async def emergency_alert(self, event):
        message = event['message']
        block_id = event['block_id']

        # Send message to WebSocket client
        await self.send(text_data=json.dumps({
            'type': 'EMERGENCY_ALERT',
            'message': message,
            'block_id': block_id
        }))
```

---

## 4. Worker Scaling Strategy

### 4.1 MVP Phase (Hackathon)
- All Celery queues (`urgent`, `default`, `ai`, `reporting`) run in a single Docker container.
- `celery worker -Q urgent,default,ai_tasks,reporting --concurrency=4`

### 4.2 Production Phase (Future)
- **Horizontal Pod Autoscaling (HPA):** We monitor the length of the Redis queues. If the `default` queue length exceeds 100 items, Kubernetes (or the cloud provider) automatically spins up additional worker containers exclusively consuming the `default` queue.
- **Dedicated Nodes:** The `ai_tasks` queue is isolated to specific servers to strictly manage IP-based rate limiting to the Gemini API. 
