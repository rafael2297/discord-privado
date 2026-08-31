# build-exe.ps1
#
# Compila o backend Node.js/TypeScript num único arquivo
# discord-privado-backend.exe, standalone — quem for RODAR o .exe não
# precisa ter Node.js instalado. Usa o recurso oficial "Single Executable
# Applications" (SEA) do próprio Node.js (sem pacotes tipo pkg, que estão
# sem manutenção).
#
# IMPORTANTE: só quem está BUILDANDO (gerando o .exe) precisa de Node.js
# 22+ instalado. O .exe resultante roda sozinho em qualquer Windows.
#
# Uso: dentro da pasta backend/, rode:
#   npm run build:exe

$ErrorActionPreference = "Stop"

Write-Host "1/5 Compilando TypeScript..." -ForegroundColor Cyan
npm run build

Write-Host "2/5 Empacotando num arquivo único (esbuild)..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path build | Out-Null
npm run build:bundle

Write-Host "3/5 Gerando o blob do SEA..." -ForegroundColor Cyan
node --experimental-sea-config sea-config.json

Write-Host "4/5 Copiando o node.exe base..." -ForegroundColor Cyan
$nodePath = (Get-Command node).Source
Copy-Item $nodePath "build\discord-privado-backend.exe" -Force

Write-Host "5/5 Injetando o código no executável (postject)..." -ForegroundColor Cyan
npx postject "build\discord-privado-backend.exe" NODE_SEA_BLOB "build\sea-prep.blob" `
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 `
  --overwrite

Write-Host "`nPronto: build\discord-privado-backend.exe" -ForegroundColor Green
Write-Host "Teste rodando: .\build\discord-privado-backend.exe" -ForegroundColor Green
Write-Host "(precisa de um arquivo .env na mesma pasta que o .exe, com as mesmas" -ForegroundColor Yellow
Write-Host "Variaveis do backend/.env.example - copie ele tambem pra pasta build" -ForegroundColor Yellow
