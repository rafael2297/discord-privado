# copy-livekit-sidecar.ps1
#
# Copia o livekit-server.exe (o mesmo baixado pelo start-windows.ps1/
# start-livekit.ps1 na raiz do projeto) pra dentro de src-tauri/binaries/,
# renomeado com o "target triple" que o Tauri exige pra reconhecer como
# sidecar.
#
# Rode isso antes de `npm run tauri dev` ou `npm run tauri build`.

$ErrorActionPreference = "Stop"

$sourceExe = "..\livekit-server.exe"
if (-not (Test-Path $sourceExe)) {
    Write-Host "ERRO: $sourceExe não encontrado." -ForegroundColor Red
    Write-Host "Baixe em https://github.com/livekit/livekit-server/releases/latest" -ForegroundColor Red
    Write-Host "(ou rode start-windows.ps1 uma vez, que baixa automaticamente) e" -ForegroundColor Red
    Write-Host "coloque o livekit-server.exe na raiz do projeto (fora da pasta frontend)." -ForegroundColor Red
    exit 1
}

try {
    $rustcInfo = rustc -vV
    $triple = ($rustcInfo | Select-String "^host:\s*(.+)$").Matches.Groups[1].Value.Trim()
} catch {
    Write-Host "Não consegui rodar 'rustc -vV' — Rust está instalado?" -ForegroundColor Red
    exit 1
}

if (-not $triple) {
    Write-Host "Não consegui detectar o target triple. Usando padrão x86_64-pc-windows-msvc." -ForegroundColor Yellow
    $triple = "x86_64-pc-windows-msvc"
}

$destDir = "src-tauri\binaries"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

$destName = "livekit-server-$triple.exe"
Copy-Item $sourceExe (Join-Path $destDir $destName) -Force

Write-Host "Copiado para $destDir\$destName" -ForegroundColor Green
