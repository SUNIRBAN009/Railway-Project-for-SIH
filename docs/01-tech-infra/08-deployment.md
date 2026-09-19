# 08-deployment.md

> **ফাইল ক্রম:** ১২/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/07-workers-consumers.md` (Celery worker queues, Daphne ASGI WebSocket, Celery Beat scheduler)  
> **পরবর্তী ফাইল:** `01-tech-infra/09-testing-strategy.md`  
> **সংযোগ:** এই ফাইলে সংজ্ঞায়িত কন্টেইনার আর্কিটেকচার, Nginx রিভার্স প্রক্সি, ডাটাবেজ সার্ভিস (MySQL 8.0), এবং CI/CD টেস্ট গেটওয়ে `09-testing-strategy.md`-এর টেস্ট এনভায়রনমেন্ট প্রোভিশনিং এবং স্বয়ংক্রিয় পাইপলাইন ভ্যালিডেশনে ব্যবহৃত হবে।

---

## 1. Deployment Architecture Overview

The application utilizes a containerized micro-runtime architecture orchestrated via Docker Compose for local development and staging, with automated CI/CD deployment to Railway / Render cloud containers.

```
                                  INTERNET (HTTPS / WSS)
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               Nginx Reverse Proxy (:80 / :443)                           │
│  • Terminates SSL / TLS 1.3                                                             │
│  • Serves React Vite static frontend bundle (`/`)                                       │
│  • Proxies REST API & Admin (`/api/`, `/admin/`) ──► Gunicorn WSGI (:8000)              │
│  • Proxies WebSocket traffic (`/ws/`) with Upgrade ──► Daphne ASGI (:8001)              │
└───────────────────────────┬─────────────────────────────────┬───────────────────────────┘
                            │                                 │
             ┌──────────────┴──────────────┐   ┌──────────────┴──────────────┐
             ▼                             ▼   ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   Django Backend API    │   │  Django Channels (WS)   │   │     Celery Workers      │
│     Gunicorn WSGI       │   │       Daphne ASGI       │   │  • high  • notify       │
│      Port: 8000         │   │       Port: 8001        │   │  • ontology • default   │
└────────────┬────────────┘   └────────────┬────────────┘   └────────────┬────────────┘
             │                             │                             │
             └─────────────────────────────┼─────────────────────────────┘
                                           │
                      ┌────────────────────┴────────────────────┐
                      ▼                                         ▼
         ┌─────────────────────────┐               ┌─────────────────────────┐
         │     MySQL 8.0 Engine    │               │      Redis 7 Broker     │
         │   • Port: 3306          │               │   • Port: 6379          │
         │   • InnoDB Tablespaces  │               │   • Cache, PubSub, Queues│
         │   • Persistent Volume   │               │   • Persistent Volume   │
         └─────────────────────────┘               └─────────────────────────┘
```

---

## 2. Dockerfiles

### 2.1 Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
# Multi-stage production build for Django Backend
FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final runtime image
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY . .

# Create unprivileged runtime user
RUN useradd -m -u 1000 railwayuser && chown -R railwayuser:railwayuser /app
USER railwayuser

EXPOSE 8000 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/ || exit 1

CMD ["gunicorn", "railway_ai.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]
```

### 2.2 Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
# Stage 1: Build React 18 + Vite App
FROM node:20-alpine as build-stage

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 3. Docker Compose Configuration (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: railway_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_secret_password
      MYSQL_DATABASE: railway_ai_db
      MYSQL_USER: railway_user
      MYSQL_PASSWORD: railway_password
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --innodb-buffer-pool-size=256M
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: railway_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass redis_password
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_password", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  backend-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: railway_backend_api
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - ./backend/.env
    command: gunicorn railway_ai.wsgi:application --bind 0.0.0.0:8000 --workers 3
    volumes:
      - ./backend/media:/app/media
      - ./backend/ontology:/app/ontology
    ports:
      - "8000:8000"

  backend-ws:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: railway_backend_ws
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - ./backend/.env
    command: daphne -b 0.0.0.0 -p 8001 railway_ai.asgi:application
    ports:
      - "8001:8001"

  celery-worker-high:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: railway_celery_high
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - ./backend/.env
    command: celery -A railway_ai worker -Q high -c 4 --loglevel=INFO

  celery-worker-notify:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: railway_celery_notify
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy
    env_file:
      - ./backend/.env
    command: celery -A railway_ai worker -Q notify -c 4 --loglevel=INFO

  celery-worker-default:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: railway_celery_default
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - ./backend/.env
    command: celery -A railway_ai worker -Q default,low,ontology -c 3 --loglevel=INFO

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: railway_celery_beat
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy
    env_file:
      - ./backend/.env
    command: celery -A railway_ai beat --loglevel=INFO

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: railway_frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend-api
      - backend-ws

volumes:
  mysql_data:
  redis_data:
```

---

## 4. Nginx Reverse Proxy Configuration (`nginx.conf`)

```nginx
upstream gunicorn_backend {
    server backend-api:8000;
}

upstream daphne_ws {
    server backend-ws:8001;
}

server {
    listen 80;
    server_name localhost;
    client_max_body_size 10M;

    # 1. Frontend Static Assets
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # 2. Django REST API & Admin
    location ~ ^/(api|admin)/ {
        proxy_pass http://gunicorn_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }

    # 3. Daphne WebSocket Channel Layer
    location /ws/ {
        proxy_pass http://daphne_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 4. Media Files Uploaded
    location /media/ {
        alias /app/media/;
    }
}
```

---

## 5. CI/CD Pipeline (`.github/workflows/deploy.yml`)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Lint & Pytest Suite
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root_pass
          MYSQL_DATABASE: test_railway_ai_db
          MYSQL_USER: test_user
          MYSQL_PASSWORD: test_pass
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install Dependencies
        run: |
          sudo apt-get update && sudo apt-get install -y default-libmysqlclient-dev pkg-config libmagic1
          pip install -r backend/requirements.txt
          pip install pytest pytest-django flake8

      - name: Run Linter
        run: |
          flake8 backend/ --max-line-length=120 --exclude=migrations

      - name: Run Pytest Suite
        env:
          DB_ENGINE: django.db.backends.mysql
          DB_NAME: test_railway_ai_db
          DB_USER: test_user
          DB_PASSWORD: test_pass
          DB_HOST: 127.0.0.1
          DB_PORT: 3306
          REDIS_URL: redis://127.0.0.1:6379/0
          SECRET_KEY: test_secret_ci_key
        run: |
          pytest backend/ -v --tb=short

  build-and-deploy:
    name: Build Containers & Deploy
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Deploy to Railway
        uses: bervProject/railway-deploy@0.2.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: "railway-ai-backend"
```

---

## 6. Environment Strategy

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `DEBUG` | `True` | `False` | `False` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | `staging.railway-ai.internal` | `railway-ai.gov.in` |
| `DB_NAME` | `railway_ai_db` | `staging_railway_db` | `prod_railway_db` |
| `DB_USER` | `railway_user` | `railway_user` | `prod_rail_admin` |
| `DB_HOST` | `127.0.0.1` / `mysql` | Managed Cloud MySQL | AWS RDS / Managed MySQL 8.0 |
| `REDIS_HOST` | `127.0.0.1` / `redis` | Cloud Redis Instance | Managed Redis 7 Cluster |
| `CORS_ALLOWED_ORIGINS`| `http://localhost:5173` | `https://staging.railway-ai.internal` | `https://railway-ai.gov.in` |
| `SECURE_SSL_REDIRECT` | `False` | `True` | `True` |

---

## 7. Next File Dependency Note

> পরবর্তী ফাইল: `01-tech-infra/09-testing-strategy.md`

`08-deployment.md` থেকে `09-testing-strategy.md`-এ নেওয়া হবে:

| Deployment Component | Testing Requirement |
|----------------------|---------------------|
| MySQL Service Container | Database fixtures and transaction rollback testing (`TestCase`) |
| Redis Channel Layer | WebSocket connection & event broadcast integration testing |
| Celery Workers | Eager task execution mode (`CELERY_TASK_ALWAYS_EAGER=True`) in unit tests |
| Nginx Reverse Proxy | End-to-end integration and smoke testing of routing rules |
| GitHub Actions CI | Automated test execution matrix on pull request & push |

`09-testing-strategy.md`-এ নিচের বিষয়গুলো থাকবে:
- Test pyramid ratios (60% Unit, 30% Integration, 10% E2E)
- Testing frameworks per layer (pytest, pytest-django, Vitest, Playwright)
- Code coverage targets (>85% core, 100% on conflict engine & auth)
- Automated data seeding & test fixtures for Indian Railways network
