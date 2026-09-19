@echo off
REM ============================================
REM Railway AI Platform - Windows Batch Shutdown
REM ============================================

echo ============================================================
echo    Railway AI Block Planning Platform - Shutdown Engine
echo ============================================================
echo.

where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker not found! Please ensure Docker Desktop is running.
    pause
    exit /b 1
)

echo Stopping all multi-container services...
docker compose down 2>nul
if %ERRORLEVEL% neq 0 (
    docker-compose down
)

echo.
echo ============================================================
echo         ALL PLATFORM SERVICES STOPPED CLEANLY!
echo ============================================================
echo   To restart anytime, run:  .\scripts\start.ps1
echo   Or double-click:          'Run Railway Project.bat'
echo ============================================================
echo.
pause
