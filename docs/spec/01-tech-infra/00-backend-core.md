# 00-backend-core.md

> **File Order:** 4/45  
> **Previous File:** `00-master-high-level/02-glossary.md` (Term Definitions)  
> **Next File:** `01-tech-infra/01-frontend-core.md`  
> **Connection:** Terms used in this file like `JWT`, `RBAC`, `DRF`, `ASGI`, `WSGI`, `Middleware`, `Celery`, and `Idempotency` are defined in `02-glossary.md`. In `01-frontend-core.md`, the Frontend's API Client, Auth Flow, and State Management will depend on this backend architecture.

---

## 1. Service Architecture Pattern

**Pattern:** Modular Monolith (Django Apps as Bounded Contexts)

**Justification:**  
The PS 26027 hackathon MVP requires delivery within a 3-day timeline for about 100 concurrent users. There are 8 logical domains (`accounts`, `blocks`, `departments`, `ontology`, `trains`, `assets`, `analytics`, `notifications`), but the resource requirements and team size are small. The operational overhead of microservices (service discovery, distributed tracing, inter-service auth, separate DB per service) cannot be justified for this timeline.

**Django Apps as Modules:**

```text
railway_ai/           # Project configuration
├── accounts/         # AUTH bounded context
├── blocks/           # BLK bounded context
├── departments/      # DEPT bounded context
├── ontology/         # ONTO bounded context
├── trains/           # TRN bounded context
├── assets/           # AST bounded context
├── analytics/        # ANA bounded context
└── notifications/    # NOTIF bounded context
```

**Cross-App Communication Rules:**  
- ✅ **Allowed:** Import models from other apps via Django's `apps.get_model()` or direct import (since they share the same DB and transaction context).
- ✅ **Allowed:** Use Django Signals for decoupled event propagation (e.g., `post_save` on Block → Ontology sync).
- ❌ **Forbidden:** Direct HTTP calls between apps (unnecessary overhead since they run in the same process).
- ❌ **Forbidden:** Circular imports between app service layers.

---

## 2. API Gateway & Routing

Instead of a separate API Gateway, we will use Django's built-in URL router, following enterprise patterns for centralized routing and cross-cutting concerns.

### 2.1 URL Routing Table

| Endpoint Prefix | App | DRF Router | Version | Auth Required |
|----------------|-----|-----------|---------|---------------|
| `/api/v1/auth/` | accounts | AuthViewSet, TokenRefreshView | v1 | Partial (login/register public) |
| `/api/v1/users/` | accounts | UserViewSet | v1 | Yes (COA only for list) |
| `/api/v1/blocks/` | blocks | BlockRequestViewSet | v1 | Yes (All roles) |
| `/api/v1/blocks/pending/` | blocks | PendingBlockView | v1 | Yes (COA, SE) |
| `/api/v1/blocks/approve/` | blocks | ApprovalView | v1 | Yes (COA only) |
| `/api/v1/blocks/emergency/` | blocks | EmergencyBlockView | v1 | Yes (All roles) |
| `/api/v1/blocks/conflicts/` | blocks | ConflictListView | v1 | Yes (COA) |
| `/api/v1/ontology/sync/` | ontology | OntologySyncView | v1 | Yes (System/Admin) |
| `/api/v1/ontology/reason/` | ontology | ReasoningView | v1 | Yes (COA) |
| `/api/v1/trains/` | trains | TrainViewSet | v1 | Yes (All roles) |
| `/api/v1/trains/impact/` | trains | ImpactCalculatorView | v1 | Yes (COA) |
| `/api/v1/crews/` | departments | CrewViewSet | v1 | Yes (All roles) |
| `/api/v1/materials/` | departments | MaterialViewSet | v1 | Yes (All roles) |
| `/api/v1/reports/` | analytics | ReportViewSet | v1 | Yes (COA) |
| `/api/v1/reports/pdf/` | analytics | PDFReportView | v1 | Yes (COA) |
| `/api/v1/notifications/` | notifications | NotificationViewSet | v1 | Yes (Own only) |
| `/api/v1/health/` | railway_ai | HealthCheckView | v1 | No |

### 2.2 Rate Limiting (DRF Throttling)

| Scope | Rate | Class | Applies To |
|-------|------|-------|------------|
| Anonymous | 30 req/min | `AnonRateThrottle` | Login, health check |
| Authenticated | 100 req/min | `UserRateThrottle` | General API usage |
| Block Creation | 5 req/min | `BlockRateThrottle` | `POST /api/v1/blocks/` |
| Emergency | 2 req/min | `EmergencyRateThrottle` | `POST /api/v1/blocks/emergency/` |
| Gemini AI | 10 req/min | `AIRateThrottle` | `POST /api/v1/blocks/resolve/` |
| Admin/COA | 500 req/min | `AdminRateThrottle` | Dashboard, reports |

### 2.3 Request Transformation

- **Content Negotiation:** JSON only (`DEFAULT_RENDERER_CLASSES` = `JSONRenderer`).
- **Pagination:** Limit-offset (`PAGE_SIZE = 20`, max `limit = 100`).
- **Input Sanitization:** Handled by DRF Serializers + Django `escape` for text fields.
- **Datetime Format:** ISO 8601 (e.g., `2026-09-02T14:30:00+05:30`).
- **Distance Format:** Decimal kilometers (e.g., `15.250` for KM).

---

## 3. Middleware Execution Order

Django `MIDDLEWARE` stack (top to bottom = request enters, bottom to top = response exits):

```python
MIDDLEWARE = [
    # Layer 1: Security & CORS
    "django.middleware.security.SecurityMiddleware",           # HSTS, XSS filter, content-type nosniff
    "corsheaders.middleware.CorsMiddleware",                   # CORS preflight handling
    
    # Layer 2: Request ID & Logging
    "railway_ai.middleware.RequestIDMiddleware",               # X-Request-ID header injection
    "railway_ai.middleware.StructuredLoggingMiddleware",       # JSON log start
    
    # Layer 3: Rate Limiting
    "railway_ai.middleware.RateLimitMiddleware",               # Custom throttle (before auth to save DB hit)
    
    # Layer 4: Authentication
    "django.contrib.sessions.middleware.SessionMiddleware",    # Session (fallback)
    "django.middleware.common.CommonMiddleware",               # URL normalization
    "django.contrib.auth.middleware.AuthenticationMiddleware", # Django auth
    "railway_ai.middleware.JWTAuthMiddleware",                 # DRF SimpleJWT validation
    
    # Layer 5: Authorization & Context
    "railway_ai.middleware.RoleContextMiddleware",             # Attach role/dept to request.user
    "railway_ai.middleware.DepartmentIsolationMiddleware",     # Filter queryset by dept (for JE roles)
    
    # Layer 6: Body & Validation
    "django.middleware.csrf.CsrfViewMiddleware",               # CSRF (for browsable API/admin)
    "django.middleware.clickjacking.XFrameOptionsMiddleware",  # Clickjacking protection
    
    # Layer 7: Error Handling & Audit
    "railway_ai.middleware.ErrorHandlingMiddleware",           # Catch-all → JSON error response
    "railway_ai.middleware.AuditLogMiddleware",                # Log response status, duration
]
```

---

## 4. Request Lifecycle

```text
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │ HTTPS (TLS 1.3)
       ▼
┌─────────────┐     ┌─────────────────────────────────────────────────────────────┐
│   Nginx     │────►│ Reverse Proxy (Railway/Render)                            │
│  (Port 80)  │     │ • SSL termination                                           │
└──────┬──────┘     │ • Static file serve (/static/, /media/)                     │
       │             └─────────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐     ┌─────────────────────────────────────────────────────────────┐
│   Daphne    │────►│ ASGI Server (WebSocket + HTTP/1.1)                        │
│  (Port 8001)│     │ • Long-lived connections (WebSocket)                        │
└──────┬──────┘     │ • Routes to Django Channels Consumer or Django view         │
       │             └─────────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐     ┌─────────────────────────────────────────────────────────────┐
│   Gunicorn  │────►│ WSGI Server (HTTP REST API)                               │
│  (Port 8000)│     │ • Sync worker processes (4 workers)                         │
└──────┬──────┘     │ • Pre-fork model                                            │
       │             └─────────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐     ┌─────────────────────────────────────────────────────────────┐
│   Django    │────►│ Middleware Stack (see Section 3)                          │
│   Routing   │     │ • Security → CORS → Request ID → Rate Limit → Auth → ...   │
└──────┬──────┘     └─────────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐     ┌─────────────────────────────────────────────────────────────┐
│   DRF       │────►│ ViewSet / APIView                                         │
│   View      │     │ • Permission check (RBAC)                                 │
│             │     │ • Throttle check                                          │
│             │     │ • Input validation (Serializer)                           │
└──────┬──────┘     └─────────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐     ┌─────────────────────────────────────────────────────────────┐
│   Service   │────►│ Business Logic Layer                                      │
│   Layer     │     │ • BlockService, ConflictEngine, AIResolverService         │
│             │     │ • Pure Python, no Django ORM dependency (testable)        │
└──────┬──────┘     └─────────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐     ┌─────────────────────────────────────────────────────────────┐
│ Repository  │────►│ Data Access Layer                                         │
│   Layer     │     │ • Django ORM queries                                      │
│             │     │ • Raw SQL for complex analytics (if needed)               │
│             │     │ • Ontology manager (Owlready2) calls                      │
└──────┬──────┘     └─────────────────────────────────────────────────────────────┘
       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Data Stores                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  PostgreSQL  │  │    Redis     │  │  Owlready2   │  │   External APIs      │ │
│  │  (Primary)   │  │  (Cache/     │  │  (Quadstore) │  │   • Gemini           │ │
│  │              │  │   Queue/     │  │              │  │   • Twilio           │ │
│  │  • Users     │  │   PubSub)    │  │  • RDF Graph │  │   • Open-Meteo       │ │
│  │  • Blocks    │  │              │  │  • Reasoner  │  │                      │ │
│  │  • Trains    │  │  • Sessions  │  │              │  │                      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼ (Response bubbles up through middleware in reverse order)
┌─────────────┐
│   JSON      │
│  Response   │
└─────────────┘
```

---

## 5. Error Handling Strategy

Centralized error handling is implemented via `ErrorHandlingMiddleware` and DRF's custom exception handler.

### 5.1 Error Response Envelope

```json
{
  "success": false,
  "data": null,
  "message": "Conflict detected with existing block",
  "error_code": "BLK-409-001",
  "request_id": "req_abc123xyz",
  "timestamp": "2026-09-02T14:35:00+05:30",
  "details": {
    "conflict_with": "BLK-20260902-045",
    "suggested_resolution": "Split block: ENG 02:00-04:00, TRD 04:30-06:30"
  }
}
```

### 5.2 Exception Mapping

| Exception Class | HTTP Status | Error Code | Message | Retryable? |
|-----------------|-------------|------------|---------|------------|
| `AuthenticationFailed` | 401 | `AUTH-401-001` | Invalid credentials | No |
| `TokenError` | 401 | `AUTH-401-002` | Token expired or invalid | Yes (refresh) |
| `PermissionDenied` | 403 | `AUTH-403-001` | Insufficient permissions | No |
| `ValidationError` | 400 | `BLK-400-001` | Invalid block time range | No |
| `ValidationError` | 400 | `BLK-400-002` | Section does not exist | No |
| `ConflictDetected` | 409 | `BLK-409-001` | Conflict with existing block | No |
| `NotFound` | 404 | `BLK-404-001` | Block not found | No |
| `PermissionDenied` | 403 | `BLK-403-001` | Only COA can approve blocks | No |
| `OntologyLoadError` | 500 | `ONTO-500-001` | Ontology file load failed | Yes |
| `SPARQLExecutionError` | 500 | `ONTO-500-002` | SPARQL query failed | Yes |
| `NotFound` | 404 | `ONTO-404-001` | Entity not found in ontology | No |
| `GeminiAPIError` | 503 | `AI-503-001` | AI service temporarily unavailable | Yes (fallback to local) |
| `TwilioAPIError` | 503 | `NOTIF-500-001` | SMS sending failed | Yes |
| `WebSocketError` | 500 | `NOTIF-500-002` | Real-time broadcast failed | Yes |
| `Throttled` | 429 | `GEN-429-001` | Rate limit exceeded | Yes (after delay) |

### 5.3 Middleware Error Catcher

```python
# railway_ai/middleware.py
class ErrorHandlingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as exc:
            return self.process_exception(request, exc)

    def process_exception(self, request, exception):
        # Map to known error codes or generic GEN-500-001
        error_mapping = {
            ConflictDetected: ("BLK-409-001", 409),
            OntologyLoadError: ("ONTO-500-001", 500),
            # ... etc
        }
        # Log structured error
        # Return JSONResponse with envelope
```

---

## 6. Configuration Management

### 6.1 Environment Variables (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEBUG` | Yes | `False` | Django debug mode |
| `SECRET_KEY` | Yes | — | Django cryptographic signing |
| `DATABASE_URL` | Yes | — | `postgres://user:pass@host:port/db` |
| `REDIS_URL` | Yes | — | `redis://host:port/0` |
| `ALLOWED_HOSTS` | Yes | `localhost` | Comma-separated domains |
| `CORS_ALLOWED_ORIGINS` | Yes | `http://localhost:5173` | Frontend origin |
| `GEMINI_API_KEY` | No | `""` | Google AI API key |
| `TWILIO_ACCOUNT_SID` | No | `""` | Twilio SID |
| `TWILIO_AUTH_TOKEN` | No | `""` | Twilio token |
| `TWILIO_PHONE_NUMBER` | No | `""` | Twilio sender number |
| `MAPBOX_ACCESS_TOKEN` | Yes | — | Mapbox public token |
| `CELERY_BROKER_URL` | Yes | `REDIS_URL` | Celery uses Redis |
| `CELERY_RESULT_BACKEND` | Yes | `REDIS_URL` | Task results in Redis |
| `ONTOLOGY_FILE_PATH` | Yes | `./ontology/railway_digital_twin.owl` | OWL file location |
| `JWT_ACCESS_TOKEN_LIFETIME` | No | `3600` | Seconds (60 min) |
| `JWT_REFRESH_TOKEN_LIFETIME` | No | `86400` | Seconds (1 day) |

### 6.2 Validation Schema

```python
# settings.py uses django-environ
import environ

env = environ.Env(
    DEBUG=(bool, False),
    JWT_ACCESS_TOKEN_LIFETIME=(int, 3600),
    # ... etc
)

# Raises ImproperlyConfigured if required var missing
```

### 6.3 Secrets Management

- **Development:** `.env` file (gitignored), loaded via `django-environ`.
- **Production:** Railway/Render environment variables (encrypted at rest).
- **Rotation:** API keys (Gemini, Twilio) recommended to be rotated every 90 days (manual for hackathon).
- **Leak Detection:** `.env.example` committed to repo (no real values), `git-secrets` pre-commit hook recommended.

---

## 7. Dependency Injection Pattern

Django lacks a traditional DI container (like Spring). We will use the Service Layer Pattern + Django App Registry instead.

### 7.1 Service Layer Pattern

```python
# blocks/services.py
class BlockService:
    def __init__(self, repository=None, conflict_engine=None, ai_resolver=None):
        self.repo = repository or BlockRepository()
        self.conflict = conflict_engine or ConflictEngine()
        self.ai = ai_resolver or AIResolverService()
    
    def create_block(self, data, user):
        # Business logic
        block = self.repo.create(data, user)
        conflicts = self.conflict.detect(block)
        if conflicts:
            resolution = self.ai.resolve(conflicts, block)
            return block, resolution
        return block, None

# blocks/views.py
class BlockRequestViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        return BlockRequestSerializer
    
    def perform_create(self, serializer):
        service = BlockService()  # Default dependencies injected
        block, resolution = service.create_block(
            serializer.validated_data, 
            self.request.user
        )
        # ... handle response
```

### 7.2 Django App Registry (Loose Coupling)

```python
# signals.py (decoupled communication)
from django.dispatch import receiver
from django.db.models.signals import post_save

@receiver(post_save, sender='blocks.BlockRequest')
def sync_block_to_ontology(sender, instance, created, **kwargs):
    # Lazy import to avoid circular dependency
    from ontology.manager import DigitalTwinManager
    manager = DigitalTwinManager()
    manager.sync_block(instance)
```

---

## 8. Key Dependencies & Versions

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| Django | 5.0.6 | Web framework | BSD |
| djangorestframework | 3.15.1 | REST API toolkit | BSD |
| djangorestframework-simplejwt | 5.3.1 | JWT authentication | MIT |
| django-cors-headers | 4.3.1 | CORS handling | MIT |
| django-channels | 4.1.0 | WebSocket support | BSD |
| channels-redis | 4.2.0 | Channels layer backend | BSD |
| celery | 5.4.0 | Background task queue | BSD |
| redis | 5.0.4 | Python Redis client | MIT |
| psycopg2-binary | 2.9.9 | PostgreSQL adapter | LGPL |
| django-environ | 0.11.2 | Environment variable parsing | MIT |
| Pillow | 10.3.0 | Image processing (photo upload) | HPND |
| gunicorn | 22.0.0 | WSGI HTTP server | MIT |
| daphne | 4.1.2 | ASGI HTTP/WebSocket server | BSD |
| uvicorn | 0.29.0 | Alternative ASGI server | BSD |
| requests | 2.31.0 | HTTP client (external APIs) | Apache 2.0 |
| google-generativeai | 0.7.0 | Gemini API client | Apache 2.0 |
| twilio | 9.0.5 | SMS API client | MIT |
| owlready2 | 0.46 | OWL ontology engine | LGPL |
| rdflib | 7.0.0 | RDF manipulation | BSD |
| pyshacl | 0.25.0 | SHACL validation | Apache 2.0 |
| pytest-django | 4.8.0 | Testing framework | MIT |
| factory-boy | 3.3.0 | Test data generation | MIT |
| black | 24.4.0 | Code formatter | MIT |
| ruff | 0.4.0 | Linter | MIT |

---

## 9. Structured JSON Logging

**Standard:** Every log entry must be a single-line JSON object.

### 9.1 Log Fields

```json
{
  "timestamp": "2026-09-02T14:35:00.123+05:30",
  "level": "INFO",
  "logger": "railway_ai.blocks.views",
  "request_id": "req_abc123xyz",
  "user_id": "usr_42",
  "role": "COA",
  "department": "Control",
  "method": "POST",
  "path": "/api/v1/blocks/",
  "status_code": 201,
  "duration_ms": 145,
  "event": "block_created",
  "block_id": "BLK-20260902-089",
  "section": "HWH-KGP",
  "message": "Block request created successfully",
  "extra": {
    "priority": "Critical",
    "conflict_detected": false
  }
}
```

### 9.2 Log Levels per Environment

| Level | Development | Staging | Production |
|-------|-------------|---------|------------|
| DEBUG | ✅ All | ❌ Only `railway_ai.*` | ❌ Off |
| INFO | ✅ All | ✅ All | ✅ All |
| WARNING | ✅ All | ✅ All | ✅ All |
| ERROR | ✅ All | ✅ All | ✅ All (alert if >5/min) |
| CRITICAL | ✅ All | ✅ All | ✅ All (immediate alert) |

### 9.3 Sensitive Data Redaction

Fields automatically masked in logs:
- `password`, `token`, `refresh_token`, `api_key`
- Phone numbers: `+91*****1234`
- Email: `user@*****.com`

### 9.4 Python Logger Configuration

```python
# settings.py
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "railway_ai.logging.JSONFormatter",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        }
    },
    "loggers": {
        "railway_ai": {
            "handlers": ["console"],
            "level": "INFO",
        }
    }
}
```
