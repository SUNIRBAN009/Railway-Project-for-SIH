# 01-accounts-function-map.md

> **File Sequence:** 26/45  
> **Service:** `SVC-AUTH` (`apps.accounts`)  
> **Previous Document:** [04-function-maps/00-function-id-registry.md](00-function-id-registry.md)  
> **Next Document:** [04-function-maps/02-blocks-function-map.md](02-blocks-function-map.md)  
> **Context:** Exhaustive function mapping, schemas, handlers, and validation rules for Identity, Access Management & RBAC.

---

## 1. Function Catalog

| Function ID | Function Name | HTTP Method | Path / Event | Input Schema | Output Schema | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-AUTH-001` | User Login & Authentication | `POST` | `/api/v1/auth/login/` | `LoginRequestDTO` | `AuthTokenResponseDTO` | < 50ms |
| `FUNC-AUTH-002` | Token Refresh Rotation | `POST` | `/api/v1/auth/refresh/` | Cookie: `refresh_token` | `AccessTokenResponseDTO` | < 30ms |
| `FUNC-AUTH-003` | Session Logout & Invalidation | `POST` | `/api/v1/auth/logout/` | Cookie: `refresh_token` | `GenericSuccessResponseDTO` | < 40ms |
| `FUNC-AUTH-004` | Get Current User Context | `GET` | `/api/v1/auth/me/` | Bearer JWT Header | `UserProfileDTO` | < 25ms |
| `FUNC-AUTH-005` | List Departmental Users | `GET` | `/api/v1/users/` | Query Parameters | `PaginatedUsersResponseDTO` | < 70ms |
| `FUNC-AUTH-006` | Provision New User | `POST` | `/api/v1/users/` | `UserCreateRequestDTO` | `UserProfileDTO` | < 90ms |
| `FUNC-AUTH-007` | Administrative Password Reset | `POST` | `/api/v1/users/{id}/reset-password/` | `PasswordResetRequestDTO` | `GenericSuccessResponseDTO` | < 60ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-AUTH-001`: User Login & Authentication
- **Controller Class:** `apps.accounts.views.LoginView` (subclass of `rest_framework.views.APIView`)
- **Authentication:** `AllowAny`
- **Rate Limit Policy:** 10 requests / 5 minutes per client IP (`ratelimit:auth:login:{ip}`)
- **Input Validation Rules:**
  - `username`: String, 3 to 50 characters, alphanumeric with optional underscores or dashes. Required.
  - `password`: String, 8 to 128 characters. Required.
- **Processing Logic:**
  1. Query `users` table where `username = :username` and `is_active = 1`. If not found, increment IP failure counter and return error `AUTH-001` (HTTP 401).
  2. Check if account is locked (`locked_until > CURRENT_TIMESTAMP(6)`). If locked, return error `AUTH-003` (HTTP 403).
  3. Verify password hash using `argon2.PasswordHasher().verify(user.password_hash, password)`. If invalid:
     - Increment `failed_login_attempts`. If count reaches 5, set `locked_until = NOW() + INTERVAL 15 MINUTE`.
     - Return error `AUTH-001` (HTTP 401).
  4. Reset `failed_login_attempts = 0`, update `last_login_at = CURRENT_TIMESTAMP(6)`.
  5. Generate RS256 JWT access token (15-min TTL, claims: `user_id`, `role`, `department_code`, `division_code`).
  6. Generate cryptographically secure refresh token (7-day TTL), persist session record into `user_sessions`.
  7. Set `refresh_token` in `httpOnly`, `Secure`, `SameSite=Lax` cookie.
  8. Publish event `accounts.user.logged_in` to Redis channel `events:accounts`.
- **Output JSON Envelope (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "employee_id": "NR-ENG-4921",
      "username": "sharma_aden_dli",
      "full_name": "R. K. Sharma",
      "role": "DEPT_ENGINEER",
      "department_code": "ENG",
      "division_code": "DLI"
    }
  },
  "timestamp": "2026-09-04T12:00:00.123456Z"
}
```

---

### `FUNC-AUTH-002`: Token Refresh Rotation
- **Controller Class:** `apps.accounts.views.TokenRefreshView`
- **Input:** Refresh token extracted from HTTP cookie `refresh_token`.
- **Processing Logic:**
  1. Decode and verify signature of refresh token.
  2. Extract token `jti` (JWT ID). Check if `jti` exists in Redis blacklist `auth:blacklist:{jti}`. If present, treat as token reuse attack, invalidate all sessions for user, and return `AUTH-004` (HTTP 401).
  3. Verify corresponding session in `user_sessions` is active (`is_revoked = 0`).
  4. Invalidate old refresh token by adding its `jti` to Redis blacklist with remaining TTL.
  5. Issue new RS256 access token and rotated refresh token cookie.
- **Output:** HTTP 200 with new `access_token`.

---

### `FUNC-AUTH-003`: Session Logout & Invalidation
- **Controller Class:** `apps.accounts.views.LogoutView`
- **Authentication:** `IsAuthenticated`
- **Processing Logic:**
  1. Extract refresh token from cookie and current access token from `Authorization` header.
  2. Add refresh token `jti` and access token `jti` to Redis blacklist (`auth:blacklist:{jti}`).
  3. Mark `user_sessions.is_revoked = 1`.
  4. Clear refresh token cookie in response headers (`Max-Age=0`).
  5. Emit `accounts.user.session_revoked` event.
- **Output:** HTTP 200 `{"success": true, "message": "Successfully logged out."}`.
