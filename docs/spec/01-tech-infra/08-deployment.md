# 08-deployment.md

> **File Order:** 12/45  
> **Previous File:** `01-tech-infra/07-workers-consumers.md` (Background Workers)  
> **Next File:** `01-tech-infra/09-testing-strategy.md`  
> **Connection:** This file defines how the monolith, databases, and workers described in the previous files are packaged and deployed for the hackathon MVP.

---

## 1. Deployment Environments

| Environment | Purpose | Infrastructure | URL |
|-------------|---------|----------------|-----|
| **Local / Dev** | Developer testing | Docker Desktop (Compose) | `http://localhost:5173` |
| **Staging** | CI/CD test branch | Railway (Free Tier) | `https://staging-rly-ai.up.railway.app` |
| **Production** | Hackathon Demo | Railway (Free Tier) | `https://rly-ai-block-demo.up.railway.app` |

---

## 2. Docker Compose (Local Development)

We use `docker-compose.yml` to spin up the entire ecosystem with a single command.

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: railway_user
      POSTGRES_PASSWORD: railway_password
      POSTGRES_DB: railway_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
      - ./ontology:/app/ontology
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    depends_on:
      - db
      - redis

  celery_worker:
    build: 
      context: ./backend
    command: celery -A railway_ai worker -l INFO
    volumes:
      - ./backend:/app
      - ./ontology:/app/ontology
    env_file:
      - ./backend/.env
    depends_on:
      - redis
      - db

  frontend:
    build: 
      context: ./frontend
    command: npm run dev -- --host
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

---

## 3. Production Deployment (Railway)

For the hackathon, we deploy to Railway (or Render) because it provides zero-configuration CI/CD directly from GitHub.

### 3.1 Backend Deployment (Django + Daphne)

**Dockerfile (Backend):**
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run migrations and collect static files
RUN python manage.py collectstatic --noinput

# Start Daphne (ASGI) to handle BOTH HTTP and WebSockets
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "railway_ai.asgi:application"]
```
*Note: In the MVP, we use Daphne to serve both HTTP and WebSockets on the same port to save on container costs.*

**Railway Service Setup:**
1. Connect GitHub Repository.
2. Add a `PostgreSQL` Database plugin.
3. Add a `Redis` plugin.
4. Deploy `backend` folder as a service. Set Start Command to the Dockerfile CMD.
5. Deploy `celery_worker` as a background worker service using the same repo, but set custom start command: `celery -A railway_ai worker -l INFO`.

### 3.2 Frontend Deployment (Vite)

**Dockerfile (Frontend):**
```dockerfile
# frontend/Dockerfile
# Build Stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Configuration:**
Routes all traffic to `index.html` to allow React Router to handle client-side routing.
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 4. CI/CD Pipeline (GitHub Actions)

We automate testing and linting before every merge to `main`. Actual deployment is handled automatically by Railway when `main` is updated.

### 4.1 `.github/workflows/main.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    - name: Set up Python 3.11
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: |
        cd backend
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    - name: Run Tests
      env:
        DATABASE_URL: postgres://postgres:testpassword@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379/0
        SECRET_KEY: test-secret-key
      run: |
        cd backend
        pytest

  test-frontend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js 18
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    - name: Build check
      run: |
        cd frontend
        npm run build
```

---

## 5. Environment Variables Map

In the Railway Dashboard, the following variables must be configured:

**Backend Service:**
- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- `REDIS_URL` = `${{Redis.REDIS_URL}}`
- `SECRET_KEY` = `[Generated Secret]`
- `ALLOWED_HOSTS` = `rly-ai-block-demo.up.railway.app`
- `CORS_ALLOWED_ORIGINS` = `https://rly-ai-block-demo-ui.up.railway.app`
- `GEMINI_API_KEY` = `[Your Google API Key]`
- `TWILIO_ACCOUNT_SID` = `[Your Twilio SID]`
- `TWILIO_AUTH_TOKEN` = `[Your Twilio Token]`

**Frontend Service:**
- `VITE_API_BASE_URL` = `https://rly-ai-block-demo.up.railway.app/api/v1`
- `VITE_WS_BASE_URL` = `wss://rly-ai-block-demo.up.railway.app`
- `VITE_MAPBOX_TOKEN` = `[Your Mapbox Public Token]`
