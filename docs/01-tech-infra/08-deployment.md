# 08-deployment.md

> **ফাইল ক্রম:** ১২/৪৫  
> **পূর্ববর্তী ফাইল:** [01-tech-infra/07-workers-consumers.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/01-tech-infra/07-workers-consumers.md) (Celery 4-Queue Worker Architecture, Daphne ASGI WebSockets, Celery Beat Scheduling)  
> **পরবর্তী ফাইল:** [01-tech-infra/09-testing-strategy.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/01-tech-infra/09-testing-strategy.md)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে ভারতীয় রেলওয়ের এন্টারপ্রাইজ স্ট্যান্ডার্ড অনুযায়ী মাল্টি-কন্টেইনার প্রোডাকশন ডিপ্লয়মেন্ট আর্কিটেকচার, ডকার কম্পোজ অর্কেস্ট্রেশন, অটোমেটেড স্টার্টআপ ইঞ্জিন স্ক্রিপ্টস (`start.ps1` ও `start.sh`), PostgreSQL 15 + PostGIS 3.3 ইনিশিয়ালাইজেশন, Nginx রিভার্স প্রক্সি কনফিগারেশন, এবং জিরো-ডাউনটাইম রোলআউট স্ট্র্যাটেজি নির্দিষ্ট করা হয়েছে।

---

## 1. Enterprise Deployment Architecture Overview

The Indian Railways AI Block Planning Platform (SIH PS26027) operates as an air-gapped or DMZ-isolated mission-critical infrastructure deployed across Divisional Control Offices (Sr.DOM/CPTM), Zonal Headquarters, and Central Railway Information Systems (CRIS) data centers.

The deployment infrastructure is organized as a multi-tier containerized runtime orchestrated via **Docker Compose** (for Divisional and staging environments) and **Kubernetes/Container Engine** (for Zonal CRIS production).

```
                                  RAILNET / CONTROL ROOM WAN (HTTPS :443 / WSS)
                                                        │
                                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  Nginx Reverse Proxy (:80 / :443)                                      │
│  • TLS 1.3 Termination (Strict Transport Security, Indian Railways Cert Authority)                    │
│  • Static Asset Caching & Compression (Gzip / Brotli)                                                  │
│  • Upstream Load Balancing & Reverse Proxy Routing:                                                    │
│    ├── `/`              ──► React 18 + Vite Frontend SPA (:3000 / Static HTML5)                       │
│    ├── `/api/v1/`       ──► Gunicorn WSGI Backend API Cluster (:8000)                                  │
│    ├── `/admin/`        ──► Django Admin Administrative Portal (:8000)                                 │
│    ├── `/ws/`           ──► Daphne ASGI Real-Time WebSocket Streaming (:8001)                          │
│    └── `/metrics`       ──► Prometheus Metrics Exporter (Whitelisted Internal Scraping :9090)          │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
             ┌──────────────────────────────────────┼──────────────────────────────────────┐
             ▼                                      ▼                                      ▼
┌─────────────────────────┐            ┌─────────────────────────┐            ┌─────────────────────────┐
│     React Frontend      │            │   Django Backend API    │            │   Daphne ASGI Server    │
│  • Vite Dev / Nginx Prod│            │   • Gunicorn 3 Workers  │            │   • Real-Time WebSockets│
│  • Container:           │            │   • Container:          │            │   • Container:          │
│    `railway_frontend`   │            │     `railway_backend`   │            │     `railway_channels`  │
│  • Port: 3000           │            │   • Port: 8000          │            │   • Port: 8001          │
└─────────────────────────┘            └────────────┬────────────┘            └────────────┬────────────┘
                                                    │                                      │
                                                    └──────────────────┬───────────────────┘
                                                                       │
             ┌─────────────────────────────────────────────────────────┴─────────────────────────────────────────┐
             │                                                                                                   │
             ▼                                                                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐         ┌─────────────────────────┐
│                           Celery Asynchronous Worker Cluster                            │         │     Celery Beat Hub     │
│  ┌──────────────────────┬──────────────────────┬──────────────────────┬───────────────┐ │         │  • Container:           │
│  │   `celery-high`      │   `celery-notify`    │  `celery-ontology`   │`celery-default│ │         │    `railway_celery_beat`│
│  │ • 4 Concurrency      │ • 4 Concurrency      │ • 2 Concurrency      │• 4 Concurrency│ │         │  • Periodic Cron Jobs   │
│  │ • Q: high (Safety)   │ • Q: notify (Push/SMS│ • Q: ontology (HermiT│• Q: default,  │ │         │    (NTES/Weather/Aging) │
│  │ • Container:         │ • Container:         │ • 4GB RAM Limit      │     low       │ │         └────────────┬────────────┘
│  │   `railway_celery_   │   `railway_celery_   │ • Container:         │• Container:   │ │                      │
│  │    high`             │    notify`           │   `railway_celery_   │  `celery_def` │ │                      │
│  └──────────────────────┴──────────────────────┴───────ontology`──────┴───────────────┘ │                      │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘                      │
                                            │                                                                    │
                                            └──────────────────────────┬─────────────────────────────────────────┘
                                                                       │
             ┌─────────────────────────────────────────────────────────┴─────────────────────────────────────────┐
             ▼                                                                                                   ▼
┌─────────────────────────────────────────────────────────┐                         ┌─────────────────────────────────────────┐
│       PostgreSQL 15 + PostGIS 3.3 Spatial RDBMS         │                         │             Redis 7 Broker              │
│  • Container: `railway_postgres` (Port: 5432)           │                         │  • Container: `railway_redis` (Port: 6379│
│  • Extensions: `postgis`, `postgis_topology`,           │                         │  • DB 0: Celery Broker & Results        │
│    `btree_gist`, `pg_trgm`, `uuid-ossp`                 │                         │  • DB 1: Django Channels Layer (Pub/Sub)│
│  • Spatial GiST Indexes for Track LineStrings & Points  │                         │  • DB 2: Ephemeral Cache & Token Locks  │
│  • Persistent Volume: `postgres_data`                   │                         │  • Persistent Volume: `redis_data` (AOF)│
└─────────────────────────────────────────────────────────┘                         └─────────────────────────────────────────┘
             │                                                                                                   │
             └─────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
                                    ┌─────────────────────────────────────┐
                                    │    Observability & Health Stack     │
                                    │  • Prometheus (:9090)               │
                                    │  • Grafana Dashboards (:3001)       │
                                    │  • Container Logs & Structlog JSON  │
                                    └─────────────────────────────────────┘
```

---

## 2. Docker Container Specifications

### 2.1 Backend Production Multi-Stage Dockerfile (`Dockerfile`)

The backend container image encapsulates Python 3.11 with native geospatial C-libraries (**GDAL**, **GEOS**, **PROJ**, and **libpq5**) required by PostGIS GeoDjango:

```dockerfile
# ==============================================================================
# Railway AI Platform - Backend Dockerfile
# Python 3.11 + PostgreSQL 15 (libpq) + PostGIS (GDAL/GEOS/PROJ)
# ==============================================================================

# Stage 1: Build dependencies and native binaries
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install native compilation dependencies for PostGIS, Owlready2 & PyCap
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    libmagic1 \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --default-timeout=120 --retries=5 --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Minimal runtime image
FROM python:3.11-slim-bookworm

WORKDIR /app

# Install runtime spatial libraries and PostgreSQL client
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    gdal-bin \
    libgdal32 \
    libmagic1 \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-compiled Python libraries from builder stage
COPY --from=builder /install /usr/local

# Copy application source code
COPY . .

# Create unprivileged system user and establish application directories
RUN groupadd -r railway && useradd -r -g railway -u 1001 railwayuser \
    && mkdir -p /app/staticfiles /app/media /app/logs /app/ontology \
    && chown -R railwayuser:railway /app

# Switch to unprivileged runtime execution
USER railwayuser

EXPOSE 8000 8001

# Container health probe checking Django core readiness endpoint
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/core/health/ || exit 1

# Default ASGI entrypoint for Daphne (overridden in compose for WSGI and Celery)
CMD ["python", "-m", "daphne", "-b", "0.0.0.0", "-p", "8000", "railway_sih.asgi:application"]
```

---

### 2.2 Frontend Multi-Stage Dockerfile (`frontend/Dockerfile`)

The React 18 TypeScript frontend utilizes a 4-stage build pipeline:
1. `base`: Alpine Node.js 20 environment.
2. `development`: Live hot-module replacement (HMR) for developer workstations.
3. `build`: Optimized production bundle generation with Vite.
4. `production`: Alpine Nginx micro-server serving static assets with zero Node.js runtime overhead.

```dockerfile
# ==============================================================================
# Railway AI Platform - Frontend Dockerfile
# React 18 + Vite + TypeScript (Multi-Stage Build)
# ==============================================================================

# Stage 1: Base image
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .

# Stage 2: Development target (Vite dev server with HMR)
FROM base AS development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 3: Production compilation
FROM base AS build
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_MAPBOX_TOKEN
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}
RUN npm run build

# Stage 4: High-performance Nginx production container
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

---

### 2.3 Spatial Database Initialization (`scripts/init_postgres.sh`)

Automatically executed on PostgreSQL first boot via `/docker-entrypoint-initdb.d/`:

```bash
#!/bin/bash
set -e

echo "[INIT] Initializing Indian Railways Database with PostGIS extensions..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable PostGIS core spatial engine
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS postgis_topology;
    
    -- Enable GiST/GIN acceleration extensions
    CREATE EXTENSION IF NOT EXISTS btree_gist;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    
    -- Enable UUID generator for audit events & safety tokens
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Verify spatial installation
    SELECT PostGIS_Full_Version();
EOSQL

echo "[INIT] PostGIS spatial extensions configured successfully."
```

---

### 2.4 Nginx Master Edge Proxy (`nginx/nginx.conf`)

Routes control room web traffic, negotiates WebSocket upgrade headers, and enforces caching policies:

```nginx
# ==============================================================================
# Indian Railways AI Platform - Nginx Edge Gateway
# ==============================================================================

upstream backend_wsgi {
    server backend:8000 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

upstream channels_asgi {
    server channels:8001 max_fails=3 fail_timeout=10s;
    keepalive 64;
}

server {
    listen 80;
    server_name localhost;
    client_max_body_size 50M;

    # Gzip Compression for low-bandwidth Railway WAN
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1024;

    # 1. Frontend SPA Delivery
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. Django REST Framework APIs
    location /api/ {
        proxy_pass http://backend_wsgi;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # 3. Administrative Control Console
    location /admin/ {
        proxy_pass http://backend_wsgi;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. Real-Time Daphne WebSocket Channel Layer
    location /ws/ {
        proxy_pass http://channels_asgi;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 5. Django Static Assets
    location /static/ {
        alias /var/www/static/;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # 6. Safety Verification Photo Uploads (Feature #82)
    location /media/ {
        alias /var/www/media/;
        expires 30d;
    }
}
```

---

## 3. Production Docker Compose Orchestration (`docker-compose.yml`)

The production compose topology defines 12 interconnected containers with dedicated health checks, network isolation, and volume mounts:

```yaml
# ==============================================================================
# Indian Railways AI Platform - Master Docker Compose
# ==============================================================================
version: '3.8'

services:
  # 1. Spatial Database (PostgreSQL 15 + PostGIS 3.3)
  postgres:
    image: postgis/postgis:15-3.3
    container_name: railway_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-railway_sih}
      POSTGRES_USER: ${DB_USER:-railway_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-railway_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init_postgres.sh:/docker-entrypoint-initdb.d/init_postgres.sh:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-railway_user} -d ${DB_NAME:-railway_sih}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - railway_network

  # 2. In-Memory Broker & Cache (Redis 7)
  redis:
    image: redis:7-alpine
    container_name: railway_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis_secure_pass}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis_secure_pass}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - railway_network

  # 3. WSGI REST API Server (Gunicorn)
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: railway_backend
    restart: unless-stopped
    command: >
      sh -c "python manage.py migrate --noinput &&
             python manage.py collectstatic --noinput &&
             gunicorn railway_sih.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120"
    volumes:
      - .:/app
      - backend_static:/app/staticfiles
      - backend_media:/app/media
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - DB_HOST=postgres
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_secure_pass}@redis:6379/0
      - DATABASE_URL=postgresql://${DB_USER:-railway_user}:${DB_PASSWORD:-railway_password}@postgres:5432/${DB_NAME:-railway_sih}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - railway_network

  # 4. ASGI Real-Time WebSocket Server (Daphne)
  channels:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: railway_channels
    restart: unless-stopped
    command: python -m daphne -b 0.0.0.0 -p 8001 railway_sih.asgi:application
    volumes:
      - .:/app
    ports:
      - "8001:8001"
    env_file:
      - .env
    environment:
      - DB_HOST=postgres
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_secure_pass}@redis:6379/0
      - DATABASE_URL=postgresql://${DB_USER:-railway_user}:${DB_PASSWORD:-railway_password}@postgres:5432/${DB_NAME:-railway_sih}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - railway_network

  # 5. Celery Worker - High Priority (Conflict Engine & Interlocking Safety)
  celery-high:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: railway_celery_high
    restart: unless-stopped
    command: celery -A railway_sih worker -Q high -c 4 -l info -n worker_high@%h
    volumes:
      - .:/app
    env_file:
      - .env
    environment:
      - DB_HOST=postgres
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_secure_pass}@redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - railway_network

  # 6. Celery Worker - Notifications (SMS Alerts, Push Notifications, WS Dispatch)
  celery-notify:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: railway_celery_notify
    restart: unless-stopped
    command: celery -A railway_sih worker -Q notify -c 4 -l info -n worker_notify@%h
    volumes:
      - .:/app
    env_file:
      - .env
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - railway_network

  # 7. Celery Worker - Ontology (HermiT Reasoner & Symbolic AI Proofs)
  celery-ontology:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: railway_celery_ontology
    restart: unless-stopped
    command: celery -A railway_sih worker -Q ontology -c 2 -l info -n worker_ontology@%h
    volumes:
      - .:/app
    env_file:
      - .env
    deploy:
      resources:
        limits:
          memory: 4G
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - railway_network

  # 8. Celery Worker - Default & Low Priority (KPI Aggregation & Sync)
  celery-default:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: railway_celery_default
    restart: unless-stopped
    command: celery -A railway_sih worker -Q default,low -c 4 -l info -n worker_default@%h
    volumes:
      - .:/app
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - railway_network

  # 9. Celery Beat (Periodic Dispatch Scheduler)
  celery-beat:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: railway_celery_beat
    restart: unless-stopped
    command: celery -A railway_sih beat -l info
    volumes:
      - .:/app
    env_file:
      - .env
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - railway_network

  # 10. React Frontend (Vite SPA)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development
    container_name: railway_frontend
    restart: unless-stopped
    command: npm run dev -- --host 0.0.0.0
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000/api/v1
      - VITE_WS_URL=ws://localhost:8001
      - VITE_MAPBOX_TOKEN=${MAPBOX_ACCESS_TOKEN:-}
      - CHOKIDAR_USEPOLLING=true
    depends_on:
      - backend
      - channels
    networks:
      - railway_network

  # 11. Prometheus TSDB Metrics Collector
  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: railway_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - railway_network
    depends_on:
      - backend

  # 12. Grafana Visualization Dashboards
  grafana:
    image: grafana/grafana:10.2.2
    container_name: railway_grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./docker/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./docker/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana_data:/var/lib/grafana
    networks:
      - railway_network
    depends_on:
      - prometheus

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backend_static:
    driver: local
  backend_media:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  railway_network:
    driver: bridge
```

---

## 4. One-Command Automation & Startup Engines

The project provides unified one-command startup engines for Windows PowerShell (`start.ps1`) and Unix Bash (`start.sh`) that handle environment preparation, container lifecycle, PostGIS schema migrations, superuser bootstrapping, and scenario data seeding.

### 4.1 Windows PowerShell Startup Engine (`scripts/start.ps1`)

```powershell
# ==============================================================================
# Railway AI Platform - PowerShell One-Command Startup Engine
# ==============================================================================
$ErrorActionPreference = "Stop"

# Refresh PATH from registry to pick up newly installed Docker Desktop
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
if (Test-Path "C:\Program Files\Docker\Docker\resources\bin") {
    $env:Path = "C:\Program Files\Docker\Docker\resources\bin;" + $env:Path
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   [Railway AI Block Planning Platform - Startup Engine]    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify Docker Availability
try {
    $null = docker --version
    Write-Host "[OK] Docker CLI detected." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker not found! Please ensure Docker Desktop is installed and running." -ForegroundColor Red
    exit 1
}

# 2. Select Compose Binary
$composeCmd = "docker-compose"
try {
    $null = docker-compose --version 2>$null
} catch {
    try {
        $null = docker compose version 2>$null
        $composeCmd = "docker compose"
    } catch {
        Write-Host "[ERROR] Neither 'docker-compose' nor 'docker compose' was found." -ForegroundColor Red
        exit 1
    }
}

# 3. Bootstrap Environment Configuration
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] Created .env from .env.example" -ForegroundColor Green
    }
}

# 4. Build Container Images
Write-Host "[1/3] Building multi-container images..." -ForegroundColor Yellow
Invoke-Expression "$composeCmd build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Image build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 5. Launch Background Services
Write-Host "[2/3] Launching background services..." -ForegroundColor Yellow
Invoke-Expression "$composeCmd up -d"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Starting services failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 6. Wait for Database & Redis Health Checks
Write-Host "[3/3] Waiting for database and services to report healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 7. Idempotent Admin Superuser Verification
Write-Host "Verifying administrative account..." -ForegroundColor Cyan
$superuserScript = @"
from django.contrib.auth import get_user_model
from apps.accounts.models import UserProfile, UserRole, DepartmentCode
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    user = User.objects.create_superuser(
        username='admin',
        email='admin@railway.ai',
        password='admin123'
    )
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = UserRole.ADMIN
    profile.department_code = DepartmentCode.OPERATIONS
    profile.save()
    print('[OK] Superuser initialized: admin / admin123')
else:
    print('[OK] Superuser exists')
"@

Invoke-Expression "$composeCmd exec -T backend python manage.py shell -c `"$superuserScript`"" 2>$null

# 8. Seed SIH Problem Statement Demo Scenario (Feature #118 & #120)
Write-Host "Verifying master dataset seeding (Scenario A: Howrah-Bardhaman Chord)..." -ForegroundColor Cyan
Invoke-Expression "$composeCmd exec -T backend python manage.py seed_master_data --scenario A --seed 26027" 2>$null

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "         SYSTEM SERVICES RUNNING SUCCESSFULLY!              " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Frontend SPA:    http://localhost:3000"
Write-Host "  Backend API:     http://localhost:8000"
Write-Host "  Swagger Docs:    http://localhost:8000/api/docs/"
Write-Host "  Admin Console:   http://localhost:8000/admin/ (admin / admin123)"
Write-Host "  WebSocket ASGI:  ws://localhost:8001/ws/"
Write-Host "  Grafana Monitor: http://localhost:3001/"
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  View Logs:       $composeCmd logs -f"
Write-Host "  Shutdown:        $composeCmd down"
Write-Host "============================================================" -ForegroundColor Green
```

---

### 4.2 Automated Master Startup Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Operator / Developer
    participant Script as start.ps1 / start.sh
    participant Docker as Docker Engine
    participant PG as PostgreSQL (PostGIS)
    participant Redis as Redis 7
    participant Backend as Django WSGI (:8000)
    participant Celery as Celery Workers (4 Queues)
    participant Channels as Daphne ASGI (:8001)
    participant Frontend as React Frontend (:3000)

    Admin->>Script: Run start.ps1 / start.sh
    Script->>Docker: docker compose build & up -d
    Docker->>PG: Launch container (run init_postgres.sh)
    Docker->>Redis: Launch container (appendonly mode)
    Note over PG: PostGIS 3.3, pg_trgm, btree_gist initialized
    
    Script->>Docker: Poll health status (pg_isready, redis ping)
    Docker-->>Script: Status HEALTHY (15s wait)

    Script->>Backend: Execute manage.py migrate --noinput
    Backend->>PG: Apply 10 apps migrations (GIS tables)
    Script->>Backend: Execute manage.py collectstatic --noinput
    Script->>Backend: Seed Admin Superuser (admin / admin123)
    Script->>Backend: Execute seed_master_data --scenario A --seed 26027

    Docker->>Channels: Start Daphne on 0.0.0.0:8001
    Docker->>Celery: Spawn 4 workers (high, notify, ontology, default)
    Docker->>Frontend: Start Vite Dev Server on 0.0.0.0:3000
    Script-->>Admin: Display Active System Endpoints URLs
```

---

## 5. Enterprise Environment Promotion Strategy

Indian Railways software deployment follows a strict three-tier lifecycle:

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│     Local Development     │ ──►  │    Divisional Staging     │ ──►  │    Zonal / CRIS Prod      │
│  • Single Developer PC    │      │  • Division Test Server   │      │  • Redundant High-Avail   │
│  • Docker Compose         │      │  • DRM Office Network     │      │  • Railnet Secure Zone    │
│  • Mock Feed Adapters     │      │  • Shadow NTES / COA Feed │      │  • Live TMS / COA Feeds   │
│  • SQLite/Local PostGIS   │      │  • Multi-User Validation  │      │  • Active-Passive Standby │
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

### 5.1 Environment Configuration Matrix

| Environment Variable | Local Development | Divisional Staging | Zonal CRIS Production |
|---|---|---|---|
| `DEBUG` | `True` | `False` | `False` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | `staging.railnet.gov.in,10.x.x.x` | `railblock.cris.railnet.gov.in` |
| `DJANGO_SETTINGS_MODULE`| `railway_sih.settings.dev` | `railway_sih.settings.staging` | `railway_sih.settings.prod` |
| `DATABASE_URL` | `postgresql://railway_user:...@postgres:5432/railway_sih` | `postgresql://...:5432/railway_staging` | PgBouncer Cluster Endpoint |
| `REDIS_URL` | `redis://:pass@redis:6379/0` | `redis://:pass@redis-staging:6379/0` | Redis Sentinel / Cluster HA |
| `ONTOLOGY_REASONER_TIMEOUT`| `30` (seconds) | `60` (seconds) | `120` (seconds) |
| `SOURCE_ADAPTER_MODE` | `MOCK` (Feature #121) | `HYBRID_SHADOW` | `LIVE_REAL` (TMS/COA/NTES) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | `https://staging.railnet.gov.in` | `https://railblock.cris.railnet.gov.in` |
| `SECURE_SSL_REDIRECT` | `False` | `True` | `True` |
| `SESSION_COOKIE_SECURE` | `False` | `True` | `True` |
| `LOG_LEVEL` | `DEBUG` | `INFO` | `INFO` (Structlog JSON) |

---

## 6. Zero-Downtime Rolling Update & Disaster Recovery

### 6.1 Rolling Deployment Workflow

Because train traffic operates 24/7/365, block planning software cannot experience downtime:

1. **Pre-Deployment Database Migration Check**:
   - Backward-compatible schema migrations only (`ADD COLUMN NULL`, never remove columns synchronously).
   - Zero locks on spatial indexes (`CREATE INDEX CONCURRENTLY`).
2. **Blue-Green Container Transition**:
   - Deploy new Backend & Daphne containers alongside existing running containers.
   - Run automated readiness check on `/api/v1/core/health/readiness`.
   - Update Nginx upstream targets to point to new container ports.
   - Send `SIGQUIT` (warm shutdown) to old Gunicorn workers allowing in-flight requests to finalize.
3. **Celery Worker Drain**:
   - Celery workers receive `SIGTERM` triggering `warm_shutdown`.
   - Workers finish processing active block optimizations before terminating.
   - New workers immediately begin consuming pending queue messages from Redis.

### 6.2 Backup & Disaster Recovery (DR) Protocol

To guarantee **RPO (Recovery Point Objective) ≤ 15 Minutes** and **RTO (Recovery Time Objective) ≤ 30 Minutes**:

```bash
# ==============================================================================
# Automated Daily Cold Backup & PostGIS Dump
# ==============================================================================
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/railway_ai"

# Execute PostGIS binary custom-format dump
docker exec railway_postgres pg_dump \
    -U railway_user \
    -d railway_sih \
    -F c \
    -b \
    -v \
    -f "/var/lib/postgresql/data/railway_backup_${TIMESTAMP}.dump"

# Move to secure off-site NAS volume
mv "/var/lib/postgresql/data/railway_backup_${TIMESTAMP}.dump" "${BACKUP_DIR}/"

# Keep last 14 days of backups
find "${BACKUP_DIR}" -name "railway_backup_*.dump" -mtime +14 -delete
```

For continuous recovery:
- **Continuous WAL Archiving**: PostgreSQL WAL (Write-Ahead Logging) is shipped to a secondary standby server using `pgBackRest` or `WAL-G`.
- **Point-in-Time Recovery (PITR)**: Enables rolling back database state to the exact second prior to any accidental operator error.

---

## 7. Next File Dependency Bridge

> **পরবর্তী ফাইল:** [01-tech-infra/09-testing-strategy.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/01-tech-infra/09-testing-strategy.md)

`08-deployment.md` থেকে `09-testing-strategy.md`-এ হ্যান্ডঅফ করা উপাদানসমূহ:

| Deployment Artifact | Testing Requirement Handled in File 09 |
|---|---|
| **PostGIS Container (`railway_postgres`)** | Spatial database fixtures, rollback testing (`GeoDjango TestCase`), ST_Intersects verification |
| **Redis Channels Layer (`railway_redis`)** | Daphne WebSocket connection tests & event broadcast assertions |
| **Celery Worker Clusters (4 Queues)** | Eager task execution mode (`CELERY_TASK_ALWAYS_EAGER=True`) and queue delay benchmarks |
| **Ontology Worker (`celery-ontology`)** | HermiT Reasoner memory ceiling tests (verifying non-OOM under 4GB cap) |
| **Startup Engine (`start.ps1` / `start.sh`)** | Automated smoke testing and end-to-end container health verification |
| **GitHub Actions Pipeline** | Multi-container CI matrix running automated pytest, ESLint, and Playwright suites |
