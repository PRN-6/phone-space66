@echo off
title PHONE SPACE66 - Wired USB Desktop
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_usb_desktop.ps1"
pause

