# 04-internal-api-and-messaging.md

> **ফাইল ক্রম:** ৮/৪৫  
> **ডিরেক্টরি:** `01-tech-infra/`  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/03-event-brokers.md` (ইভেন্ট টপিক, পাব/সাব চ্যানেল, সেলিরি ৪-কিউ)  
> **পরবর্তী ফাইল:** `01-tech-infra/05-observability.md` (লগিং, মেট্রিক্স, ডিস্ট্রিবিউটেড ট্রেসিং)  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ৪টি মূল সমস্যা স্তম্ভ), `ai-project-spec-generator (1).md`।  
> **ডাটাবেস ও ইন্টিগ্রেশন নীতি:** **PostgreSQL 15/16 + PostGIS 3.3** (নো MySQL), **PyBreaker 1.0** (সার্কিট ব্রেকার) এবং **Idempotent REST APIs**।

---

## 1. Inter-Service Communication Pattern Matrix

সিস্টেমটি একটি **মডিউলার ক্লিন মনোলিথ** হওয়ায় ডোমেনগুলোর মধ্যকার অভ্যন্তরীণ যোগাযোগ ইন-প্রসেস মেমোরি কল এবং ব্যাকগ্রাউন্ড টাস্ক কিউয়ের সমন্বয়ে পরিচালিত হয়:

| Use Case / Workflow | Execution Mode | Protocol / Channel | Target Component | Architectural Rationale |
|:---|:---:|:---|:---|:---|
| **User Login & Session Issue** | **Sync** | HTTP POST (`/api/v1/auth/login/`) | `apps.accounts` | ক্লায়েন্টের তাৎক্ষণিক JWT এক্সেস ও রিফ্রেশ টোকেন প্রাপ্তি আবশ্যক। |
| **Combined Block Window Form (#98)** | **Sync** | ইন-প্রসেস মেথড + PostGIS SQL | `apps.blocks.services` | একই সেকশনে একাধিক ডিপার্টমেন্টের ওভারল্যাপ < ২০০ms-এ নির্ণয়। |
| **Block Approval & ACID Commit** | **Sync** | HTTP POST ➔ PostgreSQL Commit | `apps.blocks.views` | প্রধান কন্ট্রোলারের অনুমোদনের তাৎক্ষণিক ACID ট্রানজ্যাকশন স্থায়িত্ব। |
| **Symbolic AI Digital Twin Proof** | **Async** | Celery Task (`symbolic_ai` Queue) | `apps.ontology` (HermiT) | মেমোরি-বাউন্ড ডেসক্রিপশন লজিক রিজনিং; মূল HTTP থ্রেড ব্লক করা নিষিদ্ধ। |
| **Neural AI "Why #1?" Generation (#94)**| **Async** | Celery ➔ Google Gemini API | `apps.analytics` (LLM) | বহিঃস্থ ক্লাউড এপিআই ল্যাটেন্সি (৫০০-১৫০০ms) হতে ব্যবহারকারীকে মুক্ত রাখা। |
| **Digital Token Handover (#71)** | **Sync + Async**| DB Commit ➔ Celery `notify` | `apps.blocks` & Twilio SMS | টোকেন হ্যাশ তাৎক্ষণিক তৈরি হয়, এসএমএস ডেলিভারি ব্যাকগ্রাউন্ডে চলে। |
| **NTES Delay Cascade Recalc (#115)** | **Async** | Redis Stream ➔ Celery `high` | `apps.trains` (Recalculator)| ট্রেনের লেটের কারণে পরবর্তী ৫০টি ব্লকে ক্যাসকেড ইমপ্যাক্ট হিসাব। |
| **Sanction Order PDF Gen (#107)** | **Async** | Celery Task (`default_low` Queue)| `apps.analytics` (ReportLab)| হাই-রেজোলিউশন কিউআর কোড ও ডিজিটাল সাইন যুক্ত PDF তৈরি। |
| **Real-time Map Status Broadcast** | **Async** | Redis Pub/Sub ➔ Channels (WSS)| `Daphne ASGI` ➔ React Map | ব্রাউজারে পোলিং না করে সরাসরি ওয়েবসকেটের মাধ্যমে সেকশন লাল/সবুজ করা। |
| **Emergency SOS Track Breach (#79)** | **Sync + Async**| HTTP POST ➔ Instant WS Broadcast | `apps.emergency` | জীবন-সংকটকালীন নিরাপত্তা: ডেটাবেসে সেভ করে ০ms ল্যাটেন্সিতে লাল ফ্ল্যাশ। |

---

## 2. In-Process Service Discovery & Module Boundaries

যেহেতু সম্পূর্ণ ব্যাকএন্ড একক মনোলিথ হিসেবে চলে, তাই কনসাল (Consul) বা ইউরেকা (Eureka)-র মতো এক্সটার্নাল সার্ভিস ডিসকভারি ক্লাস্টারের প্রয়োজন নেই। Django-র **App Registry** এবং **Service Layer Interface** ব্যবহার করে মডিউলগুলো একে অপরের সাথে যুক্ত হয়:

```python
# config/settings.py
INSTALLED_APPS = [
    # Core Infrastructure
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",          # PostGIS Engine
    "rest_framework",
    "corsheaders",
    "channels",
    
    # 10 Bounded Context Domain Apps
    "apps.core",                   # Base Models, Abstract Audits, Middleware
    "apps.accounts",               # User Auth & Spatial RBAC (#112)
    "apps.assets",                 # PostGIS Track, Signal, Station Assets
    "apps.blocks",                 # Block Requests & Combined Window (#98)
    "apps.departments",            # Gangs, Base Stations & Materials (#100, #101)
    "apps.emergency",              # Emergency SOS Override & Breaches (#79)
    "apps.maintenance",            # TMS, SMMS, TDMS Defect Ingestion
    "apps.notifications",          # WebSockets & SMS Dispatcher
    "apps.ontology",               # Semantic Digital Twin & HermiT Reasoner
    "apps.trains",                 # Time Table, NTES Stream & Cascade Recalc (#114, #115)
    "apps.analytics",              # Asset Availability Score (#50) & PDF Gen (#107)
]
```

### 2.1 Cross-Module Contract Standards
- একটি মডিউল কখনোই অন্য মডিউলের ইন্টারনাল ডেটাবেস কলাম সরাসরি পরিবর্তন করতে পারবে না।
- সর্বদা টার্গেট অ্যাপের **Public Service Class** মেথড কল করতে হবে (যেমন: `apps.blocks.services.BlockOptimizationService.get_active_blocks()`)।
- ডিকাপল্ড সাইড-এফেক্টের জন্য Django Signals ব্যবহার করা হয়, যা ট্রানজ্যাকশন শেষ হওয়ার পর সেলিরিতে ডিসপ্যাচ হয়।

---

## 3. API Versioning Strategy & Deprecation Policy

### 3.1 URI Path Versioning
সিস্টেমের সমস্ত এপিআই স্পষ্ট সংস্করণ উপসর্গ (URI Path Prefix) দ্বারা পরিচালিত:
```http
https://railway-block-ai.gov.in/api/v1/blocks/
https://railway-block-ai.gov.in/api/v1/safety/token/
https://railway-block-ai.gov.in/api/v2/blocks/     # ভবিষ্যতে বড় কোনো ব্রেকিং পরিবর্তনের জন্য
```

### 3.2 Breaking vs Non-Breaking Change Rules
- **Non-Breaking Changes (সংস্করণ অপরিবর্তিত থাকে `/api/v1/`):**
  - রেসপন্স অবজেক্টে নতুন কোনো ঐচ্ছিক ফিল্ড যোগ করা।
  - রিকোয়েস্টে নতুন কোনো ঐচ্ছিক কুয়েরি প্যারামিটার যুক্ত করা।
  - বিদ্যমান `error_code` অপরিবর্তিত রেখে এরর মেসেজের ভাষা উন্নত করা।
- **Breaking Changes (নতুন সংস্করণ আবশ্যক `/api/v2/`):**
  - বিদ্যমান কোনো রিকোয়েস্ট ফিল্ড রিনেম বা মুছে ফেলা।
  - ডেটা টাইপ পরিবর্তন (যেমন: স্ট্রিং থেকে অ্যারেতে রূপান্তর)।
  - অথেনটিকেশন মেকানিজম বা টোকেন ক্লেইম পরিবর্তন করা।

### 3.3 Deprecation Policy & Sunset Header
কোনো এপিআই বাতিল করার সিদ্ধান্ত নেওয়া হলে ক্লায়েন্টকে ৯০ দিনের গ্রেস পিরিয়ড প্রদান করা হয় এবং রেসপন্স হেডারে **Sunset Header** যুক্ত থাকে:
```http
HTTP/1.1 200 OK
Sunset: Wed, 31 Dec 2026 23:59:59 GMT
Deprecation: @1767225599
Link: <https://railway-block-ai.gov.in/api/v2/blocks/>; rel="successor-version"
```

---

## 4. Resilience Architecture: Circuit Breakers (PyBreaker 1.0)

বহিরাগত ক্লাউড এপিআই বা থার্ড-পার্টি সিস্টেমের ব্যর্থতা যাতে আমাদের প্ল্যাটফর্মকে ডাউন না করে, তার জন্য **PyBreaker** সার্কিট ব্রেকার বাস্তবায়ন করা হয়েছে:

```
                      ┌────────────────────────┐
                      │  State: CLOSED (Normal)│
                      └───────────┬────────────┘
                                  │ Failure threshold exceeded
                                  ▼
┌────────────────────────┐  Trip  ┌────────────────────────┐
│ State: HALF-OPEN       │◄───────│  State: OPEN (Failing) │
│ • Test single request  │  Reset │ • Fail immediately     │
│ • Success ➔ CLOSED     │ timeout│ • Route to Fallback    │
└────────────────────────┘        └────────────────────────┘
```

### 4.1 Circuit Breaker Configuration Table

| Target Integration | Breaker Name | Failure Threshold (`fail_max`) | Reset Timeout | Fallback Mechanism |
|:---|:---|:---:|:---:|:---|
| **Google Gemini API** | `gemini_api_breaker` | ৩ বার ক্রমান্বয়ে ব্যর্থ | ৩০ সেকেন্ড | লোকাল টেমপ্লেট রুল ইঞ্জিন দিয়ে পূর্ব-সংজ্ঞায়িত "Why #1?" কার্ড প্রদান। |
| **Twilio / CDAC SMS** | `sms_gateway_breaker` | ৫ বার ক্রমান্বয়ে ব্যর্থ | ৬০ সেকেন্ড | ইন-অ্যাপ পুশ নোটিফিকেশন ও ওয়েবসকেট এলার্ট চালু রাখা। |
| **Open-Meteo Weather**| `weather_api_breaker`| ৩ বার ক্রমান্বয়ে ব্যর্থ | ১২০ সেকেন্ড | শেষ সফল ক্যাশ করা আবহাওয়া ডেটা ও স্ট্যাটিক সেফটি লিমিট ব্যবহার। |
| **NTES Live Stream** | `ntes_stream_breaker` | ৪ বার ক্রমান্বয়ে ব্যর্থ | ৪৫ সেকেন্ড | ঐতিহাসিক গড় ট্রেনের গতি ও লোকাল সিমুলেটর অ্যাক্টিভেট করা। |

```python
# apps/core/circuit_breakers.py
import pybreaker
import structlog

logger = structlog.get_logger()

class CircuitBreakerListener(pybreaker.CircuitBreakerListener):
    def state_change(self, cb, old_state, new_state):
        logger.warning(
            "CIRCUIT_BREAKER_STATE_CHANGED",
            breaker_name=cb.name,
            old_state=old_state.name,
            new_state=new_state.name
        )

gemini_breaker = pybreaker.CircuitBreaker(
    fail_max=3,
    reset_timeout=30,
    name="gemini_api_breaker",
    listeners=[CircuitBreakerListener()]
)
```

---

## 5. Distributed Transactions & Compensating SAGA Pattern

ব্লক অনুমোদন ও ফিল্ডে হস্তান্তরের প্রক্রিয়াটি একাধিক স্বতন্ত্র ধাপ সম্পন্ন করে। কোনো একটি ধাপে ব্যর্থ হলে সিস্টেমটিকে সুরক্ষিত অবস্থায় ফিরিয়ে আনতে **Forward-Recovery SAGA with Compensating Transactions** বাস্তবায়ন করা হয়েছে:

```
[Step 1: Reserve Track] ────► [Step 2: Symbolic Proof] ────► [Step 3: LOTO / OHE Cut] ────► [Step 4: Issue Token]
       │                              │                              │                              │
       ▼ (Fail)                       ▼ (Fail)                       ▼ (Fail)                       ▼ (Fail)
[Compensate 1: Unlock] ◄─── [Compensate 2: Flag Unsafe] ◄── [Compensate 3: Restore Power] ◄ [Compensate 4: Revoke Token]
```

### 5.1 SAGA Step Specification for Block Approval Workflow

| Step # | Action Description | Primary Service | Failure Condition | Compensating Action (Rollback) |
|:---:|:---|:---|:---|:---|
| **1** | পোস্টজিআইএস সেকশনে ট্র্যাক জ্যামিতি রিজার্ভ করা | `apps.blocks` | স্থানিক বা সময়গত বিরোধ | রিজার্ভেশন বাতিল এবং সেকশনকে পুনরায় `FREE` ঘোষণা। |
| **2** | HermiT সিম্বলিক রিজনার দিয়ে নিরাপত্তা প্রমাণ | `apps.ontology` | লুকায়িত ট্রেনের সাথে ক্ল্যাশ | রিজার্ভেশন বাতিল এবং কনফ্লিক্ট লগ লিপিবদ্ধ করা। |
| **3** | TRD পাওয়ার আইসোলেশন ও LOTO ভেরিফিকেশন | `apps.departments`| ওএইচই পাওয়ার কাটতে অস্বীকৃতি | ব্লক স্ট্যাটাস রিভার্ট করে `PENDING_TRD_POWER` করা। |
| **4** | ডিজিটাল টোকেন (#71) ইস্যু ও স্যাংশন PDF জেন | `apps.analytics` | PDF রেন্ডারিং ফেইলিওর | টোকেন অবিলম্বে রিভোক করা এবং কন্ট্রোলারকে অ্যালার্ট পাঠানো। |

---

## 6. HTTP API Idempotency Specification

নেটওয়ার্ক বিভ্রাট বা ইউজার কর্তৃক সাবমিট বাটনে একাধিকবার ক্লিকের কারণে যাতে সিস্টেমে ডাবল ব্লক তৈরি বা ডাবল টোকেন ইস্যু না হয়, তার জন্য `X-Idempotency-Key` হেডার বাধ্যতামূলক:

### 6.1 Idempotency Workflow
1. **ক্লায়েন্ট হেডার:** ক্লায়েন্ট প্রতিটি মিউটেটিং রিকোয়েস্টে (`POST /api/v1/blocks/`, `POST /api/v1/blocks/{id}/approve/`) একটি অনন্য UUID4 হেডার পাঠায়:
   ```http
   X-Idempotency-Key: a4f8b9c2-3d1e-4f5a-8b9c-0d1e2f3a4b5c
   ```
2. **রেডিস লক যাচাই:** ব্যাকএন্ড চেক করে Redis-এ `railway:idempotency:{key}` বিদ্যমান কিনা।
3. **যদি নতুন হয়:** রিকোয়েস্টটি প্রসেস করে রেসপন্স পে-লোডটি ২৪ ঘণ্টার জন্য Redis-এ ক্যাশ করা হয় (`SETEX`).
4. **যদি পুনরাবৃত্তি হয়:** ডেটাবেসে পুনরায় এক্সিকিউট না করে সরাসরি ক্যাশ করা পূর্ববর্তী রেসপন্স ফিরিয়ে দেওয়া হয় (`HTTP 200 OK`).

```python
# apps/core/middleware.py
from django.core.cache import cache
from django.http import JsonResponse

class IdempotencyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ["POST", "PUT", "PATCH"]:
            idempotency_key = request.headers.get("X-Idempotency-Key")
            if idempotency_key:
                cache_key = f"railway:idempotency:{idempotency_key}"
                cached_response = cache.get(cache_key)
                if cached_response:
                    return JsonResponse(cached_response["data"], status=cached_response["status"])
        
        response = self.get_response(request)
        return response
```

---

## 7. Traceability to Subsequent Specification Documents

| Target Document | Messaging Architecture Dependency |
|:---|:---|
| **`01-tech-infra/05-observability.md`** | সার্কিট ব্রেকারের স্টেট পরিবর্তন ও SAGA কম্পেনসেশনের জন্য ডিস্ট্রিবিউটেড ট্রেসিং ও মেট্রিক্স। |
| **`03-service-blueprints/01-block-planning-service.md`** | SAGA অর্কেস্ট্রেশন ও কম্বাইন্ড ব্লক সার্ভিস মেথডের কোডিং স্পেসিফিকেশন। |
| **`05-deep-dive-logs/01-common-payloads-and-algorithms.md`** | SAGA কম্পেনসেটিং অ্যালগরিদম ও সার্কিট ব্রেকার হ্যান্ডলিং। |
