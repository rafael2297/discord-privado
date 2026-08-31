# start-livekit.ps1
#
# Inicia SÓ o LiveKit nativo (fora do Docker) — não sobe Postgres nem
# Backend. Use isso quando o resto do projeto já estiver rodando e você só
# precisa (re)iniciar o LiveKit.
#
# Uso: dê duplo clique em start-livekit.bat (ou rode este .ps1 direto).

$ErrorActionPreference = "Stop"

# --- 1. Garantir que o livekit-server.exe existe (baixa automaticamente se não) ---
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
        Read-Host "Pressione Enter para fechar"
        exit 1
    }
}

# --- 2. Descobrir IP do Tailscale (ou usar 127.0.0.1 como fallback) ---
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

# --- 3. Se o backend/.env estiver com uma URL diferente, oferecer corrigir ---
$envPath = ".\backend\.env"
if (Test-Path $envPath) {
    $currentLine = Get-Content $envPath | Where-Object { $_ -match "^LIVEKIT_URL=" }
    $expectedLine = "LIVEKIT_URL=ws://${tsIp}:7880"
    if ($currentLine -and $currentLine -ne $expectedLine) {
        Write-Host "`nATENÇÃO: backend\.env está com '$currentLine'," -ForegroundColor Yellow
        Write-Host "mas o LiveKit vai subir em '$expectedLine'." -ForegroundColor Yellow
        Write-Host "Se o backend já estiver rodando com a URL antiga, seus amigos vão" -ForegroundColor Yellow
        Write-Host "receber a URL errada e não vão conseguir conectar." -ForegroundColor Yellow

        $resposta = Read-Host "`nQuer que eu corrija o backend\.env e reinicie o backend agora? (S/N)"
        if ($resposta -eq "S" -or $resposta -eq "s") {
            $envContent = Get-Content $envPath
            $updated = $envContent | ForEach-Object {
                if ($_ -match "^LIVEKIT_URL=") { $expectedLine } else { $_ }
            }
            Set-Content -Path $envPath -Value $updated
            Write-Host "backend\.env atualizado: $expectedLine" -ForegroundColor Green

            Write-Host "Reiniciando o backend..." -ForegroundColor Cyan
            docker compose up -d --force-recreate backend
            Write-Host "Backend reiniciado com a URL certa.`n" -ForegroundColor Green
        } else {
            Write-Host "Ok, não mexi em nada. Lembre de corrigir manualmente se for testar com amigos.`n" -ForegroundColor Yellow
        }
    }
}

# --- 4. Rodar o LiveKit nativo ---
Write-Host "`nIniciando LiveKit nativo (node-ip=$tsIp)... (deixe esta janela aberta)" -ForegroundColor Cyan
& $exePath --dev --bind 0.0.0.0 --node-ip=$tsIp
