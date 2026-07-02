# Migrate data PostgreSQL lokal → Neon
# Edit $LOCAL_* sesuai kredensial DB lokal Anda

param(
    [string]$LocalHost = "localhost",
    [int]$LocalPort = 5432,
    [string]$LocalDb = "sipadu_cart",
    [string]$LocalUser = "postgres",
    [string]$LocalPassword = "postgres",
    [switch]$SchemaOnly,
    [switch]$DataOnly
)

$ErrorActionPreference = "Stop"
$PgBin = "C:\Program Files\PostgreSQL\18\bin"
$DumpFile = Join-Path $env:TEMP "sipadu_cart_dump.sql"

# Load DATABASE_URL dari .env
$EnvFile = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $EnvFile)) { throw ".env tidak ditemukan di backend/" }

$DatabaseUrl = (Get-Content $EnvFile | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
if (-not $DatabaseUrl) { throw "DATABASE_URL tidak ada di .env" }

Write-Host "=== SIPADU CART: Migrate lokal -> Neon ===" -ForegroundColor Cyan

if (-not $DataOnly) {
    Write-Host "`n[1/2] Schema ke Neon (001_init_schema.sql)..." -ForegroundColor Yellow
    node (Join-Path $PSScriptRoot "migrate-to-neon.js")
}

if (-not $SchemaOnly) {
    Write-Host "`n[2/2] Dump data dari lokal..." -ForegroundColor Yellow
    $env:PGPASSWORD = $LocalPassword

    & "$PgBin\pg_dump.exe" `
        -h $LocalHost -p $LocalPort -U $LocalUser -d $LocalDb `
        --data-only --inserts --disable-triggers `
        --exclude-table-data=spatial_ref_sys `
        -f $DumpFile

    if ($LASTEXITCODE -ne 0) { throw "pg_dump gagal — cek kredensial DB lokal" }

    Write-Host "Restore ke Neon..."
    & "$PgBin\psql.exe" $DatabaseUrl -f $DumpFile

    if ($LASTEXITCODE -ne 0) { throw "psql restore gagal" }

    Remove-Item $DumpFile -ErrorAction SilentlyContinue
    Write-Host "✓ Data lokal berhasil dipindah ke Neon" -ForegroundColor Green
}

Write-Host "`nSelesai!" -ForegroundColor Green
