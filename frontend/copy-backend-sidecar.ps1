# copy-backend-sidecar.ps1
#
# Copia backend/build/discord-privado-backend.exe pra dentro de
# src-tauri/binaries/, renomeado com o "target triple" que o Tauri exige
# pra reconhecer um sidecar.
#
# Rode isso depois de `npm run build:exe` dentro da pasta backend/, e antes
# de `npm run tauri dev` ou `npm run tauri build`.

$ErrorActionPreference = "Stop"

$sourceExe = "..\backend\build\discord-privado-backend.exe"
if (-not (Test-Path $sourceExe)) {
    Write-Host "ERRO: $sourceExe não encontrado." -ForegroundColor Red
    Write-Host "Rode primeiro: cd ..\backend && npm run build:exe" -ForegroundColor Red
    exit 1
}

# Detecta o target triple do Rust instalado (ex: x86_64-pc-windows-msvc)
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

$destName = "discord-privado-backend-$triple.exe"
Copy-Item $sourceExe (Join-Path $destDir $destName) -Force

Write-Host "Copiado para $destDir\$destName" -ForegroundColor Green
