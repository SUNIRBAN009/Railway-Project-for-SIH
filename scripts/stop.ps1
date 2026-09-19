# ============================================
# Railway AI Platform - PowerShell One-Command Shutdown
# ============================================

$ErrorActionPreference = "Stop"

# Refresh PATH from registry to pick up Docker Desktop
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
if (Test-Path "C:\Program Files\Docker\Docker\resources\bin") {
    $env:Path = "C:\Program Files\Docker\Docker\resources\bin;" + $env:Path
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   [Railway AI Block Planning Platform - Shutdown Engine]   " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker CLI
try {
    $null = docker --version
    Write-Host "[OK] Docker CLI detected." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker not found! Please ensure Docker Desktop is running." -ForegroundColor Red
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

Write-Host "Stopping all multi-container services..." -ForegroundColor Yellow
if ($composeCmd -eq "docker-compose") {
    docker-compose down
} else {
    docker compose down
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Shutdown encountered an issue with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "         ALL PLATFORM SERVICES STOPPED CLEANLY!             " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  To restart anytime, run:  .\scripts\start.ps1"
Write-Host "  Or double-click:          'Run Railway Project.bat'"
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
