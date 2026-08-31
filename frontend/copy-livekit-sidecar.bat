@echo off
REM Copia o livekit-server.exe pra dentro de src-tauri/binaries/,
REM renomeado do jeito que o Tauri exige pra reconhecer como sidecar.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0copy-livekit-sidecar.ps1"

echo.
pause
