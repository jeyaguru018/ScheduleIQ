#!/usr/bin/env pwsh
# ════════════════════════════════════════════════════════════════════════════
#  ScheduleIQ — Local Development Startup Script
#  Starts all 3 services: Spring Boot API, Python ML, React Frontend
# ════════════════════════════════════════════════════════════════════════════
#
#  Usage:
#    .\start-dev.ps1              → Start all services
#    .\start-dev.ps1 -Only backend → Start only the backend
#    .\start-dev.ps1 -Only frontend → Start only the frontend  
#    .\start-dev.ps1 -Only ml    → Start only the ML service
#
# ════════════════════════════════════════════════════════════════════════════

param (
    [string]$Only = "all"
)

$ROOT = $PSScriptRoot
$JAVA_HOME = "$ROOT\scheduleiq-backend\jdk-21\jdk-21.0.3+9"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          ScheduleIQ — Development Server             ║" -ForegroundColor Cyan  
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Check prerequisites ───────────────────────────────────────────────────────
if (-not (Test-Path $JAVA_HOME)) {
    Write-Host "❌ JDK 21 not found at: $JAVA_HOME" -ForegroundColor Red
    Write-Host "   Please extract the jdk-21.zip in scheduleiq-backend/" -ForegroundColor Yellow
    exit 1
}

$env:JAVA_HOME = $JAVA_HOME
$env:PATH = "$JAVA_HOME\bin;$env:PATH"

# ── Start Backend ─────────────────────────────────────────────────────────────
if ($Only -eq "all" -or $Only -eq "backend") {
    Write-Host "🚀 Starting Spring Boot Backend (port 8080)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit -Command `"
        `$env:JAVA_HOME = '$JAVA_HOME';
        `$env:PATH = '`$env:JAVA_HOME\bin;`$env:PATH';
        cd '$ROOT\scheduleiq-backend';
        Write-Host '[BACKEND] Starting...' -ForegroundColor Green;
        .\mvnw.cmd spring-boot:run
    `""
    Start-Sleep -Seconds 2
}

# ── Start ML Service ──────────────────────────────────────────────────────────
if ($Only -eq "all" -or $Only -eq "ml") {
    Write-Host "🧠 Starting Python ML Service (port 8000)..." -ForegroundColor Magenta
    Start-Process powershell -ArgumentList "-NoExit -Command `"
        cd '$ROOT\scheduleiq-ml-service';
        Write-Host '[ML SERVICE] Starting...' -ForegroundColor Magenta;
        python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    `""
    Start-Sleep -Seconds 2
}

# ── Start Frontend ────────────────────────────────────────────────────────────
if ($Only -eq "all" -or $Only -eq "frontend") {
    Write-Host "🌐 Starting React Frontend (port 5173)..." -ForegroundColor Blue
    Start-Process powershell -ArgumentList "-NoExit -Command `"
        cd '$ROOT\scheduleiq-frontend';
        Write-Host '[FRONTEND] Starting...' -ForegroundColor Blue;
        npm run dev
    `""
}

Write-Host ""
Write-Host "✅ All services started! Access ScheduleIQ at:" -ForegroundColor Green
Write-Host "   🌐 Frontend:   http://localhost:5173" -ForegroundColor White
Write-Host "   🔧 Backend API: http://localhost:8080" -ForegroundColor White
Write-Host "   🧠 ML Service:  http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "ℹ️  Note: Backend takes ~30s to start (Spring Boot warmup)" -ForegroundColor Yellow
Write-Host "   Demo login works immediately - API login requires backend + PostgreSQL" -ForegroundColor Yellow
Write-Host ""
