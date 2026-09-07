"""
Django settings for railway_sih project.
Indian Railways AI Block Planning Platform (PS 26027).
Authoritative Architecture: docs/01-tech-infra/
"""
from decouple import config
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="django-insecure-8&bf^qs-@yhr43^&gah=lj343!nhxh3t91i3p$#cdcmxv^ha*2")

DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = ["*"]

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "channels",
    # Platform Bounded Context Services (PS 26027)
    "apps.core",
    "apps.accounts",
    "apps.blocks",
    "apps.departments",
    "apps.trains",
    "apps.ontology",
    "apps.assets",
    "apps.analytics",
    "apps.notifications",
    "apps.api",
]

# Conditionally load GIS app if PostGIS & GDAL are active
USE_POSTGIS = config("USE_POSTGIS", default=False, cast=bool) or (os.environ.get("DATABASE_URL") is not None)
if USE_POSTGIS:
    try:
        from django.contrib.gis.gdal import HAS_GDAL
        if HAS_GDAL:
            INSTALLED_APPS.append("django.contrib.gis")
    except Exception:
        pass

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "railway_sih.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ASGI_APPLICATION = "railway_sih.asgi.application"
WSGI_APPLICATION = "railway_sih.wsgi.application"

# Database Configuration (PostgreSQL 15 + PostGIS 3.3 in Docker; fallback for local dev)
USE_POSTGIS = config("USE_POSTGIS", default=False, cast=bool) or (os.environ.get("DATABASE_URL") is not None)

if USE_POSTGIS:
    DATABASES = {
        "default": {
            "ENGINE": "django.contrib.gis.db.backends.postgis",
            "NAME": config("POSTGRES_DB", default="railway_sih"),
            "USER": config("POSTGRES_USER", default="railway_user"),
            "PASSWORD": config("POSTGRES_PASSWORD", default="railway_password"),
            "HOST": config("POSTGRES_HOST", default="db"),
            "PORT": config("POSTGRES_PORT", default="5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Password Hashing with Argon2id (OWASP Standard - TSK-P1-002)
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGIN_URL = "/accounts/login/"
LOGIN_REDIRECT_URL = "/dashboard/"
LOGOUT_REDIRECT_URL = "/"

# Django REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

CORS_ALLOW_ALL_ORIGINS = True

# Redis Channel Layer for Django Channels + Daphne (TSK-P0-007)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [config("REDIS_URL", default="redis://redis:6379/0")],
        },
    }
}

# Celery 5.3 Task Broker & Multi-tier Queues (TSK-P0-006)
CELERY_BROKER_URL = config("REDIS_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND = config("REDIS_URL", default="redis://redis:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Kolkata"
CELERY_TASK_QUEUES = {
    "high": {"exchange": "high", "routing_key": "high"},
    "notify": {"exchange": "notify", "routing_key": "notify"},
    "ontology": {"exchange": "ontology", "routing_key": "ontology"},
    "low": {"exchange": "low", "routing_key": "low"},
    "default": {"exchange": "default", "routing_key": "default"},
}
CELERY_TASK_DEFAULT_QUEUE = "default"

# Celery Beat Periodic Tasks Schedule (TSK-P4-003)
CELERY_BEAT_SCHEDULE = {
    "nightly-corridor-kpi-rollup": {
        "task": "apps.analytics.tasks.rollup_corridor_daily_kpis_task",
        "schedule": 86400.0,  # Runs daily
    },
    "purge-stale-notifications": {
        "task": "apps.notifications.tasks.purge_old_notifications_task",
        "schedule": 86400.0 * 7,  # Runs weekly
    },
}

# JWT Token Configuration (SVC-AUTH)
JWT_ACCESS_TOKEN_LIFETIME_MINUTES = 15
JWT_REFRESH_TOKEN_LIFETIME_DAYS = 7

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
