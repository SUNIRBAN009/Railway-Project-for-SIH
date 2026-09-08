# ============================================
# Railway AI Platform - PowerShell One-Command Startup
# ============================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   [Railway AI Block Planning Platform - Startup Engine]    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
try {
    $null = docker --version
    Write-Host "[OK] Docker CLI detected." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker not found! Please launch Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Create .env if missing
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] Created .env from .env.example" -ForegroundColor Green
    }
}

# Build and start services
Write-Host "[1/3] Building multi-container images..." -ForegroundColor Yellow
docker-compose build

Write-Host "[2/3] Launching background services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "[3/3] Waiting for database and services to report healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

# Check Superuser
Write-Host "Verifying administrative account..." -ForegroundColor Cyan
docker-compose exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    user = User.objects.create_superuser(
        username='admin',
        email='admin@railway.ai',
        password='admin123',
        department='COA'
    )
    print('[OK] Superuser initialized: admin / admin123')
else:
    print('[OK] Superuser exists')
" 2>$null

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "         SYSTEM SERVICES RUNNING SUCCESSFULLY!             " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Frontend SPA:    http://localhost:3000"
Write-Host "  Backend API:     http://localhost:8000"
Write-Host "  Swagger Docs:    http://localhost:8000/api/docs/"
Write-Host "  Admin Console:   http://localhost:8000/admin/ (admin / admin123)"
Write-Host "  WebSocket ASGI:  ws://localhost:8001/ws/"
Write-Host "  Grafana Monitor: http://localhost:3001/"
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  View Logs:       docker-compose logs -f"
Write-Host "  Shutdown:        docker-compose down"
Write-Host "============================================================" -ForegroundColor Green
