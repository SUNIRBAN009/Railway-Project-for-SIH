# 06-security.md

> **ফাইল ক্রম:** ১০/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/05-observability.md` (audit trail logging, correlation_id tracing, sensitive data redaction, health endpoints, alert rules, log retention)  
> **পরবর্তী ফাইল:** `01-tech-infra/07-workers-consumers.md`  
> **সংযোগ:** এই ফাইলে নির্ধারিত RBAC permissions, JWT token lifecycle, এবং secret management policies `07-workers-consumers.md`-এর Celery worker authentication (task signature validation), cron job permissions, এবং background job queue access control-এ প্রতিফলিত হবে। `07-workers-consumers.md`-এর worker processes কোন RBAC role-এর অধীনে database access করে তা এই security model-এ নির্ধারিত হবে।

---

## 1. Threat Model (STRIDE)

| Component | Threat Category | Risk | Impact | Mitigation Strategy | Implementation |
|-----------|-----------------|------|--------|---------------------|----------------|
| **Auth API** | Spoofing | High | Unauthorized user impersonates railway engineer | Strong password policy + JWT + brute-force throttling | Argon2 hashing, `simplejwt`, rate limit 5 attempts/min |
| **Block API** | Tampering | Critical | Unauthorized modification of approved block | Serializer validation + object ownership checks + immutable audit log | DRF Serializers, `IsOwnerOrCOA` permission, MySQL `audit_logs` |
| **Block Approval** | Repudiation | High | Approver denies approving hazardous track block | Digital audit trail with user identity, timestamp, and IP | MySQL `audit_logs` with pre/post JSON snapshots |
| **Notification SMS** | Information Disclosure | Medium | Leakage of railway operational personnel phone numbers | Sensitive data redaction in logs and encrypted storage | Masked logging (`+91*****1234`), MySQL data protection |
| **Gemini AI Prompt** | Information Disclosure / Injection | Medium | Prompt injection altering block safety rationale | Server-side prompt templates with strict parameter sanitization | Regex cleaning, whitelist inputs, no PII sent to LLM |
| **WebSocket** | Information Disclosure / Eavesdropping | High | Eavesdropping on live train and block alerts | Encrypted transport + JWT validation on handshake | `wss://` only, token query param verification |
| **Block Creation** | Denial of Service | High | Spammer creates hundreds of fake blocks to halt traffic | Tiered rate limiting per user role | Max 5 blocks/min per user, 100 req/min global |
| **Emergency Block** | Elevation of Privilege | Critical | Malicious engineer falsely flags emergency block | Mandatory photo upload + auto-escalation to COA + immediate audit | Photo validation, automatic broadcast to all control desks |
| **Ontology OWL** | Tampering | High | Corrupting railway topology rules | File integrity checksum + read-only container mount | OWL file version-controlled in Git, container volume read-only |
| **File Upload** | Tampering (Malicious Executables) | High | Uploading web shell disguised as crack photo | Strict MIME inspection, size caps, and filename UUID renaming | `python-magic` MIME validation, max 5MB, random UUID filenames |

---

## 2. Authentication Flow

### 2.1 User Onboarding (Admin-Only)
Railway personnel accounts are pre-provisioned by the Control Office Administrator (COA). There is **no public self-registration**.

```
[COA creates User via Admin / Management Command]
  │
  ├──► Generates UUID and assigns Role (ENG_JE, TRD_JE, SNT_JE, SE, COA)
  ├──► Generates cryptographically secure temporary password
  └──► User must change temporary password on first login
```

### 2.2 Login Flow

```
User (React Web) ──► POST /api/v1/auth/login/ {username, password}
  │
  ▼
Django Backend:
  ├── Verify password hash via Argon2 (PBKDF2 fallback)
  ├── Verify user is_active == 1
  ├── Update last_login timestamp in MySQL
  ├── Generate JWT Token Pair:
  │     ├─ Access Token (Lifetime: 60 min, HS256)
  │     └─ Refresh Token (Lifetime: 1 day, HS256)
  ├── Set Refresh Token in httpOnly, Secure, SameSite=Lax Cookie
  └── Return JSON: { user: {...}, access_token: "..." }
```

### 2.3 Token Refresh Flow (Silent)

```
API Request returns 401 Unauthorized
  │
  ▼
Axios Interceptor catches 401 ──► POST /api/v1/auth/refresh/ (Cookie auto-sent)
  │
  ▼
Backend SimpleJWT:
  ├── Validate refresh token signature
  ├── Check Redis blacklist (`blacklist:{jti}`)
  ├── Generate NEW access token and rotated refresh token
  ├── Set new refresh token in httpOnly cookie
  └── Return { access: "<new_token>" }
```

### 2.4 Logout & Revocation Flow

```
User clicks Logout ──► POST /api/v1/auth/logout/
  │
  ▼
Backend:
  ├── Extracts JTI (JWT ID) from refresh token
  ├── Stores key in Redis: `blacklist:{jti}` with TTL = 86400s (1 day)
  ├── Clears httpOnly cookie (`delete_cookie('refresh_token')`)
  └── Frontend resets Zustand authStore memory
```

---

## 3. Authorization & RBAC

### 3.1 Role Hierarchy

| Role Code | Full Title | Department | Can Create Block | Can Approve Block | Can Emergency Override | Admin Access |
|-----------|------------|------------|------------------|-------------------|------------------------|--------------|
| `ENG_JE` | Permanent Way Junior Engineer | Engineering | Own Dept | ❌ No | ✅ Yes | ❌ No |
| `TRD_JE` | Overhead Traction Junior Engineer | Traction | Own Dept | ❌ No | ✅ Yes | ❌ No |
| `SNT_JE` | Signal & Telecom Junior Engineer | Signal & Telecom | Own Dept | ❌ No | ✅ Yes | ❌ No |
| `SE` | Section Engineer (Supervisor) | Any Dept | Own Dept | ✅ Yes (≤ 4 hrs) | ✅ Yes | ❌ No |
| `COA` | Control Office Administrator | Control | All Depts | ✅ Yes (Unlimited) | ✅ Yes | ✅ Full Admin |

### 3.2 DRF Permission Implementations

```python
# accounts/permissions.py
from rest_framework import permissions

class IsCOA(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'COA')

class IsOwnerOrCOA(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'COA':
            return True
        return obj.requester_id == request.user.id

class CanApproveBlock(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == 'COA':
            return True
        if user.role == 'SE':
            # Section Engineer can only approve own department blocks with duration <= 4 hours
            if obj.department_id != user.department_id:
                return False
            duration_hours = (obj.end_time - obj.start_time).total_seconds() / 3600.0
            return duration_hours <= 4.0
        return False

class CanEmergencyOverride(permissions.BasePermission):
    def has_permission(self, request, view):
        # All authenticated railway engineers can declare emergency
        return bool(request.user and request.user.is_authenticated and request.user.role in [
            'ENG_JE', 'TRD_JE', 'SNT_JE', 'SE', 'COA'
        ])
```

### 3.3 Department Isolation Middleware

```python
# accounts/middleware.py
class DepartmentIsolationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            if request.user.role != 'COA':
                # Filter out other departments automatically for non-COA users
                request.department_id = request.user.department_id
            else:
                request.department_id = None
        return self.get_response(request)
```

---

## 4. JWT Configuration & Claims

### 4.1 Token Settings

```python
# settings.py
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('SECRET_KEY'),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}
```

### 4.2 Standard Claims Payload

```json
{
  "token_type": "access",
  "exp": 1756834800,
  "iat": 1756831200,
  "jti": "550e8400e29b41d4a716446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "username": "rahul_eng_je",
  "role": "ENG_JE",
  "department_id": "dept_eng_001",
  "department_code": "ENG"
}
```

---

## 5. Input Validation & Attack Defenses

### 5.1 SQL Injection Defense
- 100% parameterization using Django ORM (`filter()`, `get()`).
- Raw SQL queries strictly require parameterized tuple binding (`cursor.execute("SELECT ... WHERE id = %s", [record_id])`). String formatting (`%` or `f"{...}"`) in queries is blocked by automated code linter.

### 5.2 File Upload Validation (Photo Evidence)

```python
# utils/validators.py
import magic
from rest_framework.exceptions import ValidationError

ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png']
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def validate_evidence_photo(file_obj):
    if file_obj.size > MAX_FILE_SIZE:
        raise ValidationError("Photo size exceeds maximum allowed limit of 5MB.")

    # Inspect first 1024 bytes for true magic MIME signature
    file_obj.seek(0)
    mime_type = magic.from_buffer(file_obj.read(1024), mime=True)
    file_obj.seek(0)

    if mime_type not in ALLOWED_MIME_TYPES:
        raise ValidationError(f"Invalid file format ({mime_type}). Only JPG and PNG photos are accepted.")
    
    return True
```

### 5.3 Cross-Site Scripting (XSS) & Content Security Policy

```python
# settings.py
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'")  # Needed for Vite runtime bundles
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")   # Needed for Tailwind dynamic utility classes
CSP_IMG_SRC = ("'self'", "data:", "blob:", "https://api.mapbox.com")
CSP_CONNECT_SRC = ("'self'", "ws://localhost:8001", "wss://*", "https://api.mapbox.com")
```

---

## 6. Tiered Rate Limiting

| Scope | Rate Limit | Burst Capacity | Target Users |
|-------|------------|----------------|--------------|
| **Anonymous** | 30 req / min | 5 reqs | Unauthenticated login & health checks |
| **Junior Engineer (JE)** | 100 req / min | 15 reqs | Field engineers creating block drafts |
| **Section Engineer (SE)** | 200 req / min | 25 reqs | Supervisors monitoring gang schedules |
| **Control Office (COA)** | 500 req / min | 50 reqs | Big screen dashboard operations |
| **Emergency Block API** | 2 req / min | 1 req | Critical emergency declaration endpoint |
| **Block Creation API** | 5 req / min | 2 reqs | Standard block proposal submission |
| **Gemini AI Queries** | 10 req / min | 3 reqs | AI conflict explanation and report generator |

---

## 7. Secret Management

All sensitive secrets are injected into environment variables and parsed via `django-environ`. No hardcoded credentials exist in source code.

| Secret Name | Purpose | Rotation Frequency | Storage Location |
|-------------|---------|---------------------|------------------|
| `SECRET_KEY` | Django CSRF and token signing | 180 Days | Environment / Secret Manager |
| `DB_PASSWORD` | MySQL user password | 90 Days | Environment / Container Secret |
| `REDIS_PASSWORD` | Redis authentication | 90 Days | Environment / Container Secret |
| `GEMINI_API_KEY` | Google Generative Language API | 90 Days | Cloud Console / Environment |
| `TWILIO_AUTH_TOKEN` | Twilio SMS API | 180 Days | Twilio Console / Environment |
| `MAPBOX_ACCESS_TOKEN`| Mapbox vector tile rendering | On Leak | Frontend `.env` (Domain restricted) |

---

## 8. Data Encryption

### 8.1 Encryption at Rest
- **MySQL Tablespaces:** Encrypted with MySQL InnoDB Tablespace Encryption (AES-256) via keyring plugin.
- **Passwords:** Irreversibly hashed using Argon2 (`django.contrib.auth.hashers.Argon2PasswordHasher`).
- **Disk Backups:** All `mysqldump` backups are encrypted with GPG prior to storage.

### 8.2 Encryption in Transit
- **Browser ↔ Nginx:** TLS 1.3 enforced with strict cipher suites.
- **Nginx ↔ Django / Daphne:** Internal trusted container bridge network.
- **Django ↔ MySQL:** TLS 1.2+ encrypted connection (`MYSQL_SSL_CA` option).
- **Django ↔ Redis:** TLS enabled for staging and production deployments.
- **Browser ↔ Django Channels:** WSS (WebSocket Secure) over TLS 1.3.

---

## 9. Next File Dependency Note

> পরবর্তী ফাইল: `01-tech-infra/07-workers-consumers.md`

`06-security.md` থেকে `07-workers-consumers.md`-এ নেওয়া হবে:

| Security Element | Worker & Consumer Impact |
|------------------|--------------------------|
| RBAC roles | Celery workers execute system jobs; task kwargs check user role when performing privileged operations |
| Rate limits (Twilio/Gemini) | Worker concurrency configured to strictly adhere to third-party API quotas |
| Department isolation | Background tasks querying blocks/crews automatically apply department filters |
| JWT blacklist | WebSocket consumers validate JWT on handshake and reject blacklisted tokens |
| Photo upload validation | Background tasks compressing or archiving evidence photos re-verify file signatures |

`07-workers-consumers.md`-এ নিচের বিষয়গুলো থাকবে:
- Celery worker architecture (queues, concurrency, routing)
- Django Channels consumers (WebSocket authentication & channel group management)
- Celery Beat periodic jobs schedule (train sync, weather checks, health reports)
- Dead letter queue handling and poison pill mitigation
- Worker scaling strategy per priority queue
