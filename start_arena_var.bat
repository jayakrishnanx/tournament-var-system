@echo off
TITLE Kallikalam Tournament Management & Multi-Cam VAR Launcher
echo ========================================================================
echo   🏆 Starting Kallikalam Tournament Management & Multi-Cam VAR System
echo ========================================================================
echo.

set PROJECT_DIR=%~dp0

:: 1. Start MediaMTX Video Engine
echo [1/3] Launching MediaMTX 3-Camera Streaming Engine (Ports 1935, 8554, 8888, 8889)...
start "Kallikalam - MediaMTX Engine" /D "%PROJECT_DIR%" .\mediamtx.exe

:: 2. Start Django Backend Server
echo [2/3] Launching Django ASGI Backend Server (Port 8000)...
start "Kallikalam - Django Backend" /D "%PROJECT_DIR%backend" py -3 manage.py runserver 0.0.0.0:8000

:: 3. Start React Web Server
echo [3/3] Launching Web Application Interface (Port 5173)...
start "Kallikalam - Frontend Web App" /D "%PROJECT_DIR%frontend" npx vite --host 0.0.0.0 --port 5173

timeout /t 3 >nul

:: Auto open browser
echo Opening Kallikalam App in your web browser...
start http://localhost:5173/

echo.
echo ========================================================================
echo   ✅ Kallikalam System is LIVE and running!
echo   👉 Web Console: http://localhost:5173/
echo   👉 Match Recordings Folder: %PROJECT_DIR%recordings\
echo ========================================================================
