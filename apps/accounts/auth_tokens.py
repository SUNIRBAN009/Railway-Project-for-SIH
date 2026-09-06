import datetime
import uuid
import jwt
from django.conf import settings
from django.utils import timezone
from apps.accounts.models import UserSession, UserProfile

# Cache / Redis key patterns
REDIS_BLACKLIST_PREFIX = "auth:blacklist:"


def get_jwt_secret():
    return getattr(settings, 'SECRET_KEY', 'default-insecure-railway-secret-key-343')


def generate_jti():
    return str(uuid.uuid4())


def issue_access_token(user):
    """
    Generate short-lived (15 min) JWT access token with role and department claims.
    """
    profile = getattr(user, 'profile', None)
    role = profile.role if profile else 'DEPT_ENGINEER'
    dept = profile.department_code if profile else 'ENG'
    division = profile.division_code if profile else 'DLI'
    emp_id = profile.employee_id if profile else f"EMP-{user.id}"

    now = datetime.datetime.now(datetime.timezone.utc)
    lifetime_minutes = getattr(settings, 'JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 15)
    exp = now + datetime.timedelta(minutes=lifetime_minutes)
    jti = generate_jti()

    payload = {
        'token_type': 'access',
        'jti': jti,
        'user_id': user.id,
        'username': user.username,
        'employee_id': emp_id,
        'role': role,
        'department_code': dept,
        'division_code': division,
        'iat': int(now.timestamp()),
        'exp': int(exp.timestamp()),
    }

    token = jwt.encode(payload, get_jwt_secret(), algorithm='HS256')
    return token, payload, exp


def issue_refresh_token(user, ip_address=None, user_agent=""):
    """
    Generate long-lived (7 days) refresh token and persist UserSession record.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    lifetime_days = getattr(settings, 'JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7)
    exp = now + datetime.timedelta(days=lifetime_days)
    jti = generate_jti()

    payload = {
        'token_type': 'refresh',
        'jti': jti,
        'user_id': user.id,
        'username': user.username,
        'iat': int(now.timestamp()),
        'exp': int(exp.timestamp()),
    }

    token = jwt.encode(payload, get_jwt_secret(), algorithm='HS256')

    # Persist session
    session = UserSession.objects.create(
        user=user,
        session_jti=jti,
        ip_address=ip_address,
        user_agent=user_agent[:255] if user_agent else "",
        expires_at=exp,
        is_revoked=False
    )

    return token, session


def decode_token(token, verify_exp=True):
    """
    Decode and verify JWT token. Returns payload dict or raises jwt.PyJWTError.
    """
    payload = jwt.decode(
        token,
        get_jwt_secret(),
        algorithms=['HS256'],
        options={'verify_exp': verify_exp}
    )
    return payload


def is_jti_blacklisted(jti):
    """
    Checks whether a given JTI has been revoked via Redis or UserSession.
    """
    # Check UserSession
    try:
        session = UserSession.objects.filter(session_jti=jti).first()
        if session and session.is_revoked:
            return True
    except Exception:
        pass

    # Check Redis cache layer if available
    try:
        import redis
        redis_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://redis:6379/0')
        r = redis.from_url(redis_url)
        key = f"{REDIS_BLACKLIST_PREFIX}{jti}"
        if r.exists(key):
            return True
    except Exception:
        pass

    return False


def blacklist_jti(jti, remaining_seconds=3600):
    """
    Blacklist a JTI in UserSession and Redis.
    """
    # Mark in DB
    UserSession.objects.filter(session_jti=jti).update(is_revoked=True)

    # Mark in Redis
    try:
        import redis
        redis_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://redis:6379/0')
        r = redis.from_url(redis_url)
        key = f"{REDIS_BLACKLIST_PREFIX}{jti}"
        r.setex(key, max(60, int(remaining_seconds)), "revoked")
    except Exception:
        pass
