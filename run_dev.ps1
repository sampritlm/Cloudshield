# CloudShield Local Development Launcher
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "Starting CloudShield - Cloud Security Monitoring System" -ForegroundColor Cyan
Write-Host "=========================================================================" -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

Write-Host "Launching Backend API on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Launching Frontend Dev Server on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"

Write-Host "`nServers launched successfully!" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
