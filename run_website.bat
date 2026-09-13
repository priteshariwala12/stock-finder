@echo off
title NSE & BSE Stock Screener - Stock Finder 3%
echo ========================================================
echo   NSE & BSE Stock Screener (Stock Finder 3%)
echo   Official Bhavcopy & Fundamentals Screener
echo ========================================================
echo.

cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;C:\Program Files\nodejs;%PATH%"

echo [1/3] Checking database status...
if not exist "backend\stocks.db" (
    echo Database not found. Initializing and syncing official NSE/BSE data...
    python backend\data_engine.py
)

echo [2/3] Starting Stock Screener Web Server on http://127.0.0.1:8000 ...
start "" "http://127.0.0.1:8000"

cd backend
python -m uvicorn server:app --host 127.0.0.1 --port 8000
pause
