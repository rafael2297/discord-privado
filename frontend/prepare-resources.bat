@echo off
REM Copia o backend.exe e o livekit-server.exe pra dentro de resources/,
REM de onde o Electron os pega automaticamente.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0prepare-resources.ps1"

echo.
pause
