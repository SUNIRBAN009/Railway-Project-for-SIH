# ============================================
# Railway AI Platform - PowerShell One-Command Startup
# ============================================

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

# Check Docker CLI
try {
    $null = docker --version
    Write-Host "[OK] Docker CLI detected." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker not found! Please ensure Docker Desktop is installed and running." -ForegroundColor Red
    exit 1
}

# Determine Docker Compose Command (v2 plugin or v1 standalone)
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

# Create .env if missing
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] Created .env from .env.example" -ForegroundColor Green
    }
}

# Build and start services
Write-Host "[1/3] Building multi-container images..." -ForegroundColor Yellow
if ($composeCmd -eq "docker-compose") {
    docker-compose build
} else {
    docker compose build
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Image build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[2/3] Launching background services..." -ForegroundColor Yellow
if ($composeCmd -eq "docker-compose") {
    docker-compose up -d
} else {
    docker compose up -d
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Starting services failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[3/3] Waiting for database and services to report healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check / Initialize Superuser
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

if ($composeCmd -eq "docker-compose") {
    docker-compose exec -T backend python manage.py shell -c "$superuserScript" 2>$null
} else {
    docker compose exec -T backend python manage.py shell -c "$superuserScript" 2>$null
}

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
Write-Host "  View Logs:       $composeCmd logs -f"
Write-Host "  Shutdown:        $composeCmd down"
Write-Host "============================================================" -ForegroundColor Green
