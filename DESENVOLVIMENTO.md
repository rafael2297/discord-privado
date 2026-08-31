# Discord Privado — Guia de desenvolvimento

> Este arquivo é o antigo conteúdo do `README.md`, voltado pra quem vai
> mexer no código-fonte (rodar com `npm install`/`npm run dev`, builds,
> Docker, etc). O `README.md` agora é só pra quem vai usar o app já
> instalado — veja ele primeiro se você é só usuário.

---


## Etapa 3 (atual): frontend React

O cliente de teste (`test-client/index.html`) continua funcionando e é bom
pra debug rápido, mas o app "de verdade" agora é o frontend em
`frontend/` (React + TypeScript + Vite), que vai virar a base do app final
(inclusive quando empacotarmos com Electron — P10 do roadmap).

### Como rodar

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173` — **precisa ser exatamente esse endereço**
(`localhost`, não um IP). Veja o aviso abaixo antes de testar com amigos.
Mesma mecânica de sempre: digita seu nome, entra no canal de voz.

### ⚠️ Importante: acesso a microfone/câmera exige "localhost" ou HTTPS

Navegadores só liberam acesso a microfone/câmera em contexto seguro:
`https://` ou especificamente `http://localhost`. **Se a página for aberta
por um endereço IP** (ex: `http://100.x.x.x:5173`), o navegador bloqueia
silenciosamente — o erro que aparece é confuso ("Cannot read properties of
undefined (reading 'getUserMedia')"), mas a causa é sempre essa.

Isso significa que **cada pessoa precisa rodar o próprio `npm run dev` na
própria máquina** e acessar via `http://localhost:5173` — não dá pra um
único host rodar o frontend e os amigos acessarem pelo IP dele
(diferente do backend/LiveKit, que não têm essa restrição e funcionam
normalmente via Tailscale).

```bash
cd frontend
npm install
npm run dev
```

Cada amigo aponta a **URL do backend** (na tela de login) pro
`http://IP_TAILSCALE_DO_HOST:3000` — só isso muda entre as máquinas, o
frontend em si roda local pra cada um.

<details>
<summary>Isso muda no futuro?</summary>

Sim — quando o app virar um instalável de verdade (Electron, P10 do
roadmap), essa restrição de navegador deixa de existir (apps nativos não
têm essa limitação de "contexto seguro"). Também dá pra resolver antes
disso usando HTTPS via certificado do próprio Tailscale (`tailscale cert`),
mas isso é complexidade extra que não vale a pena agora, com a base ainda
sendo estabilizada.
</details>

## Etapa 7 — Empacotando como app instalável (Electron) + auto-update

Esta etapa transforma o frontend web num programa instalável de verdade
(`.exe` no Windows via instalador NSIS), com atualização automática via
GitHub Releases (usando `electron-updater`).

### Pré-requisitos (só uma vez)

Só precisa de Node.js — Electron já baixa o runtime necessário sozinho via
npm (diferente do Tauri, não precisa instalar Rust).

```bash
cd frontend
npm install
```

### Preparar os arquivos que o Electron vai empacotar

O Electron inicia o backend e o LiveKit como processos filho (child_process),
igual um `.bat` faria, mas de forma automática. Pra isso, ele precisa
encontrar os dois `.exe` dentro de `frontend/resources/`:

```powershell
cd backend
npm run build:exe
cd ..\frontend
.\prepare-resources.bat
```

Isso copia `discord-privado-backend.exe` (compilado) e `livekit-server.exe`
(baixado antes na raiz do projeto) pra dentro de `frontend/resources/`.

### Testar localmente (sem publicar nada ainda)

```bash
npm run electron:dev
```

Isso abre uma janela nativa do Electron já conectada no
`http://localhost:5173` — o resto (backend, LiveKit) é iniciado pelo
próprio app quando você clicar em "Hospedar servidor".

### Gerar o instalador de produção

```bash
npm run electron:build
```

Os instaladores ficam em `frontend/release/` (ex: um `.exe` do NSIS pra
Windows). É esse arquivo que você manda pros seus amigos — eles instalam
como qualquer programa normal, sem precisar de Node.js nem nada disso.

### Configurar auto-update via GitHub

1. Suba este projeto pro GitHub, se ainda não estiver lá.
2. Isso já está configurado no `package.json` (`"publish": [{"provider": "github"}]`)
   — não precisa gerar chave de assinatura manualmente como no Tauri;
   o `electron-updater` usa o próprio GitHub Release como fonte de verdade.
3. O workflow `.github/workflows/release.yml` builda e publica sozinho
   quando você cria uma tag:
   ```bash
   git add -A && git commit -m "vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```
   Isso compila o backend, baixa o LiveKit mais recente, builda o
   instalador e publica no GitHub Releases automaticamente — inclusive o
   arquivo `latest.yml` que o `electron-updater` usa pra saber que tem
   atualização nova.
4. Quem já tem o app instalado recebe a atualização sozinho na próxima vez
   que abrir (checagem automática em `electron/main.cjs`,
   `autoUpdater.checkForUpdatesAndNotify()`).

**⚠️ Isso ainda não foi testado de verdade** (sem acesso à internet no
ambiente onde escrevi esse código, não consegui instalar
`electron`/`electron-builder` pra validar). Bem provável que precise de
ajustes na primeira tentativa — me manda o log se der erro.

### Instalando pela primeira vez

A primeira instalação ainda é manual: baixe o `.exe` na página de Releases
do GitHub e rode. Depois disso, as próximas atualizações são automáticas.

## Etapa 7.1 — Backend como executável standalone (sem exigir Node.js)

Objetivo final (seção 13 do `PROJECT_CONTEXT.md`): quem for **hospedar** o
servidor não deve precisar instalar Node.js, npm, nem Docker — só abrir o
app. Este é o primeiro passo pra isso: compilar o backend inteiro num
único `discord-privado-backend.exe`, usando o recurso oficial "Single
Executable Applications" do próprio Node.js (não usamos `pkg`, que está
sem manutenção).

Trocamos `better-sqlite3` (módulo nativo, exigia compilar com Python/C++)
por **`node:sqlite`**, embutido no próprio Node.js desde a versão 22 —
isso é o que torna possível gerar um `.exe` único sem precisar carregar um
arquivo `.node` separado do lado de fora. É experimental (emite um aviso
no console), mas funciona normalmente.

### Gerando o executável

```bash
cd backend
npm install
npm run build:exe
```

Isso gera `backend/build/discord-privado-backend.exe`. **Validado
funcionando** — já testado com sucesso pelo usuário.

## Etapa 7.2 — Hospedar com um clique (Electron + detecção de rede)

Ao abrir o app instalado, aparece uma tela **"Hospedar servidor" / "Entrar
em servidor"**:

- **Hospedar servidor:** detecta as redes disponíveis na sua máquina
  (Tailscale, Radmin VPN, rede local — por heurística de nome/faixa de IP),
  deixa você escolher qual usar, e inicia o LiveKit + o backend sozinho
  com essa configuração. No final, mostra o endereço pra compartilhar com
  os amigos.
- **Entrar em servidor:** cai no fluxo antigo — digita a URL do backend de
  quem estiver hospedando.

Isso já foi testado e validado pelo usuário (com os ajustes de permissão
do processo filho descritos no `PROJECT_CONTEXT.md`).


### No Windows (recomendado): duplo clique

1. Instale e conecte o Tailscale, se for testar com amigos (veja seção
   completa mais abaixo). Sem Tailscale, funciona só sozinho no mesmo PC.
2. Dê **duplo clique em `start.bat`**.

Pronto. Esse único clique: baixa o `livekit-server.exe` sozinho (se ainda
não tiver), sobe o Backend no Docker, detecta seu IP do Tailscale,
configura o `backend/.env`, e inicia o LiveKit nativo já certo. Uma janela
preta fica aberta — é o LiveKit rodando; feche-a quando terminar de usar
(isso derruba a call pra todo mundo, então avise antes).

Prefere fazer isso pelo terminal em vez de duplo clique? `.\start-windows.ps1`
faz a mesma coisa.

### Iniciar só o LiveKit (sem mexer no Backend)

Se o Backend já estiver rodando e você só precisa (re)iniciar o LiveKit
(por exemplo, depois de fechar aquela janela sem querer, ou pra trocar de
rede), dê duplo clique em **`start-livekit.bat`** em vez do `start.bat`.
Ele baixa o executável se precisar, detecta o IP do Tailscale e inicia só
o LiveKit — não toca no Docker.

<details>
<summary>Por que o LiveKit não roda dentro do Docker no Windows?</summary>

O Docker Desktop no Windows tem um bug conhecido de repasse de portas UDP
que impede áudio/vídeo/tela de funcionar **entre PCs diferentes** quando o
LiveKit roda dentro do Docker. Isso não afeta o Backend (só usa HTTP/TCP
normal) — só o LiveKit especificamente, e só no Windows.
</details>

### Em outro sistema (Linux/VPS): tudo no Docker

Esse bug de UDP é específico do Docker Desktop no Windows/WSL2 — numa VPS
Linux (ou qualquer Linux), o `docker-compose.yml` funciona com tudo dentro
do Docker, incluindo o LiveKit, sem esse problema:

```bash
cp backend/.env.example backend/.env
docker compose up -d
```

### Testando (qualquer sistema)

Confira se está tudo de pé:

```bash
docker compose ps
curl http://localhost:3000/health
```

Deve responder `{"ok":true}`.

Abra `test-client/index.html` no navegador (ou use o frontend React da
Etapa 3). Preencha:
- **URL do backend:** `http://localhost:3000`
- **Seu nome:** o que você quiser — não precisa de senha nem cadastro

Clique em **Entrar**, depois em **Entrar no canal de voz**. Só existe um
canal de voz (`geral`), então não tem nada pra escolher — o token do
LiveKit é gerado automaticamente pelo backend.

### ⚠️ Se estiver no Windows e usou `docker compose up -d` (sem o script)

O bug de UDP descrito acima se aplica. Prefira o `start-windows.ps1`
(seção anterior). Se preferir fazer manualmente mesmo assim:

```bash
docker compose up -d backend
```

(sobe só o Backend via Docker) e rode o LiveKit nativo separado, seguindo
`RODANDO_SEM_DOCKER.md`. Lembre de ajustar `LIVEKIT_URL` no `backend/.env`
pro IP do Tailscale antes de subir o backend — o `start-windows.ps1` já faz
isso automaticamente por você.

### Testando com amigos fora da sua rede

Sua rede residencial provavelmente usa CGNAT — a solução é o **Tailscale**
(veja seção completa mais abaixo). Resumo rápido:

1. Instale o Tailscale no seu PC e no PC do seu amigo, mesma tailnet.
2. Rode `.\start-windows.ps1` (ele já detecta e configura o IP do Tailscale
   sozinho) — ou, se estiver em Linux/VPS, ajuste `--node-ip` no
   `docker-compose.yml` e `LIVEKIT_URL` no `backend/.env` manualmente.
3. Seu amigo abre o app (`index.html` ou o frontend React), usa
   `http://SEU_IP_TAILSCALE:3000` como URL do backend, digita o nome dele,
   entra na mesma sala.

Ele **não precisa mais** rodar `generate-token.js` nem nada manual — só
precisa alcançar seu backend na porta 3000 e seu LiveKit na porta 7880/7882,
via Tailscale.

---

# Etapa 1 (histórico) — LiveKit local + teste de call/tela manual

Esta etapa validou a parte mais crítica do projeto (P1 + P2 do roadmap):
**entrar numa call de voz e compartilhar tela**, usando LiveKit self-hosted.
Nessa etapa **não havia backend nem autenticação real** — os tokens eram
gerados manualmente por um script, só para teste. Mantido aqui como
referência e fallback de troubleshooting.

## Pré-requisitos

- Docker + Docker Compose instalados
- Node.js instalado (para gerar os tokens de teste)

## Passo 1 — Subir o LiveKit

```bash
docker compose up -d
```

Isso sobe o LiveKit em modo `--dev` (chaves fixas `devkey` / `secret`, só para
desenvolvimento local) escutando em `ws://localhost:7880`.


Verifique se subiu:

```bash
docker compose logs -f livekit
```

Você deve ver uma linha parecida com `starting LiveKit server` sem erros.
Também dá pra conferir se a porta está de fato acessível:

```bash
docker compose ps
```

O container `livekit-dev` deve aparecer com status `Up` e a porta
`0.0.0.0:7880->7880/tcp` na coluna PORTS. Se a coluna PORTS estiver vazia,
o container não está expondo a porta corretamente (reveja o `docker-compose.yml`).

### Se der "could not establish pc connection" (mas o "signal connected" apareceu)

Sinalização (WebSocket) conectou, mas a mídia (WebRTC) não. Causa comum ao
rodar o LiveKit em Docker local: o servidor anuncia o IP *interno* do
container nos candidatos ICE, que seu navegador não alcança. A correção
(`--node-ip=127.0.0.1`) já está no `docker-compose.yml` — se você já tinha
subido o container antes dessa correção, rode:

```bash
docker compose down
docker compose up -d
```

e tente conectar de novo (gere tokens novos, os antigos expiram em 10min).

Isso só funciona porque cliente e servidor estão na mesma máquina. Quando
formos testar com um amigo em outra rede (ou subir numa VPS), o `--node-ip`
muda para o IP público real do servidor — isso está anotado como próximo
teste pendente mais abaixo.

### Se der "ICE failed" / "could not establish pc connection" (mas o "signal connected" apareceu)

Sinalização conectou, mídia não — geralmente é o **Firewall do Windows**
bloqueando as portas de mídia (UDP 50000-50100 e TCP 7881) no PC que está
**hospedando** o LiveKit (não no PC de quem está entrando). A porta 7880
costuma já estar liberada porque o Docker Desktop pede permissão na
primeira vez que ela é usada, mas as outras não.

No PC que hospeda o LiveKit, abra o **PowerShell como Administrador** e rode:

```powershell
New-NetFirewallRule -DisplayName "LiveKit TCP" -Direction Inbound -Protocol TCP -LocalPort 7880-7881 -Action Allow
New-NetFirewallRule -DisplayName "LiveKit UDP" -Direction Inbound -Protocol UDP -LocalPort 7882 -Action Allow
```

Isso cria regras explícitas liberando essas portas de entrada, em qualquer
perfil de rede (inclusive a rede "Pública", que é como o Windows geralmente
classifica a interface do Tailscale por padrão). Depois teste de novo com
seu amigo (gere tokens novos, os antigos expiram em 10min).

Se você já tinha criado a regra `LiveKit UDP` apontando pra `50000-50100`
antes dessa correção, remova e recrie:

```powershell
Remove-NetFirewallRule -DisplayName "LiveKit UDP"
New-NetFirewallRule -DisplayName "LiveKit UDP" -Direction Inbound -Protocol UDP -LocalPort 7882 -Action Allow
```

Se quiser reverter tudo depois: `Remove-NetFirewallRule -DisplayName "LiveKit TCP"` e o mesmo para "LiveKit UDP".

### Se der "Erro ao conectar: could not establish signal connection" / connection refused

Isso significa que o navegador não conseguiu nem abrir a conexão com
`localhost:7880` — ou seja, o problema é *antes* do LiveKit, não é token
inválido. Checklist:

1. `docker compose ps` mostra o container rodando e com a porta 7880 mapeada?
2. `curl http://localhost:7880` (ou abrir essa URL no navegador) — deve
   responder alguma coisa (não "conexão recusada"). Se recusar, o container
   não subiu ou a porta não foi exposta.
3. Reinicie do zero: `docker compose down && docker compose up -d`
4. Se estiver usando WSL2 no Windows, teste rodar o `docker compose` de
   dentro do WSL (não do PowerShell/CMD) para evitar problemas de rede
   entre Windows e o WSL.
5. Firewall/antivírus do Windows às vezes bloqueia portas novas na primeira
   vez — verifique se apareceu algum pop-up pedindo permissão para o
   Docker Desktop.

## Passo 2 — Gerar tokens de teste

```bash
cd scripts
npm install
node generate-token.js sala-teste alice
node generate-token.js sala-teste bob
```

Isso gera dois tokens: um para o usuário `alice` e outro para `bob`, ambos
entrando na mesma sala `sala-teste`. Guarde os dois valores.

## Passo 3 — Testar a call

1. Abra `test-client/index.html` diretamente no navegador (duplo clique, ou
   sirva com qualquer servidor estático).
2. Abra a mesma página em **duas abas diferentes** (ou dois navegadores).
3. Na aba 1: cole o token da `alice`, clique em **Entrar na call**.
4. Na aba 2: cole o token do `bob`, clique em **Entrar na call**.
5. Teste:
   - Áudio (fale em um microfone e veja/ouça na outra aba — o quadro fica
     com borda verde quando alguém está falando)
   - Mute/desmute
   - Ligar câmera
   - Compartilhar tela (`🖥️ Compartilhar tela`) — deve aparecer um bloco
     maior na outra aba com a tela compartilhada

## Testando com amigos fora da sua rede (via Tailscale)

Sua rede residencial provavelmente usa CGNAT (não dá pra abrir portas no
roteador). A solução adotada foi o **Tailscale**: uma VPN privada e gratuita
que faz seu PC e o dos seus amigos se enxergarem diretamente, sem precisar
de VPS nem domínio.

### Passo 1 — Instalar e configurar o Tailscale

1. Crie conta em https://tailscale.com/ (Google/Microsoft/GitHub, sem cartão).
2. Instale no seu PC: https://tailscale.com/download/windows
3. Descubra seu IP do Tailscale:
   ```bash
   tailscale ip -4
   ```
   Vai ser algo tipo `100.101.102.103`.
4. Convide seus amigos pela mesma tailnet: painel admin
   (https://login.tailscale.com/admin/users) → "Invite external user".
   Eles instalam o Tailscale e entram com o convite.

### Passo 2 — Configurar o LiveKit para usar seu IP do Tailscale

Abra o `docker-compose.yml` e troque `--node-ip=127.0.0.1` pelo seu IP do
Tailscale, por exemplo:

```yaml
command: --dev --bind 0.0.0.0 --node-ip=100.101.102.103
```

Depois:

```bash
docker compose down
docker compose up -d
```

### Passo 3 — Gerar token e testar

No seu PC:

```bash
cd scripts
node generate-token.js sala-teste alice
```

Manda esse zip/pasta inteira pro seu amigo (ou só o `test-client/index.html`
+ o script de gerar token). Ele gera o token dele:

```bash
node generate-token.js sala-teste bob
```

No `test-client/index.html`, o campo **URL do LiveKit** deve ser preenchido
com o SEU IP do Tailscale (não `localhost`), por exemplo:

```
ws://100.101.102.103:7880
```

Os dois (você e seu amigo) abrem o `index.html`, colam seus respectivos
tokens, apontam pra essa mesma URL, e clicam em Entrar na call.

### Se não conectar: firewall do Windows

O Windows às vezes bloqueia conexões de entrada na interface do Tailscale
por padrão (perfil de rede "Pública"). Se seu amigo não conseguir conectar:

1. Abra "Firewall do Windows Defender" → "Permitir um app pelo firewall".
2. Ou, mais simples: no painel do Tailscale (ícone na bandeja), confira se
   a rede está marcada como confiável/privada.
3. Teste básico de conectividade: peça pro seu amigo rodar
   `ping 100.101.102.103` (seu IP Tailscale) — se não responder, o
   problema é de rede/firewall antes mesmo de chegar no LiveKit.



- [ ] Testar entre 2 redes diferentes (não só localhost) — se possível, um
      amigo em outra casa/rede, para validar NAT traversal (pode precisar de
      TURN — ainda não configurado nesta etapa).
- [ ] Testar com upload de internet mais fraco (rede residencial) e ver se a
      qualidade adapta sem travar.
- [ ] Testar compartilhamento de tela em 1080p30 e ver consumo de CPU/banda.
- [ ] Trocar de Wi-Fi para 4G durante uma call e ver se reconecta sozinho.

Esses testes de rede real (fora do localhost) vão indicar se já precisamos
configurar um TURN server (coturn ou o embutido do LiveKit) antes de seguir
para a próxima etapa.

## Ajustando qualidade do compartilhamento de tela

O `test-client/index.html` já publica a tela com `contentHint: "motion"`,
30fps e 4 Mbps de bitrate — bom padrão pra jogos/vídeo com movimento rápido.
Se ainda notar engasgo:

- **Se travar/atrasar (não só "borrado"):** provavelmente é falta de upload
  de quem está compartilhando. Reduza `maxBitrate` (ex: para `2_500_000`) e/ou
  a resolução (`1280, 720`) no `toggleScreenShare()` do `index.html`.
- **Se ficar borrado mas fluido:** aumente `maxBitrate` (ex: `6_000_000`),
  se o upload permitir.
- Rode um teste de velocidade de upload (ex: fast.com) de quem vai
  compartilhar a tela **durante uma call ativa** — é o cenário real, não o
  teste isolado.

## Próxima etapa

Backend mínimo (Phoenix ou Node) com cadastro/login + endpoint que gera o
token do LiveKit (substituindo o `generate-token.js` manual).
