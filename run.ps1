# ============================================================
# Railway AI Platform - PowerShell One-Command Launcher
# ============================================================

$PSExec = if (Test-Path "$PSHOME\powershell.exe") { "$PSHOME\powershell.exe" } else { "powershell.exe" }
$WorkDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   Launching Railway AI Block Planning Platform (0.0.0.0)   " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Start Django Backend (0.0.0.0:8000 - Debug Mode)
Start-Process $PSExec -WorkingDirectory $WorkDir -ArgumentList "-NoExit", "-Command", "Write-Host '--- Django Backend (0.0.0.0:8000 - Debug) ---' -ForegroundColor Green; .\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000"

# 2. Start Daphne ASGI WebSocket Server (0.0.0.0:8001)
Start-Process $PSExec -WorkingDirectory $WorkDir -ArgumentList "-NoExit", "-Command", "Write-Host '--- Daphne ASGI WebSocket (0.0.0.0:8001) ---' -ForegroundColor Green; .\.venv\Scripts\python.exe -m daphne -b 0.0.0.0 -p 8001 railway_sih.asgi:application"

# 3. Start Frontend (Vite)
Start-Process $PSExec -WorkingDirectory $WorkDir -ArgumentList "-NoExit", "-Command", "Write-Host '--- React Frontend (0.0.0.0:3000) ---' -ForegroundColor Green; npm --prefix frontend run dev -- --host 0.0.0.0"

Write-Host ""
Write-Host "All services launched in separate windows on 0.0.0.0 (broadcast mode)!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Frontend SPA:    http://0.0.0.0:3000  (or http://localhost:3000)"
Write-Host "  Backend API:     http://0.0.0.0:8000  (or http://localhost:8000)"
Write-Host "  Admin Console:   http://0.0.0.0:8000/admin/ (admin / 9999)"
Write-Host "  WebSocket ASGI:  ws://0.0.0.0:8001/ws/"
Write-Host "============================================================" -ForegroundColor Cyan
