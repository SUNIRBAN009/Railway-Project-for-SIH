# 04-internal-api-and-messaging.md

> **ফাইল ক্রম:** ৮/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/03-event-brokers.md` (event topics, Celery queues, idempotency keys, correlation_id)  
> **পরবর্তী ফাইল:** `01-tech-infra/05-observability.md`  
> **সংযোগ:** এই ফাইলে নির্ধারিত circuit breaker thresholds, retry policies, এবং distributed tracing `correlation_id` `05-observability.md`-এর logging, metrics, এবং alerting strategy-তে সরাসরি ব্যবহৃত হবে। `05-observability.md`-এ RED method metrics (Rate, Errors, Duration) এবং distributed tracing span naming এই messaging pattern-এর উপর নির্ভরশীল।

---

## 1. Communication Pattern Matrix

| Use Case | Sync / Async | Protocol / Mechanism | Why |
|----------|-------------|---------------------|-----|
| **User Login** | Sync | HTTP POST `/api/v1/auth/login/` | Immediate token response required |
| **Block Create** | Sync + Async | HTTP POST → MySQL Commit → Celery Event | User gets block ID immediately; notifications & digital twin reasoning execute async |
| **Block Approve** | Sync + Async | HTTP POST → Atomic MySQL Update → SAGA Pipeline | Immediate approval state for COA; SMS + graph update + audit run async |
| **Conflict Detection** | Sync | In-process Python Function (Rule Engine) | Must return in < 200ms for immediate UI feedback on block submission |
| **AI Resolution** | Async | Celery Task → Google Gemini API | External LLM latency is 500ms–2000ms; cannot block HTTP thread |
| **Ontology Sync** | Async | Django Signal → Celery `ontology` Queue | File I/O + HermiT semantic reasoning; must not block web request |
| **SMS Notification** | Async | Celery `notify` Queue → Twilio REST API | External API latency, rate limits, and network failure tolerance |
| **Real-time Map Update** | Async | Django Channels → WebSocket Broadcast | Push to connected dashboard/map clients without polling |
| **Emergency Broadcast** | Sync + Async | HTTP POST → MySQL Commit → Instant WS Push | Critical safety: DB commit is sync, instant all-channel broadcast |
| **Report Generation** | Async | Celery `low` Queue → PDF Generator | Heavy CPU & memory processing in background |
| **Train Position Update** | Async | Celery Beat Cron → WebSocket Broadcast | Simulated real-time GPS feed every 30 seconds |
| **Audit Logging** | Async | Django Signal → Celery `default` Queue | Ensures audit trail write never slows down business transactions |

**Core Rule:** User-facing mutations are synchronous to MySQL for ACID consistency, then asynchronous via Redis/Celery for side effects. Read queries are purely synchronous.

---

## 2. Service Discovery

**Pattern:** In-process Django App Registry (No external Consul/Eureka/ZooKeeper required).

**Justification:**  
Modular monolith architecture — all 8 domains run within the same Python execution environment. There are no inter-service network boundaries, eliminating network latency, serialization overhead, and separate discovery cluster maintenance.

### 2.1 App Registry Mapping

```python
# railway_ai/apps.py
INSTALLED_APPS = [
    'accounts',      # AUTH: Authentication & RBAC
    'blocks',        # BLK: Core Block planning & conflict engine
    'departments',   # DEPT: Crew gangs & material inventory
    'ontology',      # ONTO: Owlready2 digital twin & SPARQL
    'trains',        # TRN: Train timetables, routes, impact
    'assets',        # AST: Physical track, signal, OHE health
    'analytics',     # ANA: KPI dashboards, PDF export
    'notifications', # NOTIF: SMS, Email, WebSocket dispatcher
]
```

### 2.2 Cross-App Communication Standard

| Caller App | Called App | Method | Example |
|------------|------------|--------|---------|
| `blocks` | `ontology` | Direct import (sync) / Celery (async) | `from ontology.manager import DigitalTwinManager` / `sync_to_graph.delay()` |
| `blocks` | `notifications` | Celery task only | `notifications.tasks.send_sms.delay()` |
| `blocks` | `trains` | Django ORM query (MySQL) | `Train.objects.filter(current_section=section_id)` |
| `ontology` | `trains` | Django ORM query (MySQL) | `Train.objects.filter(route__contains=section_name)` |
| `analytics` | `blocks` | Django ORM aggregation (MySQL) | `BlockRequest.objects.filter(status='APPROVED').count()` |

---

## 3. API Versioning Strategy

### 3.1 URL Path Versioning

All endpoints are strictly path-versioned:
```http
/api/v1/auth/login/
/api/v1/blocks/
/api/v1/blocks/approve/
/api/v2/blocks/          # Future major breaking changes
```

### 3.2 Breaking vs Non-Breaking Changes

**Breaking Changes (Requires `/api/v2/`):**
- Removing or renaming any required request field.
- Changing field data types (e.g., `string` to `array/object`).
- Modifying authentication mechanisms or token formats.
- Reducing existing rate limits.

**Non-Breaking Changes (Allowed in `/api/v1/`):**
- Adding new optional request fields.
- Adding new response fields.
- Updating error message human-readable text while keeping `error_code` intact.

### 3.3 Version Validation Middleware

```python
# railway_ai/middleware.py
from django.http import JsonResponse

class APIVersionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/'):
            # Extract version from path
            path_parts = request.path.split('/')
            version = path_parts[2] if len(path_parts) > 2 else 'v1'
            if version not in ['v1']:
                return JsonResponse(
                    {"success": False, "error_code": "SYS-400-001", "message": f"Unsupported API version: {version}"},
                    status=400
                )
            request.api_version = version
        return self.get_response(request)
```

---

## 4. Circuit Breaker Configuration

**Library:** `pybreaker` (Python circuit breaker)

### 4.1 External Service Circuits

| Service | Failure Threshold | Open Duration | Half-Open Max Calls | Fallback Action |
|---------|-------------------|---------------|---------------------|-----------------|
| **Google Gemini API** | 5 errors in 60s | 120 seconds | 3 calls | Local rule-based engine + offline Ollama (Phi-3) |
| **Twilio SMS API** | 3 errors in 30s | 60 seconds | 2 calls | In-app WebSocket alert + queue to DLQ |
| **Open-Meteo API** | 5 errors in 60s | 300 seconds | 3 calls | Use cached last-known weather readings |
| **NTES Data Feed** | 3 parse errors | 180 seconds | 2 calls | Fallback to offline static timetable fixtures |

### 4.2 Circuit Breaker Implementation

```python
# services/circuit_breakers.py
from pybreaker import CircuitBreaker, CircuitBreakerError
import requests
import logging

logger = logging.getLogger('railway_ai.circuit')

gemini_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=120,
    expected_exception=(requests.RequestException, Exception)
)

twilio_breaker = CircuitBreaker(
    fail_max=3,
    reset_timeout=60,
    expected_exception=(requests.RequestException, Exception)
)

def call_gemini_with_fallback(prompt, fallback_text):
    try:
        # Wrap Gemini external API call
        return gemini_breaker.call(actual_gemini_call, prompt)
    except CircuitBreakerError:
        logger.warning("Gemini Circuit is OPEN. Triggering local rule-based fallback.")
        return fallback_text
```

---

## 5. Retry & Timeout Policies

### 5.1 Policy Table

| Service | Connect Timeout | Read Timeout | Max Retries | Backoff Strategy | Idempotent? |
|---------|-----------------|--------------|-------------|------------------|-------------|
| **Gemini API** | 5s | 25s | 2 | Exponential (2s, 4s) | Yes |
| **Twilio SMS** | 5s | 10s | 3 | Exponential (5s, 10s, 20s) | Yes (deduped by hash) |
| **Open-Meteo** | 3s | 8s | 2 | Linear (2s, 4s) | Yes (read-only) |
| **MySQL Database**| 5s | 30s | 0 (fail fast) | None | N/A |
| **Redis Cache** | 2s | 5s | 2 | Immediate | Yes |

### 5.2 HTTP Client Session with Retries

```python
# services/external_client.py
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def get_resilient_session(retries=3, backoff=1, status_codes=(500, 502, 503, 504)):
    session = requests.Session()
    retry_strategy = Retry(
        total=retries,
        backoff_factor=backoff,
        status_forcelist=status_codes,
        allowed_methods=frozenset(['GET', 'POST', 'PUT'])
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount('https://', adapter)
    session.mount('http://', adapter)
    return session
```

---

## 6. Distributed Transactions: SAGA Pattern

### 6.1 Block Approval SAGA Workflow

```
[COA Approves Block via POST /api/v1/blocks/{id}/approve/]
  │
  ▼
Step 1: Atomic MySQL Update (Sync)
  ├─ Action: UPDATE block_requests SET status='APPROVED', approved_by=COA_ID
  ├─ Action: UPDATE sections SET current_status='BLOCKED', active_block_id=BLK_ID
  └─ Failure: Automatic Rollback, HTTP 500 returned
  │
  ▼ (If Step 1 succeeds, fire async Celery steps)
Step 2: Sync to Semantic Digital Twin (Async)
  ├─ Action: ontology.tasks.sync_to_graph.delay(block_id)
  └─ Failure: Log error, retry 3 times; if unrecoverable, flag in ontology_sync table
  │
  ▼
Step 3: Dispatch SMS to Maintenance Gang (Async)
  ├─ Action: notifications.tasks.send_sms.delay(crew_phone, message)
  └─ Failure: Route to dlq:notify:sms, alert COA dashboard (Do NOT rollback block!)
  │
  ▼
Step 4: Record Immutable Audit Log (Async)
  ├─ Action: audit.tasks.create_log.delay('block_requests', block_id, 'APPROVE')
  └─ Failure: Write to disk logger, alert SysAdmin
  │
  ▼
Step 5: Broadcast WebSocket Updates (Async)
  ├─ Action: Channel layer group_send to 'ws:group:COA' and 'ws:group:section:{id}'
  └─ Failure: Client reconnects or polls on next action
```

### 6.2 SAGA Service Implementation

```python
# blocks/services.py
from django.db import transaction
from blocks.models import BlockRequest, Section
from ontology.tasks import sync_to_graph
from notifications.tasks import send_approval_notification
from analytics.tasks import create_audit_log
from blocks.tasks import broadcast_block_update

class BlockApprovalSaga:
    @classmethod
    @transaction.atomic
    def execute(cls, block_id, approver_id):
        # Step 1: Atomic MySQL updates with row locking
        block = BlockRequest.objects.select_for_update().get(id=block_id)
        if block.status != 'PENDING':
            raise ValueError(f"Block cannot be approved in state: {block.status}")

        block.status = 'APPROVED'
        block.approved_by_id = approver_id
        block.save()

        section = Section.objects.select_for_update().get(id=block.section_id)
        section.current_status = 'BLOCKED'
        section.active_block_id = block.id
        section.save()

        # Step 2-5: Post-commit asynchronous side effects
        transaction.on_commit(lambda: sync_to_graph.delay(str(block.id)))
        transaction.on_commit(lambda: send_approval_notification.delay(str(block.id)))
        transaction.on_commit(lambda: create_audit_log.delay('block_requests', str(block.id), 'APPROVE', str(approver_id)))
        transaction.on_commit(lambda: broadcast_block_update.delay(str(block.id)))

        return block
```

---

## 7. Distributed Tracing: Correlation ID Propagation

```
Frontend Request (Header: X-Correlation-ID: req_abc123)
  │
  ▼
Django RequestIDMiddleware (Extracts or generates UUID)
  │
  ├──► Binds correlation_id to thread-local logger
  ├──► Passes correlation_id in Celery task kwargs
  ├──► Passes correlation_id in external API headers (X-Correlation-ID)
  ├──► Includes correlation_id in Redis Pub/Sub payloads
  └──► Echoes X-Correlation-ID in HTTP Response Header
```

### 7.1 Middleware Implementation

```python
# railway_ai/middleware.py
import uuid
import structlog

class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        correlation_id = request.headers.get('X-Correlation-ID', f"req_{uuid.uuid4().hex[:12]}")
        request.correlation_id = correlation_id
        
        # Bind to structlog contextvars
        structlog.contextvars.bind_contextvars(correlation_id=correlation_id)
        
        response = self.get_response(request)
        response['X-Correlation-ID'] = correlation_id
        return response
```

---

## 8. HTTP API Idempotency Handling

Clients send `Idempotency-Key: <UUID>` on all mutating requests (`POST /api/v1/blocks/`, `POST /api/v1/blocks/emergency/`).

```python
# railway_ai/middleware.py
import json
from django.core.cache import cache
from django.http import JsonResponse

class IdempotencyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ['POST', 'PUT', 'PATCH']:
            idem_key = request.headers.get('Idempotency-Key')
            if idem_key:
                cache_key = f"idemp:http:{idem_key}"
                cached = cache.get(cache_key)
                if cached:
                    return JsonResponse(cached['data'], status=cached['status'])
                request._idempotency_cache_key = cache_key

        response = self.get_response(request)

        if hasattr(request, '_idempotency_cache_key') and 200 <= response.status_code < 300:
            try:
                cache.set(
                    request._idempotency_cache_key,
                    {'data': json.loads(response.content), 'status': response.status_code},
                    timeout=300  # 5 minutes
                )
            except Exception:
                pass

        return response
```

---

## 9. Next File Dependency Note

> পরবর্তী ফাইল: `01-tech-infra/05-observability.md`

`04-internal-api-and-messaging.md` থেকে `05-observability.md`-এ নেওয়া হবে:

| Internal API Element | Observability Impact |
|---------------------|----------------------|
| Circuit breaker states | Metrics: `circuit_breaker_state{service="gemini"}` → P2 alert when open > 2 min |
| Retry counts | Metrics: `http_request_retries_total{service="twilio"}` |
| SAGA step durations | Histogram: `saga_step_duration_seconds{step="mysql_update"}` |
| Correlation ID | Distributed tracing root ID linking Django logs, Celery worker logs, and frontend events |
| API timeouts | Metrics: `http_request_duration_seconds` SLA threshold tracking (p95 < 500ms) |
| DLQ depth | Gauge: `dlq_messages_total{queue="notify"}` → P3 alert when > 10 |

`05-observability.md`-এ নিচের বিষয়গুলো থাকবে:
- Structured JSON logging with `correlation_id` and `span_id`
- RED method metrics (Rate, Errors, Duration) per endpoint
- Health check endpoints (`/health/`, `/health/ready/`, `/health/deep/`)
- Alerting rules (P1/P2/P3) with escalation path
- Control Room big-screen monitoring dashboard specs
- Pre-written common log queries (`jq`) for rapid debugging
