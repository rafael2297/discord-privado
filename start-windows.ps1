# start-windows.ps1
#
# Sobe o projeto inteiro no Windows com um único duplo-clique (via
# start.bat), contornando o bug de UDP do Docker Desktop: Postgres +
# Backend continuam no Docker (não têm esse problema), e o LiveKit roda
# nativo (fora do Docker), com o IP do Tailscale detectado automaticamente.
# Baixa o livekit-server.exe sozinho na primeira vez, se necessário.
#
# Uso: dê duplo clique em start.bat (ou rode este .ps1 direto no PowerShell).
#
# Pré-requisitos:
#   - Docker Desktop instalado e rodando
#   - Tailscale instalado e conectado (se for testar com amigos fora da
#     sua rede; se não tiver Tailscale rodando, cai pra 127.0.0.1 e só
#     funciona sozinho no mesmo PC)

$ErrorActionPreference = "Stop"

# --- 1. Garantir que o backend/.env existe ---
if (-not (Test-Path ".\backend\.env")) {
    Write-Host "backend\.env não existe, copiando de .env.example..." -ForegroundColor Yellow
    Copy-Item ".\backend\.env.example" ".\backend\.env"
}

# --- 2. Garantir que o livekit-server.exe existe (baixa automaticamente se não) ---
$exePath = ".\livekit-server.exe"
if (-not (Test-Path $exePath)) {
    Write-Host "`nlivekit-server.exe não encontrado, baixando automaticamente..." -ForegroundColor Yellow
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/livekit/livekit-server/releases/latest" -Headers @{ "User-Agent" = "discord-privado-setup" }
        $asset = $release.assets | Where-Object { $_.name -match "windows_amd64\.zip$" } | Select-Object -First 1
        if (-not $asset) {
            throw "Não encontrei o arquivo windows_amd64.zip na release mais recente."
        }
        $zipPath = ".\livekit-server-download.zip"
        $tempDir = ".\livekit-temp"
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force
        Copy-Item (Join-Path $tempDir "livekit-server.exe") $exePath -Force
        Remove-Item $zipPath -Force
        Remove-Item $tempDir -Recurse -Force
        Write-Host "livekit-server.exe baixado com sucesso." -ForegroundColor Green
    } catch {
        Write-Host "`nERRO: não consegui baixar automaticamente. Baixe manualmente em:" -ForegroundColor Red
        Write-Host "https://github.com/livekit/livekit-server/releases/latest" -ForegroundColor Red
        Write-Host "e coloque o livekit-server.exe nesta mesma pasta." -ForegroundColor Red
        Write-Host "Detalhe do erro: $_" -ForegroundColor DarkRed
        Read-Host "Pressione Enter para fechar"
        exit 1
    }
}

# --- 3. Descobrir IP do Tailscale (ou usar 127.0.0.1 como fallback) ---
$tsIp = $null
try {
    $tsIp = (tailscale ip -4 2>$null | Select-Object -First 1)
} catch {
    $tsIp = $null
}

if ([string]::IsNullOrWhiteSpace($tsIp)) {
    Write-Host "Tailscale não encontrado/rodando. Usando 127.0.0.1 — só vai funcionar sozinho, no mesmo PC." -ForegroundColor Yellow
    $tsIp = "127.0.0.1"
} else {
    Write-Host "IP do Tailscale detectado: $tsIp" -ForegroundColor Green
}

# --- 4. Atualizar LIVEKIT_URL no backend/.env com o IP certo ---
$envPath = ".\backend\.env"
$envContent = Get-Content $envPath
$newLine = "LIVEKIT_URL=ws://${tsIp}:7880"
$updated = $envContent | ForEach-Object {
    if ($_ -match "^LIVEKIT_URL=") { $newLine } else { $_ }
}
if (-not ($envContent -match "^LIVEKIT_URL=")) {
    $updated += $newLine
}
Set-Content -Path $envPath -Value $updated
Write-Host "backend\.env atualizado: $newLine" -ForegroundColor Green

# --- 5. Subir Postgres + Backend no Docker (sem o serviço livekit) ---
Write-Host "`nSubindo Backend (Docker)..." -ForegroundColor Cyan
docker compose up -d --build backend

# --- 6. Rodar o LiveKit nativo ---
Write-Host "`nIniciando LiveKit nativo (node-ip=$tsIp)... (deixe esta janela aberta)" -ForegroundColor Cyan
& $exePath --dev --bind 0.0.0.0 --node-ip=$tsIp
