# 01-accounts.md

> **File Sequence:** 17/45  
> **Previous Document:** [03-service-blueprints/00-service-template.md](00-service-template.md)  
> **Next Document:** [03-service-blueprints/02-blocks.md](02-blocks.md)  
> **Context:** Authoritative specification for `SVC-AUTH` (Authentication & RBAC Domain), providing security tokens, role hierarchies, and identity verification across all railway operations.

---

# SVC-AUTH: Identity, Access Management & RBAC Service

> **Service ID:** `SVC-AUTH`  
> **Django App:** `apps.accounts`  
> **Owning Team:** Platform Core Infrastructure & Security Team  
> **Lead Architect:** Principal Security Architect  
> **Primary SLA:** 99.99% Availability, p95 Latency < 45ms  
> **Classification:** Security-Critical Authentication Gateway

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission
Provides unified authentication, role-based authorization, granular departmental scoping, and cryptographic audit session tracking for all Indian Railways personnel interacting with the AI Block Planning Platform. Ensures complete departmental isolation between Engineering (ENG), Traction Distribution (TRD), and Signalling & Telecommunication (S&T), while enabling Chief Controllers (COA) and Section Engineers (SE) to exercise multi-departmental governance.

### 1.2 Bounded Context Boundary
- **In-Scope Responsibilities:**
  - Secure credential storage, Argon2id hashing, multi-factor challenge generation.
  - JWT token issuance (RS256 signed access tokens) and refresh token rotation with cryptographic revocation.
  - Dynamic RBAC enforcement based on user roles (`ADMIN`, `CHIEF_CONTROLLER`, `SECTION_CONTROLLER`, `DEPT_ENGINEER`, `SITE_SUPERVISOR`, `AUDITOR`).
  - Active session tracking, token blacklisting in Redis, and security telemetry.
- **Explicit Exclusions:**
  - Maintenance gang roster management (owned by `SVC-DEPT`).
  - Physical asset ownership mapping (owned by `SVC-AST`).
  - Emergency notification delivery over SMS/Push (owned by `SVC-NOTIF`).

---

## 2. Technical Stack & Runtime Configuration

```
+--------------------------------------------------------------------------+
|                       SVC-AUTH RUNTIME TOPOLOGY                          |
+--------------------------------------------------------------------------+
|  Inbound REST: /api/v1/auth/*, /api/v1/users/*                          |
|  Security Framework: djangorestframework-simplejwt + argon2-cffi        |
|  Token Protocol: RS256 Asymmetric Cryptography (Public/Private Keypair)  |
|  Data Layer: MySQL 8.0 (InnoDB) `users`, `roles`, `user_sessions`        |
|  Token Blacklist Cache: Redis 7.2 (DB 1) with auto-expiring keys         |
+--------------------------------------------------------------------------+
```

| Technology | Specification / Version | Architectural Rationale |
|---|---|---|
| **Python Runtime** | 3.11.8 | Secure memory management, async native primitives |
| **Framework** | Django 5.0 + DRF 3.15 | Battle-tested session lifecycle and permission gates |
| **Password Hashing** | Argon2id (`time_cost=3`, `memory_cost=65536`) | OWASP recommended password hashing standard resistant to GPU/ASIC attacks |
| **Token Format** | JWT (RS256, 15 min expiry) | Stateless validation by downstream services using public key |
| **Session Cache** | Redis 7.2 | Instant token blacklisting on logout or credential reset |

---

## 3. Database Schema & Persistence (MySQL 8.0)

### 3.1 Table Definitions

```sql
-- User Principal Table
CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `employee_id` VARCHAR(30) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `role` ENUM('ADMIN', 'CHIEF_CONTROLLER', 'SECTION_CONTROLLER', 'DEPT_ENGINEER', 'SITE_SUPERVISOR', 'AUDITOR') NOT NULL,
  `department_code` ENUM('ENG', 'TRD', 'SNT', 'OPERATIONS', 'SAFETY') NOT NULL,
  `division_code` VARCHAR(10) NOT NULL DEFAULT 'DLI',
  `phone_number` VARCHAR(20) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `failed_login_attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME(6) NULL,
  `last_login_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_employee_id` (`employee_id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_dept` (`role`, `department_code`),
  KEY `idx_users_division` (`division_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Session & Audit Revocation Table
CREATE TABLE `user_sessions` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `session_jti` VARCHAR(64) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_jti` (`session_jti`),
  KEY `idx_sessions_user_active` (`user_id`, `is_revoked`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.2 Redis Cache Key Namespace
- **Blacklisted JTI:** `auth:blacklist:{jti}` -> TTL equal to token remaining lifetime.
- **Login Rate Limiting:** `ratelimit:auth:login:{ip}` -> Fixed window 10 attempts / 5 minutes.
- **User Profile Snapshot:** `cache:user:profile:{user_id}` -> TTL 3600 seconds.

---

## 4. API Endpoints Specification

| Method | Endpoint | Role Permission | Request Body / Query | Response DTO | SLA (p95) |
|---|---|---|---|---|:---:|
| `POST` | `/api/v1/auth/login/` | Anonymous | `{"username", "password"}` | `{"access_token", "user": {...}}` + Set-Cookie `refresh_token` | < 60ms |
| `POST` | `/api/v1/auth/refresh/` | Cookie Auth | `refresh_token` (Cookie) | `{"access_token": "<new_jwt>"}` | < 30ms |
| `POST` | `/api/v1/auth/logout/` | Authenticated | Empty body | `{"success": true, "message": "Session invalidated"}` | < 40ms |
| `GET` | `/api/v1/auth/me/` | Authenticated | None | Full User Profile DTO with Department & Permissions | < 25ms |
| `GET` | `/api/v1/users/` | Controller/Admin | `?department=TRD&role=DEPT_ENGINEER` | Paginated User Collection | < 70ms |
| `POST` | `/api/v1/users/` | Admin | New User Creation Schema | Created User Profile DTO | < 90ms |
| `PATCH` | `/api/v1/users/{id}/` | Admin | Partial User Schema | Updated User Profile DTO | < 60ms |

---

## 5. Event-Driven Interfaces & Message Contracts

### 5.1 Published Events (Redis `events:accounts`)
```json
{
  "event_id": "c1f728c0-f21e-4573-9529-57778bca4871",
  "event_type": "accounts.user.logged_in",
  "timestamp": "2026-09-04T10:15:30.123456Z",
  "actor_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "employee_id": "NR-ENG-4921",
    "role": "DEPT_ENGINEER",
    "department": "ENG",
    "division": "DLI",
    "ip_address": "10.12.44.18"
  }
}
```

```json
{
  "event_id": "a92e1189-9831-41b9-8c44-325bdf909871",
  "event_type": "accounts.user.session_revoked",
  "timestamp": "2026-09-04T10:16:00.000000Z",
  "actor_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "session_jti": "jwt-token-uuid-identifier",
    "reason": "USER_LOGOUT"
  }
}
```

---

## 6. Security, Threat Surface & Access Matrix

### 6.1 Role-Based Permission Matrix

| Resource / Action | ADMIN | CHIEF_CONTROLLER | SECTION_CONTROLLER | DEPT_ENGINEER | SITE_SUPERVISOR | AUDITOR |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| User Administration | Full | None | None | None | None | Read-Only |
| View System Users | Full | Full | Read (Division) | Read (Department) | Read (Self) | Read-Only |
| Request Block Possession | None | None | None | Create / Modify Own | View Assigned | Read-Only |
| Approve Block Possession | None | Final Sanction | Section Sanction | Review Own Dept | None | Read-Only |
| Access Audit Trails | Full | Full | Section Only | None | None | Full |

---

## 7. Environment Configuration Variables

```env
# JWT & Crypto Configuration
JWT_PRIVATE_KEY_PATH=/etc/secrets/jwt_rs256_private.pem
JWT_PUBLIC_KEY_PATH=/etc/secrets/jwt_rs256_public.pem
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
ARGON2_TIME_COST=3
ARGON2_MEMORY_COST_KB=65536
ARGON2_PARALLELISM=2

# Security Thresholds
AUTH_MAX_FAILED_LOGIN_ATTEMPTS=5
AUTH_ACCOUNT_LOCKOUT_MINUTES=15
```
