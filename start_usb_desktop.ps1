# PHONE SPACE66 - Wired USB Desktop Launcher
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     PHONE SPACE66 - LAUNCHING WIRED USB DESKTOP ENVIRONMENT    " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Check if phone is connected
$rootPath = $PSScriptRoot
if (-not $rootPath) { $rootPath = Get-Location }

# Run detect script
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
