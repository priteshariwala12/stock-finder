@echo off
title Stock Finder 3% - Live Online Tunnel
color 0A
echo ========================================================
echo   Stock Finder 3% - Starting Online Access
echo ========================================================
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0launch_tunnel.ps1"
pause
