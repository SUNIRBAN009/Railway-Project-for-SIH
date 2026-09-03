# 06-security.md

> **File Order:** 10/45  
> **Previous File:** `01-tech-infra/05-observability.md` (Logs for audit trails)  
> **Next File:** `01-tech-infra/07-workers-consumers.md`  
> **Connection:** The rate limiting and RBAC strategies defined here will directly impact how background workers and WebSocket consumers handle tasks and connections in the next file.

---

## 1. Authentication & Authorization

### 1.1 Authentication (JWT)
We use `djangorestframework-simplejwt` for Stateless Authentication.
- **Access Token:** 60-minute expiry. Used in the `Authorization: Bearer <token>` header.
- **Refresh Token:** 1-day expiry. Stored securely.
- **Blacklisting:** On logout, the refresh token is added to the Redis blacklist to prevent reuse.

### 1.2 Authorization (RBAC Roles)
Role-Based Access Control is enforced at the ViewSet level using DRF Permissions.

```python
# accounts/permissions.py
from rest_framework import permissions

class IsCOA(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'COA')

class IsOwnDepartment(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Admins can see everything, JEs can only see their department's data
        if request.user.role == 'COA':
            return True
        return obj.department == request.user.department
```

---

## 2. Request Validation

Data entering the system must be strictly validated before hitting the database or ontology.

### 2.1 File Upload Validation (Emergency Photos)
Emergency blocks require photo evidence. We prevent malicious uploads via strict checks.

```python
# blocks/validators.py
import magic
from django.core.exceptions import ValidationError

def validate_photo_upload(file):
    # Size limit (5MB)
    if file.size > 5 * 1024 * 1024:
        raise ValidationError("File too large. Max 5MB.")
    
    # MIME type validation (detect real file type, not just extension)
    file_mime = magic.from_buffer(file.read(1024), mime=True)
    file.seek(0)
    if file_mime not in ['image/jpeg', 'image/png']:
        raise ValidationError(f"Invalid file type: {file_mime}. Only JPG/PNG allowed.")
    
    # Filename sanitization
    import uuid
    ext = file.name.split('.')[-1].lower()
    file.name = f"{uuid.uuid4().hex[:16]}.{ext}"
    return file
```

### 2.2 DRF Serializer Validation

```python
# blocks/serializers.py
class BlockRequestSerializer(serializers.ModelSerializer):
    def validate(self, data):
        if data['end_time'] <= data['start_time']:
            raise serializers.ValidationError("End time must be after start time.")
        
        if data['to_km'] <= data['from_km']:
            raise serializers.ValidationError("to_km must be greater than from_km.")
            
        if data.get('emergency_flag') and not data.get('photo_url'):
            raise serializers.ValidationError("Emergency block requires photo evidence.")
            
        return data
```

---

## 3. Rate Limiting

To prevent DoS attacks and control external API costs (Gemini/Twilio), we apply tier-based throttling using DRF.

### 3.1 Tier Table

| Tier | Scope | Rate | Endpoint |
|------|-------|------|----------|
| Anonymous | Unauthenticated | 30 req/min | Login, health check only |
| Authenticated (JE) | ENG_JE, TRD_JE, SNT_JE | 100 req/min | General API |
| Authenticated (SE) | Section Engineer | 200 req/min | General + approval |
| Admin (COA) | Control Office | 500 req/min | All endpoints |
| Emergency | All authenticated | 2 req/min | `POST /blocks/emergency/` |
| Block Creation | All authenticated | 5 req/min | `POST /blocks/` |
| AI (Gemini) | All authenticated | 10 req/min | Conflict resolution |
| SMS (Twilio) | System | 1 msg/sec | Notification service |

### 3.2 Implementation

```python
# railway_ai/throttling.py
from rest_framework.throttling import UserRateThrottle

class RoleBasedThrottle(UserRateThrottle):
    def get_rate(self):
        role = getattr(self.request.user, 'role', None)
        if role == 'COA':
            return '500/min'
        elif role == 'SE':
            return '200/min'
        else:
            return '100/min'
```

---

## 4. Secret Management

| Secret | Type | Storage | Access |
|--------|------|---------|--------|
| `SECRET_KEY` | Django signing key | `.env` / Cloud Env | Backend only |
| `DB_PASSWORD` | PostgreSQL | `.env` / Cloud Env | Backend only |
| `GEMINI_API_KEY` | Google AI API | `.env` / Cloud Env | Backend only |
| `TWILIO_AUTH_TOKEN` | Twilio API | `.env` / Cloud Env | Backend only |
| `MAPBOX_ACCESS_TOKEN`| Mapbox public token | Frontend env | Frontend + Backend |

**Leak Detection:**
- Mapbox token is public but scoped to the HTTP referer (`localhost` or the production domain).
- Pre-commit hooks (`detect-secrets`) are recommended to prevent accidental commits of API keys.

---

## 5. Data Encryption & Security Headers

### 5.1 At Rest
- **PostgreSQL:** AES-256 (managed by cloud provider).
- **Passwords:** Argon2 (Django's recommended irreversible hash).
- **Photos:** Stored in file system, access controlled by application logic.

### 5.2 In Transit
- **Browser ↔ Server:** HTTPS (TLS 1.3).
- **Backend ↔ PostgreSQL:** PostgreSQL SSL (TLS 1.2+).
- **WebSocket:** WSS (WebSocket Secure).

### 5.3 Django Security Headers
Enforced via `settings.py` when `DEBUG = False`:

```python
# settings.py
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000   # 1 year HSTS
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'")  # For React
```
