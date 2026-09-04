# 05-observability.md

> **ফাইল ক্রম:** ৯/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/04-internal-api-and-messaging.md` (circuit breaker states, retry counts, SAGA step durations, correlation_id, timeout configs, event throughput, DLQ depth)  
> **পরবর্তী ফাইল:** `01-tech-infra/06-security.md`  
> **সংযোগ:** এই ফাইলে নির্ধারিত logging fields (`user_id`, `role`, `ip_address`) এবং health check endpoints (`/health/`, `/health/ready/`, `/health/deep/`) `06-security.md`-এর audit logging, RBAC enforcement, এবং security header validation-এর সাথে সরাসরি লিংকড। `06-security.md`-এর STRIDE threat model এবং input validation rules observability log redaction policy-তে প্রতিফলিত হবে।

---

## 1. Logging Strategy

### 1.1 Structured JSON Log Format

All logs produced by Django, Celery, and Channels are rendered as single-line JSON objects with standardized schema.

**Mandatory Fields:**

| Field | Type | Source | Example |
|-------|------|--------|---------|
| `timestamp` | ISO 8601 | `datetime.utcnow().isoformat()` | `2026-09-02T15:30:00.123+05:30` |
| `level` | String | `INFO`, `WARNING`, `ERROR`, `CRITICAL` | `INFO` |
| `logger` | String | Module Python path | `railway_ai.blocks.views` |
| `message` | String | Human-readable description | `Block BLK-20260902-089 created` |
| `correlation_id` | String | `X-Correlation-ID` header | `req_abc123xyz` |
| `span_id` | String | W3C Trace Context | `span_def456uvw` |
| `trace_id` | String | W3C Trace Context | `trace_ghi789rst` |

**Context Fields (when available):**

| Field | Type | Source | Example |
|-------|------|--------|---------|
| `user_id` | String | `request.user.id` | `usr_550e8400...` |
| `role` | String | `request.user.role` | `ENG_JE` |
| `department` | String | `request.user.department.code` | `ENG` |
| `ip_address` | String | `request.META['REMOTE_ADDR']` | `192.168.1.100` |
| `method` | String | HTTP method | `POST` |
| `path` | String | Request path | `/api/v1/blocks/` |
| `status_code` | Integer | HTTP response | `201` |
| `duration_ms` | Float | Execution time | `145.23` |
| `event` | String | Machine event key | `block_created` |

**Example Structured Log:**

```json
{
  "timestamp": "2026-09-02T15:30:00.123+05:30",
  "level": "INFO",
  "logger": "railway_ai.blocks.views",
  "message": "Block request created successfully",
  "correlation_id": "req_abc123xyz",
  "span_id": "span_def456uvw",
  "trace_id": "trace_ghi789rst",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "ENG_JE",
  "department": "ENG",
  "ip_address": "192.168.1.100",
  "method": "POST",
  "path": "/api/v1/blocks/",
  "status_code": 201,
  "duration_ms": 145.23,
  "event": "block_created",
  "extra": {
    "block_id": "BLK-20260902-089",
    "section": "HWH-KGP",
    "priority": "CRITICAL",
    "conflict_detected": false
  }
}
```

### 1.2 Log Levels per Environment

| Level | Development | Staging | Production |
|-------|-------------|---------|------------|
| `DEBUG` | ✅ All loggers | ✅ `railway_ai.*` only | ❌ Off |
| `INFO` | ✅ All | ✅ All | ✅ All |
| `WARNING` | ✅ All | ✅ All | ✅ All |
| `ERROR` | ✅ All | ✅ All | ✅ All (alert if > 5/min) |
| `CRITICAL` | ✅ All | ✅ All | ✅ All (immediate P1 alert) |

### 1.3 Sensitive Data Redaction

Fields automatically masked in all log outputs:
- `password`, `token`, `access_token`, `refresh_token`, `secret` → `[REDACTED]`
- `phone` → Last 4 digits visible (`+91*****1234`)
- `email` → Domain visible (`u***@railnet.gov.in`)

```python
# railway_ai/logging.py
import re

def redact_sensitive_data(event_dict):
    for key, val in event_dict.items():
        if isinstance(val, str):
            if any(k in key.lower() for k in ['password', 'token', 'secret', 'key']):
                event_dict[key] = "[REDACTED]"
            elif 'phone' in key.lower() and len(val) >= 10:
                event_dict[key] = re.sub(r'\d(?=\d{4})', '*', val)
    return event_dict
```

### 1.4 Retention Policy

| Tier | Storage | Retention | Access |
|------|---------|-----------|--------|
| **Hot** | Local Container / Cloud Log Stream | 7 Days | Instant developer access |
| **Warm** | Compressed S3 / Volume Archive | 30 Days | Elasticsearch / Logstash query |
| **Cold** | Encrypted Backup Archive | 1 Year | Regulatory Railway safety audits |

---

## 2. Metrics (RED Method)

**Standard:** Rate, Errors, Duration (RED) implemented with Prometheus format.

### 2.1 Rate Metrics (Throughput)

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `http_requests_total` | Counter | `method`, `path`, `status_code` | Total incoming HTTP API traffic |
| `celery_tasks_total` | Counter | `task_name`, `queue`, `status` | Celery asynchronous jobs submitted |
| `websocket_messages_total` | Counter | `channel`, `type` | Real-time WebSocket messages broadcast |
| `block_requests_total` | Counter | `department`, `priority`, `status` | Domain blocks created / modified |
| `conflicts_detected_total` | Counter | `section`, `severity` | Overlap conflicts flagged |

### 2.2 Error Metrics

| Metric Name | Type | Threshold | Description |
|-------------|------|-----------|-------------|
| `http_errors_total` | Counter | > 10 / min | Rate of 5xx HTTP responses |
| `celery_task_failures_total` | Counter | > 5 / min | Rate of background task exceptions |
| `circuit_breaker_state` | Gauge | `state="open"` > 2m | Circuit breaker trips for Gemini/Twilio |
| `dlq_messages_total` | Gauge | > 10 messages | Dead letter queue backlog |
| `mysql_connection_errors_total` | Counter | > 2 / min | Database connection failure count |

### 2.3 Duration Metrics

| Metric Name | Type | SLA Target | Description |
|-------------|------|------------|-------------|
| `http_request_duration_seconds` | Histogram | p95 < 500ms | Web API end-to-end latency |
| `mysql_query_duration_seconds` | Histogram | p95 < 100ms | MySQL database execution latency |
| `redis_operation_duration_seconds` | Histogram | p95 < 10ms | In-memory cache operation latency |
| `gemini_api_duration_seconds` | Histogram | p95 < 2.0s | External AI resolution latency |
| `saga_step_duration_seconds` | Histogram | p95 < 200ms | Block approval atomic transaction time |

### 2.4 Infrastructure Metrics

| Metric Name | Source | Warning Threshold |
|-------------|--------|-------------------|
| `cpu_usage_percent` | Container | > 80% for 5 min |
| `memory_usage_bytes` | Container | > 85% of allocated RAM |
| `mysql_connections_active` | MySQL `SHOW STATUS LIKE 'Threads_connected'` | > 80% of `max_connections` |
| `redis_connected_clients` | Redis `INFO clients` | > 500 active connections |
| `celery_workers_active` | Celery Inspect | < 4 worker processes |

---

## 3. Distributed Tracing

**Standard:** W3C Trace Context (`traceparent: 00-{trace_id}-{span_id}-01`).

### 3.1 Trace Flow Across System

```
Browser Client (X-Correlation-ID: req_abc123)
  │
  ▼
Nginx Proxy (Preserves header, forwards to WSGI)
  │
  ▼
Django TracingMiddleware (Extracts W3C traceparent or generates trace_id + span_id)
  │
  ├──► Database Query (Span: db.mysql.query)
  ├──► Cache Lookup (Span: cache.redis.get)
  ├──► Celery Task Enqueue (Span: celery.enqueue with trace context)
  │      │
  │      ▼
  │    Celery Worker (Unpacks trace context, sets child span_id)
  │      ├──► External API (Gemini REST call with X-Correlation-ID)
  │      └──► Redis Pub/Sub Publish
  │
  └──► HTTP Response (Echoes traceparent & X-Correlation-ID headers)
```

### 3.2 Span Naming Conventions

- **HTTP:** `{METHOD} {route}` (e.g., `POST /api/v1/blocks/`)
- **Database:** `db.mysql {table} {OPERATION}` (e.g., `db.mysql block_requests UPDATE`)
- **Cache:** `cache.redis {OPERATION} {key_prefix}` (e.g., `cache.redis GET block`)
- **External:** `external.http {service}` (e.g., `external.http gemini_ai`)
- **Task:** `celery.task {task_name}` (e.g., `celery.task sync_to_graph`)

---

## 4. Health Checks

### 4.1 Liveness Probe (`GET /api/v1/health/`)

**Purpose:** Verifies that the Django web process is running.  
**SLA:** < 50ms response.

```json
{
  "status": "alive",
  "timestamp": "2026-09-02T15:30:00+05:30",
  "version": "1.0.0"
}
```

### 4.2 Readiness Probe (`GET /api/v1/health/ready/`)

**Purpose:** Verifies that backing stores (MySQL, Redis, Celery) are available to handle traffic.

```json
{
  "status": "ready",
  "timestamp": "2026-09-02T15:30:00+05:30",
  "checks": {
    "mysql": {"status": "ok", "latency_ms": 4.2},
    "redis": {"status": "ok", "latency_ms": 1.5},
    "celery": {"status": "ok", "workers_active": 6}
  }
}
```

### 4.3 Deep Health Check (`GET /api/v1/health/deep/`)

**Purpose:** Full diagnostic health check for Control Room admin oversight. Requires `COA` role.

```json
{
  "status": "healthy",
  "timestamp": "2026-09-02T15:30:00+05:30",
  "checks": {
    "mysql": {"status": "ok", "latency_ms": 6.8, "active_threads": 12},
    "redis": {"status": "ok", "latency_ms": 1.8, "memory_used_mb": 42},
    "celery": {"status": "ok", "queues": {"high": 0, "notify": 1, "ontology": 0, "low": 2}},
    "ontology_owl": {"status": "ok", "classes_loaded": 145, "individuals": 890},
    "gemini_api": {"status": "ok", "latency_ms": 820},
    "twilio_api": {"status": "ok", "account_active": true},
    "disk_space": {"status": "ok", "free_percent": 68}
  }
}
```

### 4.4 Implementation

```python
# railway_ai/views.py
import time
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from celery import current_app

def health_readiness(request):
    checks = {}
    healthy = True

    # 1. MySQL
    try:
        t0 = time.time()
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
        checks['mysql'] = {'status': 'ok', 'latency_ms': round((time.time() - t0) * 1000, 2)}
    except Exception as e:
        checks['mysql'] = {'status': 'error', 'detail': str(e)}
        healthy = False

    # 2. Redis
    try:
        t0 = time.time()
        cache.client.get_client().ping()
        checks['redis'] = {'status': 'ok', 'latency_ms': round((time.time() - t0) * 1000, 2)}
    except Exception as e:
        checks['redis'] = {'status': 'error', 'detail': str(e)}
        healthy = False

    # 3. Celery
    try:
        inspect = current_app.control.inspect()
        active = inspect.active()
        count = len(active) if active else 0
        checks['celery'] = {'status': 'ok' if count > 0 else 'warning', 'workers_active': count}
    except Exception as e:
        checks['celery'] = {'status': 'error', 'detail': str(e)}

    status_code = 200 if healthy else 503
    return JsonResponse({'status': 'ready' if healthy else 'unhealthy', 'checks': checks}, status=status_code)
```

---

## 5. Alerting Rules & Escalation

### 5.1 Severity Matrix

| Level | Severity | MTTA (Ack) | Notification Channel | Triggers |
|-------|----------|------------|----------------------|----------|
| **P1** | Critical | < 5 min | SMS + Voice Call + Red Screen Banner | Web crash, MySQL down, Emergency Block dispatch failure |
| **P2** | High | < 15 min | Slack + Email + Dashboard Warning | Error rate > 10/min, Gemini Circuit Open, Celery backlog |
| **P3** | Medium | < 1 hour | Daily Digest + Info Badge | DLQ backlog > 5, slow query count > 20, memory > 80% |

### 5.2 Escalation Tree

```
[P1 Alert Fired]
  │
  ├──► 00 min: Send Twilio SMS to On-Call Section Engineer & COA
  ├──► 05 min: If unacknowledged, trigger automated container restart
  ├──► 10 min: Escalate alert to Principal Systems Administrator
  └──► 15 min: Fall back to static timetable mode if network outage
```

---

## 6. Pre-Written Debug Log Queries (`jq`)

### 6.1 Trace Full Block Lifecycle by Correlation ID

```bash
# View complete request flow across services
jq 'select(.correlation_id == "req_abc123xyz")' /var/log/railway-ai/app.log | jq -s 'sort_by(.timestamp)'
```

### 6.2 Filter MySQL Slow Queries (> 100ms)

```bash
jq 'select(.duration_ms > 100 and .logger | contains("db.mysql"))' /var/log/railway-ai/app.log
```

### 6.3 Track Failed Notifications

```bash
jq 'select(.event == "notification.failed" or .level == "ERROR" and .logger | contains("notifications"))' /var/log/railway-ai/app.log
```

---

## 7. Next File Dependency Note

> পরবর্তী ফাইল: `01-tech-infra/06-security.md`

`05-observability.md` থেকে `06-security.md`-এ নেওয়া হবে:

| Observability Element | Security Impact |
|----------------------|-----------------|
| `user_id`, `role`, `ip_address` logging | Immutable audit logging for RBAC enforcement |
| Correlation ID tracing | Cross-service forensics during suspected malicious attacks |
| Sensitive data redaction | Compliance assurance against credential and PII leakage |
| Health check endpoints | Security boundary protection (`/health/` public, `/health/deep/` admin-only) |
| Alert rules | Anomaly detection for brute-force login attempts or DDoS patterns |

`06-security.md`-এ নিচের বিষয়গুলো থাকবে:
- STRIDE threat model per component
- Authentication lifecycle (Registration, Login, Token Refresh, Blacklisting)
- RBAC detailed matrix with conditional constraints
- JWT security policy (claims, expiry, rotation)
- Input validation & attack prevention (SQLi, XSS, CSRF, malicious photo uploads)
- Role-based rate limiting tiers
- Secret management and data encryption at rest (MySQL) and in transit (TLS 1.3)
