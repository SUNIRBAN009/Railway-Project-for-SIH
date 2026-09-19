# 01-accounts.md

> **ফাইল ক্রম:** ১৭/৪৫  
> **পূর্ববর্তী ফাইল:** [03-service-blueprints/00-service-template.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/00-service-template.md) (Standard Canonical Service Blueprint Template)  
> **পরবর্তী ফাইল:** [03-service-blueprints/02-blocks.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/02-blocks.md)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের প্রথম কোর মাইক্রোসার্ভিস **`SVC-AUTH` (Identity, Spatial RBAC & Authentication Service)**-এর পূর্ণাঙ্গ প্রোডাকশন আর্কিটেকচার ব্লুপ্রিন্ট সংজ্ঞায়িত করা হয়েছে। এতে PostgreSQL 15 + PostGIS 3.3 স্পেশিয়াল জুরিসডিকশন স্কিমা (Feature #112), Argon2id পাসওয়ার্ড হ্যাশিং, JWT টোকেন লাইফসাইকেল, বায়োমেট্রিক সেশন ট্র্যাকিং এবং রোল-বেসড পারমিশন মেকানিজম বিস্তারিতভাবে সন্নিবেশিত হয়েছে।

---

# SVC-AUTH: Identity, Spatial RBAC & Authentication Service

> **Service ID:** `SVC-AUTH`  
> **Bounded Context App:** `apps.accounts`  
> **Owning Team:** Platform Core Infrastructure & Cyber-Security Team  
> **Business Criticality:** `Security-Critical (Authentication & Access Control Gateway)`  
> **Primary SLA:** Availability $\ge 99.99\%$, p95 Latency $< 40\text{ ms}$, p99 Latency $< 80\text{ ms}$  
> **Execution Runtime:** Gunicorn WSGI (:8000) + Redis 7.2 Cache & Blacklist (DB 1 & DB 2)

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission & Railway Mandate
`SVC-AUTH` হলো প্ল্যাটফর্মের সেন্ট্রালাইজড আইডেন্টিটি এবং অ্যাক্সেস কন্ট্রোল গেটওয়ে। এটি ভারতীয় রেলওয়ের বিভিন্ন বিভাগীয় কর্মী (ENGG, TRD, S&T, Operating/COA, Safety) এবং কন্ট্রোলরুমের কর্মকর্তাদের জন্য সিকিউর আইডেন্টিফিকেশন, ডিপার্টমেন্টাল আইসোলেশন, ক্রিপ্টোগ্রাফিক সেশন ট্র্যাকিং এবং **স্পেশিয়াল আরব্যাক (Spatial RBAC - Feature #112)** নিশ্চিত করে।

- **Problem Statement PS26027 Alignment:**
  - [x] Pillar 1: Automated AI Conflict Detection (Role-gated conflict override authority)
  - [x] Pillar 2: Joint Inter-Departmental Combined Block Windows (Multi-departmental co-possession authorization)
  - [x] Pillar 3: Permissive Safety & Site Execution Compliance (Digital Token issuance #71 & Biometric Muster #72)
  - [x] Pillar 4: Predictive Asset Twin (Spatial access bounds to GIS infrastructure)

### 1.2 Bounded Context Inclusions & Exclusions
- **In-Scope Responsibilities:**
  - Secure credential storage using **Argon2id** password hashing.
  - JWT token issuance (RS256 asymmetric or HS256 with rotation) and JTI cryptographic revocation via Redis blacklist.
  - Role-Based Access Control (RBAC) across 6 hierarchical roles: `ADMIN`, `CHIEF_CONTROLLER`, `SECTION_CONTROLLER`, `DEPT_ENGINEER`, `SITE_SUPERVISOR`, `AUDITOR`.
  - Departmental data scoping (`ENG`, `TRD`, `SNT`, `OPERATIONS`, `SAFETY`).
  - **Spatial Jurisdiction Verification (Feature #112):** PostGIS polygon containment checks ensuring engineers cannot request/approve track blocks outside their designated railway division/section.
  - Brute-force protection: 5 consecutive failed attempts trigger a 15-minute account lockout.
- **Explicit Exclusions (Out of Scope):**
  - Maintenance gang crew scheduling and rosters (owned by `SVC-DEPT`).
  - Track possession state machines (owned by `SVC-BLK`).
  - SMS alert transmission (delegated to `SVC-NOTIF`).

---

## 2. Technical Stack & Runtime Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SVC-AUTH RUNTIME TOPOLOGY                                           │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Inbound Traffic: HTTPS REST API (/api/v1/accounts/*, /api/v1/auth/*) via Nginx Edge Proxy             │
│  Application Framework: Django 5.0 + Django REST Framework 3.15                                        │
│  Cryptography: `argon2-cffi` (Password hashing) + `PyJWT` (Token lifecycle)                            │
│  Persistence: PostgreSQL 15 + PostGIS 3.3 (Tables: `accounts_userprofile`, `accounts_usersession`,     │
│               `accounts_spatial_jurisdiction`)                                                         │
│  Cache & Blacklist: Redis 7.2 (DB 2: L1 User Profiles, DB 1: Blacklisted JWT JTIs)                    │
│  Instrumentation: Structlog JSON audit logger, Prometheus metrics exporter                             │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Component | Technology | Version | Purpose & Railway Domain Justification |
|---|---|---|---|
| **Programming Language** | Python | 3.11.8 | High-throughput authentication pipeline with async security filters |
| **Framework** | Django / DRF | 5.0.x / 3.15.x | Declarative permissions (`BasePermission`), clean ORM transactions |
| **Password Hashing** | Argon2id | RFC 9106 | Memory-hard algorithm resistant to GPU/ASIC brute-force attacks |
| **Token Format** | JWT | RFC 7519 | Stateless 15-minute access token carrying role, department, and division claims |
| **Spatial Engine** | PostGIS | 3.3.x | Division & Section polygon containment verification (`ST_Contains`) |
| **Blacklist Cache** | Redis | 7.2.4 | Sub-millisecond revocation lookup for logged-out or compromised tokens |

---

## 3. Database Schema & Persistence (PostgreSQL 15 + PostGIS 3.3)

### 3.1 Table Definitions & Data Dictionary

```sql
-- =============================================================================
-- SVC-AUTH PostgreSQL 15 + PostGIS 3.3 DDL Specification
-- =============================================================================

-- 1. Railway Extended User Profile Table
CREATE TABLE accounts_userprofile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL UNIQUE,
    employee_id VARCHAR(36) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'DEPT_ENGINEER',
    department_code VARCHAR(20) NOT NULL DEFAULT 'ENG',
    division_code VARCHAR(10) NOT NULL DEFAULT 'DLI',
    phone_number VARCHAR(20) NOT NULL DEFAULT '',
    badge_number VARCHAR(50) NOT NULL DEFAULT '',
    
    -- Security Lockout & Telemetry
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    last_login_at TIMESTAMPTZ NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraint to Core Django auth_user
    CONSTRAINT fk_userprofile_auth_user FOREIGN KEY (user_id) 
        REFERENCES auth_user(id) ON DELETE CASCADE,
        
    -- Check Constraints for Role & Department Enums
    CONSTRAINT chk_accounts_role CHECK (
        role IN ('ADMIN', 'CHIEF_CONTROLLER', 'SECTION_CONTROLLER', 
                 'DEPT_ENGINEER', 'SITE_SUPERVISOR', 'AUDITOR')
    ),
    CONSTRAINT chk_accounts_department CHECK (
        department_code IN ('ENG', 'TRD', 'SNT', 'OPERATIONS', 'SAFETY')
    )
);

-- 2. Spatial Jurisdiction Master Table (Feature #112)
CREATE TABLE accounts_spatial_jurisdiction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    zone_code VARCHAR(10) NOT NULL,          -- e.g. 'ER', 'NR', 'SER'
    division_code VARCHAR(10) NOT NULL,      -- e.g. 'HWH', 'SDAH', 'DLI'
    sub_division_code VARCHAR(20),           -- e.g. 'HWH-MAIN', 'BWN-CHORD'
    
    -- PostGIS MultiPolygon representing the physical territorial authority
    jurisdiction_boundary GEOMETRY(MultiPolygon, 4326) NOT NULL,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_jurisdiction_profile FOREIGN KEY (profile_id)
        REFERENCES accounts_userprofile(id) ON DELETE CASCADE
);

-- 3. Active User Session & JTI Revocation Table
CREATE TABLE accounts_usersession (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL,
    session_jti VARCHAR(64) NOT NULL UNIQUE,
    ip_address INET NULL,
    user_agent VARCHAR(255) NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_usersession_auth_user FOREIGN KEY (user_id)
        REFERENCES auth_user(id) ON DELETE CASCADE
);
```

### 3.2 Indexing & Performance Strategy
```sql
-- PostGIS Spatial Index for Spatial RBAC queries
CREATE INDEX idx_accounts_jurisdiction_boundary 
    ON accounts_spatial_jurisdiction USING GIST (jurisdiction_boundary);

-- High-performance B-tree composite indexes for role/department lookups
CREATE INDEX idx_accounts_userprofile_role_dept 
    ON accounts_userprofile (role, department_code);
CREATE INDEX idx_accounts_userprofile_division 
    ON accounts_userprofile (division_code);
CREATE INDEX idx_accounts_usersession_user_revoked 
    ON accounts_usersession (user_id, is_revoked);
```

### 3.3 Redis Caching & Key Namespaces
- **JTI Blacklist:** `auth:blacklist:{session_jti}` -> Stored with TTL = token remaining duration. Checked on every authenticated request in $< 1\text{ ms}$.
- **Login Brute-Force Counter:** `ratelimit:auth:login:{client_ip}` -> Sliding window rate limiter (max 10 requests / 5 minutes).
- **User Profile Snapshot:** `cache:user:profile:{user_id}` -> Cached JSON profile with TTL = 3600s, proactively flushed on profile update.

---

## 4. API Endpoints Specification

All responses adhere to the standard platform JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-18T10:15:00.000Z",
  "correlation_id": "c1f728c0-f21e-4573-9529-57778bca4871"
}
```

### API Routing Contract

| HTTP Method | Route Path | Auth Required | Role Permissions | Request DTO | Response DTO | SLA Target |
|---|---|:---:|---|---|---|:---:|
| `POST` | `/api/v1/accounts/login/` | Anonymous | Open | `{"username", "password"}` | Token Pair DTO + Profile | p95 < 45ms |
| `POST` | `/api/v1/accounts/refresh/` | Token Auth | Any Valid Refresh | `{"refresh_token"}` | New Access Token DTO | p95 < 20ms |
| `POST` | `/api/v1/accounts/logout/` | Bearer Token | Authenticated | `{"refresh_token"}` | `{"message": "Session revoked"}`| p95 < 25ms |
| `GET` | `/api/v1/accounts/profile/`| Bearer Token | Authenticated | None | Full Profile + Spatial Bounds | p95 < 15ms |
| `GET` | `/api/v1/accounts/users/` | Bearer Token | `CHIEF_CONTROLLER` / `ADMIN` | Query filters (`role`, `dept`) | Paginated User List | p95 < 60ms |
| `POST` | `/api/v1/accounts/users/` | Bearer Token | `ADMIN` | Create User Profile Schema | Created User Record | p95 < 80ms |
| `POST` | `/api/v1/accounts/verify-spatial-access/`| Bearer Token | `DEPT_ENGINEER`+ | `{"corridor_id", "km_point"}` | `{"authorized": true, "jurisdiction": "HWH"}` | p95 < 30ms |

---

## 5. Event-Driven Message Contracts

### 5.1 Published Events (Redis Channel Layer & Outbox)

```json
{
  "event_id": "c1f728c0-f21e-4573-9529-57778bca4871",
  "event_type": "accounts.user.logged_in",
  "timestamp": "2026-09-18T10:15:30.123456Z",
  "actor_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "user_id": 14,
    "employee_id": "ER-ENG-4921",
    "role": "DEPT_ENGINEER",
    "department_code": "ENG",
    "division_code": "HWH",
    "client_ip": "10.12.44.18"
  }
}
```

```json
{
  "event_id": "a92e1189-9831-41b9-8c44-325bdf909871",
  "event_type": "accounts.user.locked_out",
  "timestamp": "2026-09-18T10:16:00.000000Z",
  "actor_id": "system",
  "payload": {
    "user_id": 14,
    "employee_id": "ER-ENG-4921",
    "reason": "EXCEEDED_FAILED_LOGIN_ATTEMPTS",
    "failed_attempts": 5,
    "locked_until": "2026-09-18T10:31:00.000Z",
    "client_ip": "10.12.44.18"
  }
}
```

---

## 6. Security, Spatial RBAC & Permissive Gate Infrastructure

### 6.1 Spatial RBAC Boundary Verification (Feature #112)
Before a Departmental Engineer (`DEPT_ENGINEER`) or Site Supervisor (`SITE_SUPERVISOR`) can submit a block proposal or issue a Permit-to-Work (PTW), the system executes a PostGIS spatial containment query:

```sql
SELECT EXISTS (
    SELECT 1 
    FROM accounts_spatial_jurisdiction j
    JOIN accounts_userprofile p ON j.profile_id = p.id
    WHERE p.user_id = %(user_id)s
      AND j.is_active = TRUE
      AND ST_Contains(j.jurisdiction_boundary, ST_SetSRID(ST_MakePoint(%(longitude)s, %(latitude)s), 4326))
) AS is_authorized;
```
If `is_authorized` evaluates to `FALSE`, the API aborts with `HTTP 403 Forbidden: "User jurisdiction does not cover corridor chainage KM X.XXX"`.

### 6.2 Role-Based Permission Matrix

| Operational Capability | ADMIN | CHIEF_CONTROLLER (COA) | SECTION_CONTROLLER | DEPT_ENGINEER (JE/SE) | SITE_SUPERVISOR | AUDITOR |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **User & Jurisdiction Admin** | Full | None | None | None | None | Read-Only |
| **Propose Block Window** | Full | None | None | **Own Dept & Jurisdiction** | **Own Gang** | None |
| **Multi-Dept Co-Possession** | Full | **Sanction All** | Sanction Section | Coordinate Own Dept | View Assigned | Read-Only |
| **Final Block Approval** | Full | **Final Sanction** | Section Clearance | None | None | Read-Only |
| **Issue Digital Token (#71)**| None | **Authorized** | Authorized | None | None | Read-Only |
| **Sign Off Section Clearance**| None | Review Clear | Review Clear | **Field Certify** | **Tool Count Cert**| Audit Log |

### 6.3 Argon2id Password Hashing Profile
The password verification pipeline utilizes the OWASP-recommended Argon2id profile:
- **Time Cost:** `3` iterations
- **Memory Cost:** `65,536 KiB` (64 MB)
- **Parallelism:** `2` concurrent threads
- **Salt Length:** 16 bytes cryptographically secure pseudo-random bytes

---

## 7. Configuration & Environment Variables

```env
# ==============================================================================
# SVC-AUTH Operational Environment Configuration
# ==============================================================================
AUTH_JWT_SECRET_KEY=railway_secure_hmac_sha256_super_secret_key_2026
AUTH_JWT_ACCESS_LIFETIME_MINUTES=15
AUTH_JWT_REFRESH_LIFETIME_DAYS=7

# Brute-Force Protection Parameters
AUTH_MAX_FAILED_LOGIN_ATTEMPTS=5
AUTH_ACCOUNT_LOCKOUT_MINUTES=15

# Password Hashing Cost
AUTH_ARGON2_TIME_COST=3
AUTH_ARGON2_MEMORY_COST_KB=65536
AUTH_ARGON2_PARALLELISM=2

# Redis Cache Databases
AUTH_REDIS_BLACKLIST_DB=1
AUTH_REDIS_PROFILE_CACHE_DB=2
```

---

## 8. Observability, RED Metrics & Health Probes

- **Liveness Probe:** `GET /api/v1/accounts/health/liveness/` -> Returns `200 OK {"status": "UP"}`.
- **Readiness Probe:** `GET /api/v1/accounts/health/readiness/` -> Validates PostgreSQL query response and Redis DB 1/DB 2 PING.
- **Prometheus Metrics Exported:**
  - `accounts_login_attempts_total{status="success|failure|locked"}` (Counter)
  - `accounts_active_sessions_gauge{role}` (Gauge)
  - `accounts_jwt_verifications_total{result="valid|expired|blacklisted"}` (Counter)
  - `accounts_spatial_rbac_rejections_total{division}` (Counter - Feature #112 violation monitor)

---

## 9. Testing & Quality Assurance Mandate

- **Unit Tests (`tests/test_auth_rbac.py`):**
  - Verify that Junior Engineers (`DEPT_ENGINEER`) cannot call block approval endpoints (`HTTP 403`).
  - Verify that Section Controllers cannot approve blocks outside their assigned division.
- **Spatial Jurisdiction Test (`tests/test_spatial_jurisdiction.py`):**
  - Verify that an engineer assigned to Howrah Division polygon is rejected when attempting to schedule a block in Kharagpur Division.
- **Brute-Force Lockout Test:**
  - Verify that exactly 5 wrong password attempts lock the account until `locked_until` timestamp, rejecting even correct credentials during the lockout window.
- **Token Blacklist Test:**
  - Verify that calling `/api/v1/accounts/logout/` immediately revokes the JWT refresh token in Redis and rejects subsequent refresh attempts.

---

## 10. Next File Dependency Note

> **পরবর্তী ফাইল:** [03-service-blueprints/02-blocks.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/02-blocks.md)

`01-accounts.md` (`SVC-AUTH`) সম্পূর্ণ প্রস্তুত। পরবর্তী ফাইল `02-blocks.md`-এ প্ল্যাটফর্মের কোর ইঞ্জিন **Block Management, Spatial Conflict Detection, Combined Block Windows (#98), এবং 4-Step SAGA Orchestrator (`SVC-BLK`)**-এর প্রোডাকশন ব্লুপ্রিন্ট প্রণয়ন করা হবে।
