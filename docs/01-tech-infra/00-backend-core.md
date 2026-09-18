# 00-backend-core.md

> **ফাইল ক্রম:** ৪/৪৫  
> **ডিরেক্টরি:** `01-tech-infra/`  
> **পূর্ববর্তী ফাইল:** `00-master-high-level/02-glossary.md` (টার্ম সংজ্ঞা)  
> **পরবর্তী ফাইল:** `01-tech-infra/01-frontend-core.md` (ফ্রন্টএন্ড ক্লায়েন্ট আর্কিটেকচার)  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ৪টি মূল সমস্যা স্তম্ভ, ১৫টি সেফটি ফিচার, ৬টি ডেমো ডেটা সিস্টেম), `ai-project-spec-generator (1).md`।  
> **ডাটাবেস ও এআই নীতি:** **PostgreSQL 15/16 + PostGIS 3.3** (নো MySQL) এবং **Neuro-Symbolic Hybrid AI** (`Owlready2` + `HermiT` ↔ `Gemini 1.5 Flash`)।

---

## 1. Service Architecture Pattern

**প্যাটার্ন:** Modular Clean Architecture (Django Monolith with Bounded Context Apps)

### 1.1 আর্কিটেকচারাল যৌক্তিকতা
PS 26027 হ্যাকাথন ও ডিভিশনাল রেলওয়ে কন্ট্রোল রুমে (Eastern ও South Eastern Railway) সিস্টেমটির জন্য চরম নির্ভরযোগ্যতা, শূন্য ডেটা অসঙ্গতি (Zero Data Inconsistency) এবং স্থানিক ট্রানজ্যাকশন গ্যারান্টি আবশ্যক। ডিস্ট্রিবিউটেড মাইক্রোসার্ভিসের পরিবর্তে একটি মডিউলার মোনোলিথ কাঠামো গ্রহণ করা হয়েছে কারণ:
1. **ACID ট্রানজ্যাকশন গ্যারান্টি:** একই সেকশনে ট্র্যাক (ENGG), সিগন্যাল (S&T) এবং বিদ্যুৎ (TRD)-এর যৌথ কাজকে একটি একক **Combined Block Window (#98 USP)**-এ লক করার জন্য একক ডেটাবেস ট্রানজ্যাকশন অপরিহার্য।
2. **পোস্টজিআইএস স্থানিক ইন্টিগ্রেশন:** ট্র্যাক লাইনস্ট্রিং জিওমেট্রি ও চেইনেজ হিসাবের জন্য আলাদা কোনো স্প্যাশিয়াল সার্ভিসের প্রয়োজন নেই; সরাসরি PostgreSQL-এর PostGIS এক্সটেনশন ব্যবহার করা যায়।
3. **শূন্য নেটওয়ার্ক ল্যাটেন্সি:** অভ্যন্তরীণ ডোমেনগুলোর মধ্যে ইন-মেমোরি ফাংশন কলের মাধ্যমে সাব-মিলিসেকেন্ড ল্যাটেন্সিতে কনফ্লিক্ট ডিটেকশন ও রুল যাচাই।

### 1.2 Bounded Context মডিউল মানচিত্র (`apps/`)

```
apps/
├── accounts/               # AUTH Bounded Context: JWT, RBAC (#112), ডিভিশন ও ইউজার রোল
├── assets/                 # AST Bounded Context: PostGIS ট্র্যাক, স্টেশন, সিগন্যাল ও OHE ক্যাটেনারি
├── blocks/                 # BLK Bounded Context: ব্লক রিকোয়েস্ট, কম্বাইন্ড উইন্ডো (#98), অপ্টিমাইজেশন
├── departments/            # DEPT Bounded Context: গ্যাং, হোম-বেস রাউটিং (#100), ইকুইপমেন্ট ও মেটেরিয়াল (#101)
├── emergency/              # EMG Bounded Context: জরুরি ব্রেকডাউন (#79), ট্র্যাক ব্রিচ ও ডিট্যুর রাউটিং
├── maintenance/            # MAINT Bounded Context: TMS/SMMS/TDMS ডিফেক্ট লগ, CoF×LoF রিস্ক (#92), এজিং (#93)
├── notifications/          # NOTIF Bounded Context: Channels ওয়েবসকেট ও Twilio/CDAC SMS গেটওয়ে
├── ontology/               # ONTO Bounded Context: Owlready2 + HermiT সিম্বলিক ডিজিটাল টুইন
├── trains/                 # TRN Bounded Context: টাইমটেবিল (#114), NTES লাইভ ডিলে (#116), ক্যাসকেড ক্যালকুলেটর (#115)
└── analytics/              # ANA Bounded Context: অ্যাসেট অ্যাভেইলেবিলিটি (#50), ভ্যারিয়েন্স (#109), PDF জেন (#107)
```

**আন্তঃ-মডিউল যোগাযোগের নিয়মাবলী:**
- ✅ **অনুমোদিত:** সার্ভিস লেয়ারের মাধ্যমে সরাসরি মেথড কল অথবা Django Signals (`post_save`) ব্যবহার করে ডিকাপল্ড ইভেন্ট সিঙ্ক (যেমন: ব্লক এপ্রুভ হলে সেলিরি কিউতে টোকেন জেনারেট)।
- ✅ **অনুমোদিত:** `core/models.py`-এর মাধ্যমে বেস অডিট ও ইউআইডি (UUID) ফিল্ড শেয়ার।
- ❌ **নিষিদ্ধ:** মডিউলগুলোর মধ্যে আন্তঃ-প্রসেস HTTP রিকোয়েস্ট পাঠানো (অপ্রয়োজনীয় ওভারহেড)।
- ❌ **নিষিদ্ধ:** সাইক্লিক ইমপোর্ট (সার্ভিস লেয়ারে সরাসরি অন্য অ্যাপের ইন্টারনাল মেথড কল না করে ইন্টারফেস বা সিগন্যাল ব্যবহার আবশ্যক)।

---

## 2. API Gateway, Routing & Rate Limiting

সিস্টেমটি একটি সেন্ট্রালাইজড **Nginx 1.25 Reverse Proxy** গেটওয়ে দিয়ে পরিচালিত হয় যা ইনবাউন্ড ট্র্যাফিককে সঠিক প্রসেসে রাউট করে:
- `/api/v1/*` ➔ **Gunicorn WSGI Application Server** (Port 8000)
- `/ws/*` ➔ **Daphne ASGI WebSocket Server** (Port 8001)
- `/media/*` ও `/static/*` ➔ **Nginx Local Disk Cache**

### 2.1 Master URL Routing Table

| API Endpoint Prefix | Owning App | Primary ViewSet / View | Version | Authentication & RBAC Scope |
|:---|:---|:---|:---:|:---|
| `/api/v1/auth/` | `accounts` | `TokenObtainPairView`, `TokenRefreshView` | v1 | Public (Login) / Anonymous |
| `/api/v1/users/` | `accounts` | `UserViewSet` | v1 | Authenticated (Admin, COA) |
| `/api/v1/blocks/` | `blocks` | `BlockRequestViewSet` | v1 | Authenticated (All Railway Staff) |
| `/api/v1/blocks/pending/` | `blocks` | `PendingBlockApprovalViewSet` | v1 | Authenticated (COA Chief Controller, SSE) |
| `/api/v1/blocks/combined/` | `blocks` | `CombinedBlockOptimizerViewSet` | v1 | Authenticated (COA, Planners) — Feature #98 |
| `/api/v1/blocks/{id}/approve/` | `blocks` | `BlockApprovalActionView` | v1 | Authenticated (COA Chief Controller) |
| `/api/v1/blocks/emergency/` | `emergency`| `EmergencyBlockOverrideView` | v1 | Authenticated (All Roles with Audit) |
| `/api/v1/safety/token/` | `blocks` | `DigitalTokenExchangeViewSet` | v1 | Authenticated (Field Supervisor, COA) — Feature #71 |
| `/api/v1/safety/loto/` | `blocks` | `LOTOSafetyGateViewSet` | v1 | Authenticated (TRD JE, Safety Officer) — Feature #74 |
| `/api/v1/safety/clearance/`| `blocks` | `SectionClearanceCertViewSet` | v1 | Authenticated (Field Supervisor, COA) — Feature #80 |
| `/api/v1/trains/live/` | `trains` | `LiveTrainStatusViewSet` | v1 | Authenticated (All Roles) — Feature #114 |
| `/api/v1/trains/cascade/` | `trains` | `DelayCascadeRecalculatorView` | v1 | Authenticated (COA) — Feature #115 |
| `/api/v1/maintenance/defects/`| `maintenance`|`DefectLogIngestionViewSet` | v1 | Authenticated (TMS/SMMS/TDMS Ingestion) |
| `/api/v1/demo/scenario/` | `core` | `DemoScenarioInjectorView` | v1 | Authenticated (Demo Mode Only) — Feature #120 |
| `/api/v1/reports/sanction-pdf/`| `analytics`| `SanctionOrderPDFView` | v1 | Authenticated (COA, Field Supervisors) — Feature #107 |
| `/api/v1/health/` | `core` | `SystemHealthCheckView` | v1 | Public (Docker Healthcheck & Uptime) |

### 2.2 Rate Limiting Architecture (DRF Redis Throttling)

সিস্টেম ডস (DoS) আক্রমণ এবং ডেমো পরিবেশের অতিরিক্ত লোড থেকে সুরক্ষিত থাকতে Redis-ব্যাকড রেট লিমিটার ব্যবহার করে:

| Scope | Allowed Limit | Throttle Class | Context & Target |
|:---|:---|:---|:---|
| **Anonymous** | ৩০ রিকোয়েস্ট / মিনিট | `AnonRateThrottle` | লগইন স্ক্রিন ও সিস্টেম হেলথ চেক |
| **Authenticated (Default)**| ১৫০ রিকোয়েস্ট / মিনিট | `UserRateThrottle` | সাধারণ ব্রাউজিং ও ডেটাবেস কোয়েরি |
| **Block Creation** | ১০ রিকোয়েস্ট / মিনিট | `ScopedRateThrottle` (`block_create`) | স্প্যাম ব্লক সাবমিশন রোধ |
| **Emergency Trigger** | ৫ রিকোয়েস্ট / মিনিট | `ScopedRateThrottle` (`emergency`) | ভুলবশত অতিরিক্ত ইমার্জেন্সি জারি রোধ |
| **Neural AI Explainability** | ১৫ রিকোয়েস্ট / মিনিট | `ScopedRateThrottle` (`ai_explain`) | Gemini API ফ্রি কোটা সুরক্ষা (#94) |
| **COA Control Room Screen** | ৬০০ রিকোয়েস্ট / মিনিট | `ScopedRateThrottle` (`control_room`) | বড় স্ক্রিন ড্যাশবোর্ডের উচ্চ রিফ্রেশ রেট |

---

## 3. Middleware Execution Pipeline

রিকোয়েস্ট প্রসেসিংয়ের জন্য Django `MIDDLEWARE` পাইপলাইন কঠোর ক্রমানুসারে কনফিগার করা হয়েছে:

```python
# config/settings.py
MIDDLEWARE = [
    # Layer 1: Security & Networking
    "django.middleware.security.SecurityMiddleware",           # HSTS, XSS Filter, Content-Type Nosniff
    "corsheaders.middleware.CorsMiddleware",                   # CORS Header handling for Vite Dev / Prod
    
    # Layer 2: Tracing & Observability
    "apps.core.middleware.RequestTracingMiddleware",           # Injects unique `X-Request-ID` (UUID4)
    "apps.core.middleware.StructuredLoggingMiddleware",        # Initiates structlog JSON access logging
    
    # Layer 3: Rate Limiting Guard
    "apps.core.middleware.RedisRateLimiterMiddleware",         # Fast fail before hitting database
    
    # Layer 4: Authentication & Context
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware", # Populates request.user
    "apps.accounts.middleware.JWTAuthenticationMiddleware",    # Extracts Bearer Token & checks Redis Blacklist
    "apps.accounts.middleware.SpatialRBACContextMiddleware",    # Populates user's authorized Division & Section
    
    # Layer 5: Integrity & Framing
    "django.middleware.clickjacking.XFrameOptionsMiddleware",  # DENY framing
    
    # Layer 6: Global Exception Handling & Audit
    "apps.core.middleware.GlobalErrorHandlingMiddleware",      # Catches unhandled exceptions -> Standard Envelope
    "apps.core.middleware.AuditTrailLoggerMiddleware",         # Records mutating actions to PostgreSQL audit table
]
```

---

## 4. End-to-End Request Lifecycle

নিচের ডায়াগ্রামে একটি সাধারণ ক্লায়েন্ট রিকোয়েস্টের জীবনচক্র দেখানো হয়েছে:

```
┌─────────────────┐
│ Client Browser  │
│ React 18 + Vite │
└────────┬────────┘
         │ 1. HTTPS POST /api/v1/blocks/ (JSON Payload + JWT Bearer Token)
         ▼
┌─────────────────┐
│ Nginx Gateway   │ (SSL Termination, Rate Limit, Proxy Headers)
└────────┬────────┘
         │ 2. Reverse Proxy HTTP to 127.0.0.1:8000
         ▼
┌─────────────────┐
│ Gunicorn (WSGI) │ (Pre-fork master worker pool)
└────────┬────────┘
         │ 3. Enters Django Middleware Pipeline (RequestID -> CORS -> JWT -> Spatial RBAC)
         ▼
┌─────────────────┐
│ DRF ViewSet     │ (Permission check: IsAuthenticated & CanCreateBlock)
└────────┬────────┘
         │ 4. Serializer Validation (Data types, ISO 8601 timestamps, PostGIS Section ID)
         ▼
┌─────────────────┐
│ Service Layer   │ ──► CombinedBlockOptimizerSvc (#98)
│ (Business Logic)│ ──► ConflictDetectionEngine (PostGIS ST_Intersects)
└────────┬────────┘ ──► CoF_LoF_RiskEngine (#92)
         │
         ├───► [Celery Task Enqueued] ──► `symbolic_ai` queue (HermiT Reasoner verification)
         │
         │ 5. Repository Layer (Django ORM + PostGIS)
         ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL 15 + PostGIS Spatial Database                    │
│ • Inserts into `blocks_blockrequest` (ACID Committed)       │
│ • Computes spatial line overlap via PostGIS GiST index      │
└────────┬────────────────────────────────────────────────────┘
         │
         │ 6. Response Formatter (Standard JSON Envelope)
         ▼
┌─────────────────┐
│ Channels (Redis)│ ──► WebSocket Broadcast: "NEW_BLOCK_SUBMITTED" to COA Dashboard
└────────┬────────┘
         │
         │ 7. HTTP 201 Created Returned to React Client
         ▼
┌─────────────────┐
│ React Frontend  │ (TanStack Query cache invalidated, UI Toast displayed)
└─────────────────┘
```

---

## 5. Centralized Error Handling Strategy

সিস্টেমের প্রতিটি এপিআই রেসপন্স একটি সুনির্দিষ্ট ও অপরিবর্তনীয় **Standard JSON Envelope** অনুসরণ করে। কোনো অবস্থাতেই র কাঁচা ট্রেসব্যাক বা এইচটিএমএল এরর ক্লায়েন্টে পাঠানো হয় না।

### 5.1 Error Response Envelope Specification

```json
{
  "success": false,
  "data": null,
  "message": "Section is already occupied by a higher-priority Rajdhani Express.",
  "error_code": "BLK-409-002",
  "request_id": "REQ-7b8f9e12-4c3a-4a21-9a7f-9b0d2a8b3c4d",
  "timestamp": "2026-09-18T09:15:00.123+05:30",
  "details": {
    "section_id": "HWH-BWN-L1",
    "clash_train_no": "12301",
    "clash_time_range": "02:15 - 03:00",
    "suggested_action": "Reschedule block after 03:30 or merge into Combined Window B-402"
  }
}
```

### 5.2 Core Domain Exception to Error Code Mapping

| Internal Exception Class | HTTP Status | Error Code | Operational Meaning | Retryable? |
|:---|:---:|:---:|:---|:---:|
| `AuthenticationFailed` | 401 | `AUTH-401-001` | টোকেন অনুপস্থিত বা অবৈধ ক্রেডেনশিয়াল | No |
| `TokenExpiredSignature` | 401 | `AUTH-401-002` | JWT টোকেনের মেয়াদ উত্তীর্ণ হয়েছে | Yes (Refresh) |
| `SpatialRBACViolation` | 403 | `AUTH-403-002` | ইঞ্জিনিয়ার তার নির্ধারিত ডিভিশন/সেকশনের বাইরে কাজ করছেন | No |
| `InvalidTimeRangeException` | 400 | `BLK-400-001` | সমাপ্তির সময় শুরুর সময়ের পূর্বে | No |
| `SectionNotFoundException` | 404 | `BLK-404-001` | পোস্টজিআইএস সেকশন আইডি ডেটাবেসে নেই | No |
| `BlockConflictDetected` | 409 | `BLK-409-001` | অন্য বিভাগের ব্লকের সাথে ওভারল্যাপ (কনফ্লিক্ট ডিটেক্টেড) | Yes (Auto-Resolve) |
| `TrainClashConflict` | 409 | `BLK-409-002` | হাই-প্রায়োরিটি ট্রেনের সাথে সরাসরি স্থানিক ক্ল্যাশ | Yes (Re-plan #108) |
| `DigitalTokenInvalid` | 403 | `SAFE-403-001` | ভুল বা মেয়াদোত্তীর্ণ ডিজিটাল সেফটি টোকেন | No |
| `OHEPowerIsolationMissing`| 412 | `SAFE-412-001` | TRD পাওয়ার আইসোলেশন ব্যতীত কাজের অনুমতি বাতিল | Yes (Isolate TRD) |
| `HermiTReasoningFailure` | 500 | `ONTO-500-001` | সিম্বলিক ডিজিটাল টুইন রিজনারে অসঙ্গতি শনাক্ত | No |
| `GeminiQuotaThrottled` | 503 | `AI-503-001` | নিউরাল এআই সার্ভিস ব্যস্ত (ফলব্যাক রুল সক্রিয়) | Yes (Local Rule) |
| `RateLimitExceeded` | 429 | `GEN-429-001` | অনুমোদিত এপিআই রিকোয়েস্ট সীমা অতিক্রম | Yes (Delay Backoff) |

---

## 6. Configuration & Environment Management

কনফিগারেশনের জন্য `python-decouple` ও `django-environ` ব্যবহার করা হয়। কোনো সিক্রেট বা পাসওয়ার্ড সোর্স কোডে হার্ডকোড করা নিষিদ্ধ।

### 6.1 Production Environment Variables (`.env`)

```ini
# Core Django
DEBUG=False
SECRET_KEY=railway_production_super_secret_cryptographic_key_9823471
ALLOWED_HOSTS=localhost,127.0.0.1,railway-block-ai.gov.in
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://railway-block-ai.gov.in

# Primary Spatial Database (PostgreSQL 15/16 + PostGIS 3.3)
DB_ENGINE=django.contrib.gis.db.backends.postgis
DB_NAME=railway_sih
DB_USER=railway_user
DB_PASSWORD=railway_secure_password_2026
DB_HOST=postgres
DB_PORT=5432

# In-Memory Cache, Channel Layer & Broker
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# Security & Tokens
JWT_ACCESS_LIFETIME_MINS=15
JWT_REFRESH_LIFETIME_DAYS=7

# Source Adapter Mode (Feature #121: MOCK for demo, REAL for production)
DATA_SOURCE_MODE=MOCK
DEMO_SEED_NUMBER=26027

# External Integrations (Optional in Mock Mode)
GEMINI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SENDER_NUMBER=
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1/forecast
```

---

## 7. Dependency Injection & Service Layer Pattern

পরীক্ষণযোগ্যতা (Unit Testability) ও আলগা সংযোগ (Loose Coupling) নিশ্চিত করতে ভিউসেটগুলো সরাসরি ডেটাবেস কোয়েরি চালায় না। সমস্ত বিজনেস লজিক **Service Layer Pattern**-এ আবদ্ধ:

```python
# apps/blocks/services.py
from apps.ontology.services import HermiTReasonerService
from apps.maintenance.services import RiskPriorityCalculatorService
from apps.analytics.services import GeminiExplainableService

class BlockOptimizationService:
    def __init__(
        self,
        risk_calculator=None,
        reasoner_service=None,
        explainable_service=None
    ):
        # Dependency Injection via Constructor
        self.risk_calculator = risk_calculator or RiskPriorityCalculatorService()
        self.reasoner = reasoner_service or HermiTReasonerService()
        self.explainer = explainable_service or GeminiExplainableService()

    def process_block_request(self, block_data, requesting_user):
        """
        1. Calculate CoF x LoF Risk Score
        2. Detect spatial conflicts with PostGIS
        3. Check combined block window opportunities (#98)
        4. Validate with HermiT Reasoner (Symbolic AI)
        5. Generate explanation via Gemini (Neural AI)
        """
        # Business logic implementation here
        pass
```

---

## 8. Locked Python Core Dependencies

প্রজেক্টের রুট `requirements.txt`-এর সাথে সম্পূর্ণ সংগতিপূর্ণ ডিপেন্ডেন্সি তালিকা:

| Package Name | Locked Version | Architectural Purpose in PS 26027 |
|:---|:---:|:---|
| `Django` | `>=5.0,<6.0` | কোর এন্টারপ্রাইজ ওয়েব ফ্রেমওয়ার্ক ও ওআরএম |
| `djangorestframework` | `>=3.14.0` | সিকিউর RESTful API আর্কিটেকচার |
| `django-cors-headers` | `>=4.3.1` | ফ্রন্টএন্ড Vite ক্লায়েন্টের জন্য CORS ম্যানেজমেন্ট |
| `psycopg2-binary` | `>=2.9.6` | PostgreSQL + PostGIS হাই-পারফরম্যান্স ড্রাইভার |
| `daphne` | `>=4.0.0` | ASGI ওয়েবসকেট সার্ভার |
| `channels` | `>=4.0.0` | ইভেন্ট-চালিত রিয়েল-টাইম আর্কিটেকচার |
| `channels_redis` | `>=4.1.0` | চ্যানেলস পাব/সাব ব্যাকএন্ড লেয়ার |
| `redis` | `>=5.0.0` | ক্যাশ, সেশন ও সেলিরি মেসেজ ব্রোকার |
| `celery` | `>=5.3.0` | ৪টি ডেডিকেটেড কিউ যুক্ত অ্যাসিঙ্ক্রোনাস প্রসেসর |
| `owlready2` | `>=0.46` | OWL 2 ডিজিটাল টুইন ও HermiT রিজনার ইন্টারফেস |
| `rdflib` | `>=7.0.0` | SPARQL কোয়েরি ও ট্রিপলস্টোর পরিচালনা |
| `pyshacl` | `>=0.25.0` | সেফটি কনস্ট্রেইন্ট শেপ ভ্যালিডেশন |
| `google-generativeai` | `>=0.7.0` | Gemini 1.5 Flash এক্সপ্লেনেবল এআই ক্লায়েন্ট |
| `reportlab` | `>=4.0.0` | অফিসিয়াল স্যাংশন অর্ডার PDF জেনারেটর (#107) |
| `pybreaker` | `>=1.0.0` | এক্সটার্নাল এপিআইয়ের জন্য সার্কিট ব্রেকার |
| `structlog` | `>=24.1.0` | স্ট্যান্ডার্ডাইজড সিঙ্গেল-লাইন JSON লগার |
| `PyJWT` | `>=2.8.0` | স্টেটলেস অথেনটিকেশন টোকেন ভ্যালিডেশন |

---

## 9. Structured JSON Logging Standards

প্রোডাকশন ও অডিটের জন্য প্রতিটি লগ এন্ট্রি একক লাইনের স্ট্রাকচার্ড JSON অবজেক্ট হিসেবে আউটপুট হয়।

```json
{
  "timestamp": "2026-09-18T09:20:14.521+05:30",
  "level": "INFO",
  "logger": "apps.blocks.services.BlockOptimizationService",
  "request_id": "REQ-7b8f9e12-4c3a-4a21-9a7f-9b0d2a8b3c4d",
  "user_id": 14,
  "role": "CHIEF_CONTROLLER",
  "division": "HOWRAH",
  "event": "COMBINED_BLOCK_WINDOW_CREATED",
  "block_id": "BLK-HWH-20260918-042",
  "section_id": "HWH-BWN-L1",
  "departments_merged": ["ENGG", "TRD"],
  "shadow_minutes_saved": 120,
  "status_code": 201,
  "duration_ms": 142.6
}
```

---

## 10. Traceability to Subsequent Specification Files

| Target Specification File | Core Dependency from this Document |
|:---|:---|
| **`01-tech-infra/01-frontend-core.md`** | এপিআই এন্ডপয়েন্ট তালিকা, এরর এনভেলপ এবং ওয়েবসকেট চ্যানেলের ওপর ভিত্তি করে ফ্রন্টএন্ড ক্লায়েন্ট তৈরি। |
| **`01-tech-infra/02-data-layer.md`** | PostgreSQL 15/16 + PostGIS 3.3 স্কিমা, স্প্যাশিয়াল কলাম এবং GiST ইনডেক্সিং ডিজাইন। |
| **`01-tech-infra/07-workers-consumers.md`** | ৪টি Celery কিউ (`high`, `notify`, `symbolic_ai`, `default_low`) ও টাস্ক ডেফিনিশন। |
| **`09-execution-tracker/00-implementation-checklist.md`** | সার্ভিস লেয়ার মেথড ও ভিউসেট কোডিংয়ের প্যারালাল ব্যাকএন্ড ট্র্যাক। |
