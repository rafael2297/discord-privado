# prepare-resources.ps1
#
# Copia o backend compilado e o livekit-server.exe pra dentro de
# frontend/resources/ — é de lá que o Electron os pega, tanto em
# desenvolvimento quanto no build final (via "extraResources" no
# package.json). Diferente do Tauri, não precisa renomear com target
# triple — só copiar com o nome original mesmo.
#
# Rode isso depois de:
#   cd backend && npm run build:exe
# e de ter o livekit-server.exe na raiz do projeto (baixado pelo
# start-windows.ps1 antigo, ou manualmente em
# https://github.com/livekit/livekit-server/releases/latest).

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path "resources" | Out-Null

$backendExe = "..\backend\build\discord-privado-backend.exe"
if (Test-Path $backendExe) {
    Copy-Item $backendExe "resources\discord-privado-backend.exe" -Force
    Write-Host "Copiado: resources\discord-privado-backend.exe" -ForegroundColor Green
} else {
    Write-Host "AVISO: $backendExe não encontrado (rode 'npm run build:exe' dentro de backend/ primeiro)." -ForegroundColor Yellow
}

$livekitExe = "..\livekit-server.exe"
if (Test-Path $livekitExe) {
    Copy-Item $livekitExe "resources\livekit-server.exe" -Force
    Write-Host "Copiado: resources\livekit-server.exe" -ForegroundColor Green
} else {
    Write-Host "AVISO: $livekitExe não encontrado na raiz do projeto." -ForegroundColor Yellow
}
