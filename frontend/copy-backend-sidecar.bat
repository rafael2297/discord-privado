@echo off
REM Copia o backend.exe compilado pra dentro de src-tauri/binaries/,
REM renomeado do jeito que o Tauri exige pra reconhecer como sidecar.
REM Rode isso DEPOIS de "npm run build:exe" dentro da pasta backend/.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0copy-backend-sidecar.ps1"

echo.
pause
