# 01-accounts-service.md

> **File Order:** 17/45  
> **Previous File:** `03-service-blueprints/00-service-template.md` (Template Definition)  
> **Next File:** `03-service-blueprints/02-blocks-service.md`  

---

### Accounts Service Blueprint

**Service ID:** `SVC-01`  
**App Name:** `accounts`  
**Primary Domain:** Identity, Authentication, and Access Control  
**Owner:** Backend Team  

---

### 1. Domain Models (Database Schema)

This service manages the core `User` model, extending Django's built-in `AbstractUser` to support the specific roles and departments of Indian Railways.

```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class Department(models.TextChoices):
    ENG = 'ENG', 'Engineering (Track)'
    TRD = 'TRD', 'Traction Distribution (OHE)'
    SNT = 'SNT', 'Signal & Telecom'
    COA = 'COA', 'Control Office'

class Role(models.TextChoices):
    JE = 'JE', 'Junior Engineer'
    SE = 'SE', 'Section Engineer'
    COA = 'COA', 'Control Office Administrator'

class User(AbstractUser):
    phone_number = models.CharField(max_length=15, unique=True)
    department = models.CharField(max_length=3, choices=Department.choices)
    role = models.CharField(max_length=3, choices=Role.choices)
    
    # Audit fields
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['department', 'role']),
        ]
```

---

### 2. API Endpoints (DRF ViewSets)

| Method | Endpoint | Description | Auth/Role | Request Payload |
|--------|----------|-------------|-----------|-----------------|
| `POST` | `/api/v1/auth/login/` | Issues JWT Access & Refresh tokens. | Public | `{"username": "...", "password": "..."}` |
| `POST` | `/api/v1/auth/refresh/` | Issues new Access token using Refresh token. | Public | `{"refresh": "..."}` |
| `POST` | `/api/v1/auth/logout/` | Blacklists the refresh token. | Auth | `{"refresh": "..."}` |
| `GET`  | `/api/v1/users/me/` | Retrieves current logged-in user profile. | Auth | None |
| `GET`  | `/api/v1/users/` | Lists users (filtered by department unless COA). | COA, SE | None |

---

### 3. Service Layer (Business Logic)

**File:** `accounts/services.py`

```python
class AuthService:
    def authenticate_user(self, username, password):
        """Validates credentials and returns JWT payload."""
        # Django authenticate()
        pass

    def blacklist_token(self, refresh_token):
        """Adds refresh token to Redis blacklist."""
        pass

class UserService:
    def get_users_for_department(self, department_code):
        """Returns active users for a specific department."""
        pass
        
    def validate_role_hierarchy(self, requesting_user, target_user):
        """Ensures a JE cannot modify an SE account."""
        pass
```

---

### 4. Internal Events (Pub/Sub)

**4.1 Signals Emitted (Publisher)**
- `user_logged_in`: Emitted after a successful JWT issuance. Used for audit logging.
- `user_deactivated`: Emitted when an account is disabled (e.g., employee transfer).

**4.2 Signals Consumed (Subscriber)**
- None. The accounts service is foundational and does not react to other domains.

---

### 5. Background Tasks (Celery)

**File:** `accounts/tasks.py`

- `flush_blacklisted_tokens`: A scheduled Celery Beat task that runs every 12 hours to delete expired JWT tokens from the Redis blacklist to save memory.

---

### 6. Dependencies

- **Upstream (Consumes from):** None. (Independent service).
- **Downstream (Provides to):** 
  - `blocks`: Uses `User` model for `requested_by` and `approved_by` Foreign Keys.
  - `departments`: Uses `User` model to map Crew supervisors.
  - `notifications`: Requires user's `phone_number` for Twilio SMS routing.
