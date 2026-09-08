# ============================================
# Railway AI Platform - Backend Dockerfile
# Python 3.11 + PostgreSQL + PostGIS + GDAL
# ============================================

# Stage 1: Build dependencies
FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    libmagic1 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Final runtime image
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    gdal-bin \
    libgdal32 \
    libmagic1 \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application source code
COPY . .

# Create static, media, and log directories with correct permissions
RUN mkdir -p /app/staticfiles /app/media /app/logs \
    && chmod -R 755 /app

# Expose HTTP / Daphne ASGI ports
EXPOSE 8000 8001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/ || exit 1

# Default command launches Daphne ASGI (HTTP + WebSocket)
CMD ["python", "-m", "daphne", "-b", "0.0.0.0", "-p", "8000", "railway_sih.asgi:application"]
