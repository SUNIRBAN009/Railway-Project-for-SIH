@echo off
REM ============================================
REM Railway AI Platform - Windows Batch Startup
REM ============================================

echo ============================================================
echo    Railway AI Block Planning Platform - Startup Engine
echo ============================================================

where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker not found! Please start Docker Desktop first.
    pause
    exit /b 1
)

if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] Initialized .env from template.
    )
)

echo [1/3] Building container images...
docker-compose build

echo [2/3] Starting multi-service stack in background...
docker-compose up -d

echo [3/3] Waiting for containers to become ready...
timeout /t 12 /nobreak >nul

echo ============================================================
echo         ALL SERVICES RUNNING SUCCESSFULLY!
echo ============================================================
echo   Frontend:    http://localhost:3000
echo   Backend API: http://localhost:8000
echo   Admin Panel: http://localhost:8000/admin/
echo   WebSocket:   ws://localhost:8001/ws/
echo   Grafana:     http://localhost:3001/
echo ============================================================
echo   View logs:   docker-compose logs -f
echo   Stop all:    docker-compose down
echo ============================================================
pause
