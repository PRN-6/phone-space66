# PHONE SPACE66 - Windows Executable Build Pipeline
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "      PHONE SPACE66 - BUILDING WINDOWS EXECUTABLE (.EXE)        " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

# 1. Compile Desktop React + Vite assets
Write-Host "1. Compiling React + TypeScript + Vite Desktop Assets..." -ForegroundColor Green
Set-Location "$root/desktop"
npm run build
Set-Location "$root"

# 2. Compile PHONE SPACE66.exe
Write-Host "2. Compiling PHONE SPACE66.exe (Native Windows GUI Executable)..." -ForegroundColor Green
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /target:winexe /win32icon:"$root\desktop\src-tauri\icons\icon.ico" /out:"$root\PHONE SPACE66.exe" "$root\scripts\Launcher.cs"

# 3. Compile PHONE SPACE66 Setup.exe
Write-Host "3. Compiling PHONE SPACE66 Setup.exe (Windows Installer)..." -ForegroundColor Green
& $csc /target:winexe /r:System.Windows.Forms.dll /win32icon:"$root\desktop\src-tauri\icons\icon.ico" /out:"$root\PHONE SPACE66 Setup.exe" "$root\scripts\Installer.cs"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "SUCCESS! Windows Executables Created:" -ForegroundColor Green
Get-Item "$root\PHONE SPACE66.exe", "$root\PHONE SPACE66 Setup.exe" | Format-Table Name, Length, LastWriteTime
Write-Host "You can now double-click 'PHONE SPACE66.exe' to launch the app!" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

