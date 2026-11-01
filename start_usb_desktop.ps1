# PHONE SPACE66 - Wired USB Desktop Launcher
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     PHONE SPACE66 - LAUNCHING WIRED USB DESKTOP ENVIRONMENT    " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$rootPath = $PSScriptRoot
if (-not $rootPath) { $rootPath = Get-Location }

# Kill any previous bridge on port 6655 or 6656 to prevent port collision
try {
    Get-NetTCPConnection -LocalPort 6655,6656 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
} catch {}

# Detect connected phone
node "$rootPath/scripts/detect_usb_phone.cjs"

Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
Write-Host "1. Starting USB MTP Hardware Bridge..." -ForegroundColor Green
$bridgeProc = Start-Process node -ArgumentList "$rootPath/scripts/usb_mtp_bridge.cjs" -PassThru -WindowStyle Hidden

Write-Host "2. Starting PHONE SPACE66 Desktop Environment..." -ForegroundColor Green
Write-Host "Open: http://localhost:1420 (or click Connect Phone)" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan

try {
    Set-Location "$rootPath/desktop"
    npm run dev
} finally {
    if ($bridgeProc) {
        Stop-Process -Id $bridgeProc.Id -ErrorAction SilentlyContinue
    }
}
