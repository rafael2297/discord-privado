# Rodando o LiveKit nativo no Windows (sem Docker)

Isso serve pra descartar um bug conhecido do Docker Desktop no Windows com
repasse de portas UDP via WSL2. Rodando o `livekit-server.exe` direto no
Windows, ele usa a pilha de rede do Windows normalmente, sem essa camada
extra.

## Passo 1 — Baixar o executável

1. Acesse: https://github.com/livekit/livekit-server/releases/latest
2. Baixe o arquivo `livekit-server_<versão>_windows_amd64.zip` (procure por
   "windows_amd64" na lista de assets da release).
3. Extraia o `.zip` em uma pasta, por exemplo `C:\livekit\`.

## Passo 2 — Derrubar o container Docker (pra não brigar pela mesma porta)

```powershell
docker compose down
```

## Passo 3 — Rodar o LiveKit nativo

Abra o PowerShell na pasta onde extraiu o `.exe` (ex: `C:\livekit\`) e rode,
trocando pelo seu IP do Tailscale:

```powershell
.\livekit-server.exe --dev --bind 0.0.0.0 --node-ip=100.77.33.34
```

Deixe essa janela do PowerShell aberta — é o servidor rodando (equivalente
ao `docker compose logs -f` antes). Pra parar, feche a janela ou `Ctrl+C`.

## Passo 4 — Testar

As portas e regras de firewall são as mesmas de antes (7880, 7881, 7882/udp)
— como já estavam liberadas para o Docker, devem continuar valendo aqui
também, já que é o mesmo processo escutando nas mesmas portas, só que sem
o Docker no meio.

1. Gere tokens novos:
   ```powershell
   cd scripts
   node generate-token.js sala-teste alice
   node generate-token.js sala-teste bob
   ```
2. Testa com seu amigo como antes (URL = `ws://SEU_IP_TAILSCALE:7880`).

## Resultado deste teste nos diz o seguinte:

- **Se conectar agora:** confirma que era o Docker Desktop / WSL2 tendo
  problema com UDP. Nesse caso, pode ser que a gente decida rodar o LiveKit
  nativo no Windows em vez de Docker daqui pra frente (pelo menos nesta fase
  de testes locais) — ou investigar mais a fundo a config do Docker Desktop.
- **Se ainda falhar:** o problema não é o Docker, é outra coisa (rede,
  Tailscale, firewall de outro nível, antivírus). Nesse caso, o
  `about:webrtc` do Firefox do seu amigo vira essencial pra continuar
  investigando.

## Voltar a usar o Docker depois

```powershell
docker compose up -d
```
