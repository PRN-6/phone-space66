@echo off
title PHONE SPACE66 - Build Executable
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_exe.ps1"
pause

