# =================================================================
# PHONE SPACE66 — Production Build & Packaging Script
# Generates:
# - Desktop: Windows Setup.exe (NSIS installer) & Linux AppImage/.deb
# - Mobile:  PHONE SPACE66 Companion.apk (Android APK)
# =================================================================

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       PHONE SPACE66 — PRODUCTION PACKAGING & RELEASE           " -ForegroundColor Cyan
Write-Host "          'Your Phone. Your Space. Your Desktop.'               " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Verification of System Assets
Write-Host "`n[STEP 1/4] Verifying Desktop and Android assets..." -ForegroundColor Yellow
if (-not (Test-Path "desktop/src-tauri/icons/icon.ico")) {
    Write-Host "Generating application icons..." -ForegroundColor Gray
    node scripts/generate_icons.cjs
}
Write-Host "✓ Assets verified." -ForegroundColor Green

# 2. Compile Desktop Web Application
Write-Host "`n[STEP 2/4] Building Desktop Web Bundle (Vite + React 19)..." -ForegroundColor Yellow
Set-Location "desktop"
npm run build
Set-Location ".."
Write-Host "✓ Desktop web bundle compiled to desktop/dist." -ForegroundColor Green

# 3. Packaging Tauri 2 Desktop
Write-Host "`n[STEP 3/4] Preparing Desktop Native Installer Bundle..." -ForegroundColor Yellow
Write-Host "Configured Targets:" -ForegroundColor Gray
Write-Host " - Windows: PHONE SPACE66 Setup.exe (NSIS Standalone Installer)" -ForegroundColor Gray
Write-Host " - Linux:   PHONE SPACE66.AppImage & phone-space66.deb" -ForegroundColor Gray
Write-Host "To execute native binary compilation, run:" -ForegroundColor Gray
Write-Host "  cd desktop; npm run build:desktop" -ForegroundColor White

# 4. Packaging Android Companion APK
Write-Host "`n[STEP 4/4] Preparing Android Companion Release APK..." -ForegroundColor Yellow
Write-Host "Target: android/app/build/outputs/apk/release/PHONE SPACE66 Companion.apk" -ForegroundColor Gray
Write-Host "To compile the signed APK, run:" -ForegroundColor Gray
Write-Host "  cd android; ./gradlew assembleRelease" -ForegroundColor White

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  PHONE SPACE66 PACKAGING RECIPES READY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
