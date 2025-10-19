# Sync System Clock - Run as Administrator
# This fixes Binance timestamp/recvWindow errors

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SYSTEM CLOCK SYNCHRONIZATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    Pause
    Exit 1
}

Write-Host "Step 1: Stopping Windows Time service..." -ForegroundColor Yellow
try {
    Stop-Service w32time -ErrorAction Stop
    Write-Host "DONE" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Could not stop service: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Unregistering service..." -ForegroundColor Yellow
try {
    w32tm /unregister | Out-Null
    Write-Host "DONE" -ForegroundColor Green
} catch {
    Write-Host "WARNING: $($_)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Registering service..." -ForegroundColor Yellow
try {
    w32tm /register | Out-Null
    Write-Host "DONE" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 4: Starting Windows Time service..." -ForegroundColor Yellow
try {
    Start-Service w32time -ErrorAction Stop
    Write-Host "DONE" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Could not start service: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 5: Forcing time sync..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $result = w32tm /resync /force 2>&1
    Write-Host "DONE" -ForegroundColor Green
    Write-Host "$result" -ForegroundColor Gray
} catch {
    Write-Host "WARNING: $($_)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 6: Checking sync status..." -ForegroundColor Yellow
try {
    $status = w32tm /query /status
    Write-Host "DONE" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current Status:" -ForegroundColor Cyan
    Write-Host "$status" -ForegroundColor Gray
} catch {
    Write-Host "WARNING: Could not get status: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SYNCHRONIZATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now test your APIs again." -ForegroundColor Yellow
Write-Host ""

Pause

