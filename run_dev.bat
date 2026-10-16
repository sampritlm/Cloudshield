@echo off
echo =========================================================================
echo Starting CloudShield - Cloud Security Monitoring System
echo =========================================================================

echo Starting Backend API on http://127.0.0.1:8000 ...
start "CloudShield Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Frontend on http://localhost:5173 ...
start "CloudShield Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend API Docs: http://127.0.0.1:8000/docs
echo =========================================================================
