@echo off
TITLE Enable Windows Firewall Access for Kallikalam Multi-Cam System
echo ========================================================================
echo   🛡️ Configuring Windows Firewall Rules for Any Wi-Fi / Hotspot
echo ========================================================================
echo.

:: Ensure administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Administrator privileges required.
    echo Please right-click allow_firewall.bat and choose "Run as administrator".
    pause
    exit /b 1
)

echo Allowing MediaMTX RTMP (1935) & HLS (8888) across ALL network profiles (Public/Private)...
netsh advfirewall firewall delete rule name="MediaMTX Universal RTMP" >nul 2>&1
netsh advfirewall firewall delete rule name="MediaMTX Universal HLS" >nul 2>&1

netsh advfirewall firewall add rule name="MediaMTX Universal RTMP" dir=in action=allow protocol=TCP localport=1935 profile=any
netsh advfirewall firewall add rule name="MediaMTX Universal HLS" dir=in action=allow protocol=TCP localport=8888 profile=any

echo.
echo ========================================================================
echo   ✅ SUCCESS! MediaMTX is now allowed on ALL networks (Public & Private).
echo   👉 You can now connect from any Wi-Fi or Phone Hotspot effortlessly!
echo ========================================================================
pause
