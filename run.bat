@echo off
cd /d "%~dp0"
title Railway AI Platform Launcher
echo ============================================================
echo    Launching Railway AI Block Planning Platform
echo ============================================================

REM 1. Start Django Backend (0.0.0.0:8000 - Debug Mode)
start "Railway AI - Backend (Django)" cmd /k ".\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000"

REM 2. Start Daphne ASGI WebSocket Server (0.0.0.0:8001)
start "Railway AI - ASGI (Daphne)" cmd /k ".\.venv\Scripts\python.exe -m daphne -b 0.0.0.0 -p 8001 railway_sih.asgi:application"

REM 3. Start Frontend SPA (Vite) (0.0.0.0:3000)
start "Railway AI - Frontend (React)" cmd /k "npm --prefix frontend run dev -- --host 0.0.0.0"

echo.
echo All services launched on 0.0.0.0!
echo ============================================================
echo   Frontend SPA:    http://0.0.0.0:3000
echo   Backend API:     http://0.0.0.0:8000
echo   Admin Console:   http://0.0.0.0:8000/admin/ (admin / 9999)
echo   WebSocket ASGI:  ws://0.0.0.0:8001/ws/
echo ============================================================
