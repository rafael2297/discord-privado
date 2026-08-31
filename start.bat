@echo off
REM Duplo clique neste arquivo para subir o projeto inteiro.
REM Chama o start-windows.ps1 com permissão liberada só para esta execução
REM (não muda nenhuma configuração permanente do seu Windows).

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-windows.ps1"

echo.
echo Janela fechada = servidor LiveKit parado. Feche esta janela quando terminar de usar.
pause
