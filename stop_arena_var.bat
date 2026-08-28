@echo off
TITLE ArenaVAR System - Shutdown
echo Stopping all ArenaVAR background services...
taskkill /FI "WINDOWTITLE eq ArenaVAR*" /F >nul 2>&1
taskkill /IM mediamtx.exe /F >nul 2>&1
echo Done! All services stopped.
pause
