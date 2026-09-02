# ================================================================
# Gujarat Police CCTV Integration & AI Video Analytics
# Database Seed & Migration Runner Script (PowerShell)
# ================================================================

param(
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbName = "cctv_hackathon",
    [string]$DbUser = "postgres"
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "🛡️  Gujarat Police CCTV Database Migration & Seed Tool" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# Locate psql executable
$psqlPaths = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe"
)

$psql = $null
foreach ($path in $psqlPaths) {
    if (Test-Path $path) {
        $psql = $path
        break
    }
}

if (-not $psql) {
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCmd) { $psql = $psqlCmd.Source }
}

if (-not $psql) {
    Write-Error "❌ psql.exe not found on system. Please verify PostgreSQL installation."
    exit 1
}

Write-Host "Using psql: $psql" -ForegroundColor DarkGray
Write-Host "Target:     $DbUser@$DbHost:$DbPort/$DbName`n" -ForegroundColor DarkGray

# Step 1: Ensure Database Exists
Write-Host "[1/3] Ensuring database '$DbName' exists..." -ForegroundColor Yellow
$dbCheck = & $psql -U $DbUser -h $DbHost -p $DbPort -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Could not connect to PostgreSQL server: $dbCheck"
    exit 1
}

if ($dbCheck.Trim() -ne "1") {
    Write-Host "Creating database '$DbName'..." -ForegroundColor Yellow
    & $psql -U $DbUser -h $DbHost -p $DbPort -c "CREATE DATABASE $DbName;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Failed to create database."
        exit 1
    }
    Write-Host "✅ Database created." -ForegroundColor Green
} else {
    Write-Host "✅ Database already exists." -ForegroundColor Green
}

# Step 2: Run Migrations
Write-Host "`n[2/3] Running SQL Migrations..." -ForegroundColor Yellow
$migrationFiles = Get-ChildItem "D:\Movies and Web se\hackerthon\database\migrations\*.sql" | Sort-Object Name

foreach ($file in $migrationFiles) {
    Write-Host "  -> Applying $($file.Name)..." -ForegroundColor DarkCyan
    & $psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -f $file.FullName 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Migration failed on $($file.Name)"
        exit 1
    }
}
Write-Host "✅ Migrations applied successfully." -ForegroundColor Green

# Step 3: Run Seeds
Write-Host "`n[3/3] Running SQL Seeds..." -ForegroundColor Yellow
$seedFiles = Get-ChildItem "D:\Movies and Web se\hackerthon\database\seeds\*.sql" | Sort-Object Name

foreach ($file in $seedFiles) {
    Write-Host "  -> Applying $($file.Name)..." -ForegroundColor DarkCyan
    & $psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -f $file.FullName 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Seed failed on $($file.Name)"
        exit 1
    }
}
Write-Host "✅ Seeds applied successfully." -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "🎉 Database setup complete! Ready for development." -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
