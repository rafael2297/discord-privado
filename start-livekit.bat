@echo off
REM Duplo clique neste arquivo para iniciar SÓ o LiveKit (sem mexer no
REM Docker/Postgres/Backend). Use quando o resto do projeto já estiver
REM rodando e você só precisa (re)iniciar o LiveKit.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-livekit.ps1"

echo.
echo Janela fechada = LiveKit parado. Feche esta janela quando terminar de usar.
pause
