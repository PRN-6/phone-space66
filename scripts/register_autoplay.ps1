# scripts/register_autoplay.ps1
# PHONE SPACE66 AutoPlay Registration Script
# Registers PHONE SPACE66 as the default Windows AutoPlay handler for Android / WPD device arrivals.

param (
    [switch]$Uninstall,
    [string]$ExePath = "$PSScriptRoot\..\PHONE SPACE66.exe"
)

$resolvedExe = [System.IO.Path]::GetFullPath($ExePath)

$progIdKey = "HKCU:\Software\Classes\PhoneSpace66.AutoPlay"
$handlerKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\Handlers\PhoneSpace66AutoPlay"
$wpdArrivalKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\EventHandlers\WPD\DeviceArrival"
$picsArrivalKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\EventHandlers\ShowPicturesOnArrival"
$userChoiceKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers\UserChosenExecuteHandlers\WPD\DeviceArrival"

if ($Uninstall) {
    Write-Host "[PHONE SPACE66] Removing AutoPlay registrations..." -ForegroundColor Yellow
    Remove-Item -Path $progIdKey -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $handlerKey -Recurse -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $wpdArrivalKey -Name "PhoneSpace66AutoPlay" -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $picsArrivalKey -Name "PhoneSpace66AutoPlay" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $userChoiceKey -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[PHONE SPACE66] AutoPlay registration removed." -ForegroundColor Green
    exit 0
}

if (-not (Test-Path $resolvedExe)) {
    Write-Warning "[PHONE SPACE66] Executable not found at '$resolvedExe'. Please compile or specify -ExePath."
    # Fallback to current directory launcher if present
    $fallbackExe = Join-Path (Get-Location).Path "PHONE SPACE66.exe"
    if (Test-Path $fallbackExe) {
        $resolvedExe = $fallbackExe
    }
}

Write-Host "[PHONE SPACE66] Registering AutoPlay handler for '$resolvedExe'..." -ForegroundColor Cyan

# 1. Register ProgID command
New-Item -Path "$progIdKey\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$progIdKey\shell\open\command" -Name "(Default)" -Value "`"$resolvedExe`"" -Force

# 2. Register AutoPlay Handler
New-Item -Path $handlerKey -Force | Out-Null
Set-ItemProperty -Path $handlerKey -Name "Action" -Value "Launch PHONE SPACE66 Desktop" -Force
Set-ItemProperty -Path $handlerKey -Name "Provider" -Value "PHONE SPACE66" -Force
Set-ItemProperty -Path $handlerKey -Name "DefaultIcon" -Value "`"$resolvedExe`",0" -Force
Set-ItemProperty -Path $handlerKey -Name "InvokeProgID" -Value "PhoneSpace66.AutoPlay" -Force
Set-ItemProperty -Path $handlerKey -Name "InvokeVerb" -Value "open" -Force

# 3. Register Event Handlers
New-Item -Path $wpdArrivalKey -Force | Out-Null
Set-ItemProperty -Path $wpdArrivalKey -Name "PhoneSpace66AutoPlay" -Value "" -Force

New-Item -Path $picsArrivalKey -Force | Out-Null
Set-ItemProperty -Path $picsArrivalKey -Name "PhoneSpace66AutoPlay" -Value "" -Force

# 4. Set as preferred default for WPD device arrival
New-Item -Path $userChoiceKey -Force | Out-Null
Set-ItemProperty -Path $userChoiceKey -Name "(Default)" -Value "PhoneSpace66AutoPlay" -Force

Write-Host "[PHONE SPACE66] AutoPlay registration successful! PHONE SPACE66 will now trigger automatically when an Android phone is connected." -ForegroundColor Green

