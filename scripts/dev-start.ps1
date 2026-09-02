# ================================================================
# Gujarat Police CCTV Integration & AI Video Analytics
# Development Services Launcher (PowerShell)
# ================================================================

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "🛡️  Gujarat Police CCTV Development Environment Launcher" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$RootPath = "D:\Movies and Web se\hackerthon"
Set-Location $RootPath

# 1. Start PostgreSQL (check if running)
Write-Host "[1/4] Checking PostgreSQL service..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService -and $pgService.Status -eq "Running") {
    Write-Host "✅ PostgreSQL service is running ($($pgService.Name))." -ForegroundColor Green
} else {
    Write-Host "⚠️ PostgreSQL service is not running or not found. Please start PostgreSQL." -ForegroundColor Red
}

# 2. Start Backend in new window
Write-Host "`n[2/4] Starting NestJS Backend (port 3000)..." -ForegroundColor Yellow
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\backend'; npm run start:dev" -PassThru
Write-Host "✅ Backend process launched (PID: $($backendProcess.Id))." -ForegroundColor Green

# 3. Start Frontend in new window
Write-Host "`n[3/4] Starting React Frontend (port 5173)..." -ForegroundColor Yellow
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\frontend'; npm run dev" -PassThru
Write-Host "✅ Frontend process launched (PID: $($frontendProcess.Id))." -ForegroundColor Green

# 4. Start AI Engine in new window
Write-Host "`n[4/4] Starting FastAPI AI Engine (port 8000)..." -ForegroundColor Yellow
$aiProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\ai-engine'; .\.venv\Scripts\Activate.ps1; uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -PassThru
Write-Host "✅ AI Engine process launched (PID: $($aiProcess.Id))." -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "🚀 All services launched!" -ForegroundColor Green
Write-Host "   Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Backend:   http://localhost:3000/api" -ForegroundColor Cyan
Write-Host "   API Docs:  http://localhost:3000/api/docs" -ForegroundColor Cyan
Write-Host "   AI Engine: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Green
