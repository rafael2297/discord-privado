# Discord Privado — Contexto do Projeto

> Este arquivo é a fonte de verdade do projeto. Deve ser lido antes de qualquer decisão de arquitetura ou implementação. Atualize-o sempre que uma decisão importante mudar.

---

## 1. Visão geral

Aplicativo de chat + chamadas de voz/vídeo + compartilhamento de tela para uso privado de um grupo de amigos, inspirado no Discord. Não é um produto comercial nem precisa escalar para milhares de usuários — o alvo é um grupo pequeno (estimar 5–20 pessoas simultâneas, salas de 2–8 pessoas em call).

### Objetivo principal (não perder de vista)
O core do projeto é: **entrar numa call de voz/vídeo e compartilhar tela com qualidade estável**. Tudo o mais (chat, cargos, emojis, bots etc.) é secundário e só deve ser priorizado depois que essa parte estiver sólida.

### Não-objetivos (por agora)
- Não vamos reinventar WebRTC/SFU do zero — usamos LiveKit pronto.
- Não vamos tentar suportar centenas de usuários simultâneos.
- Não vamos priorizar E2E encryption de mídia nesta fase (WebRTC já criptografa o transporte via DTLS/SRTP, o que é suficiente para uso entre amigos).
- Não vamos construir sistema de bots/plugins nesta fase.

---

## 2. Prioridades (ordem de execução)

| Fase | Entrega | Prioridade |
|------|---------|------------|
| **P0** | Auth básica (login/cadastro) + criação de sala/canal de voz | 🔴 Crítica |
| **P1** | Entrar/sair de call de voz (LiveKit), mute/unmute, indicador de quem está falando | 🔴 Crítica — **foco principal** |
| **P2** | Compartilhamento de tela (LiveKit screen share) | 🔴 Crítica — **foco principal** |
| **P3** | Vídeo de câmera (liga/desliga) | 🟡 Importante |
| **P4** | Chat de texto em tempo real (WebSocket/Phoenix Channels) | 🟡 Importante |
| **P5** | Presença online/offline, lista de membros | 🟡 Importante |
| **P6** | Grupos/servidores, múltiplos canais | 🟢 Desejável |
| **P7** | Cargos, permissões, convites | 🟢 Desejável |
| **P8** | Upload de arquivo, emojis, reações, edição/exclusão de mensagens | 🟢 Desejável |

**Pendência anotada (P8):** usuário quer poder mandar imagens e áudio no chat, e um sistema de efeitos sonoros tipo soundboard do Discord — mas **sem os limites que o Discord impõe** (ex: limite de sons por servidor, duração máxima). Ainda não implementado, entra quando chegarmos no P8.
| **P9** | Notificações, histórico, reconexão automática robusta | 🟢 Desejável |
| **P10** | Empacotar como app instalável (Electron) + auto-update via GitHub Releases | 🟢 Desejável — só depois da base funcionando |

**Regra de decisão:** se surgir dúvida sobre o que implementar a seguir, sempre priorizar o que aproxima de "call estável + compartilhamento de tela funcionando bem", mesmo que isso signifique atrasar features de chat.

---

## 3. Stack técnica escolhida

### Backend (sinalização, API, chat)
- **Elixir + Phoenix** (Phoenix Channels para WebSocket, Phoenix Presence para status online)
  - Justificativa: Erlang/OTP foi desenhado para sistemas de telecom com muitas conexões concorrentes leves; Phoenix Presence resolve "quem está online / em qual sala" de forma nativa, sem reinventar.
  - Alternativa aceitável se a equipe preferir: Node.js + TypeScript (fastify/express + ws ou socket.io) — mais familiar, ecossistema WebRTC/LiveKit é majoritariamente JS.

### Mídia (voz, vídeo, compartilhamento de tela)
- **LiveKit** (self-hosted, open source, Apache 2.0)
  - É um SFU (Selective Forwarding Unit) pronto para produção — não fazemos WebRTC "cru".
  - LiveKit Server roda em Go, temos SDKs client prontos para Web (JS/TS), e há LiveKit Cloud como fallback caso o self-host dê problema no início.
  - Resolve: NAT traversal (STUN/TURN embutido), adaptação de bitrate, simulcast, reconexão.

### Banco de dados
- **PostgreSQL** — usuários, grupos, canais, mensagens, salas, membros.
- **Redis** — cache de presença, pub/sub entre nós do backend se escalar horizontalmente (opcional na V1, roda single-node).

### Frontend
- **React + TypeScript** para web (cliente principal).
- **Electron** (não Tauri — **decisão revertida em 22/08/2026, ver seção 14**): o objetivo final é um programa instalável no PC (não só uma página web). Escolhido por preferência direta do usuário (já usou em outro projeto e gostou), não por necessidade técnica — Tauri funcionava, só não era a preferência dele.
- Client SDK oficial `livekit-client` para JS/TS.
- **Auto-update:** o app instalado deve conseguir checar se há uma versão nova publicada no GitHub (Releases) e se atualizar sozinho, sem o usuário precisar baixar/instalar manualmente. **Isso é P10 — só entra depois que call + tela compartilhada estiverem sólidas (P1–P2). Não implementar cedo demais.**

### Infraestrutura
- 1 VPS para começar (2 vCPU / 2–4 GB RAM já atende o grupo): roda Phoenix/Node + Postgres + Redis + LiveKit em containers Docker.
- Domínio próprio com Caddy ou Nginx como reverse proxy + HTTPS automático (Let's Encrypt).
- Docker Compose para orquestrar tudo (backend, LiveKit, Postgres, Redis, proxy).

---

## 4. Arquitetura (visão em camadas)

```
┌─────────────────────────────────────────────────────────┐
│                      Cliente (React)                     │
│  - UI de chat, salas, controles de call                  │
│  - livekit-client SDK (conecta direto ao LiveKit Server)  │
└───────────────┬───────────────────────┬───────────────────┘
                │ WebSocket             │ WebRTC (mídia)
                ▼                       ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   Backend (Phoenix/Node)   │   │      LiveKit Server        │
│  - Auth (JWT)              │   │  - SFU (voz/vídeo/tela)    │
│  - API REST (grupos, salas)│   │  - Gera tokens de acesso   │
│  - WebSocket (chat/presença)│  │  - STUN/TURN embutido      │
│  - Emite token LiveKit      │◄──┤  - Gerenciado via API      │
└───────────────┬────────────┘   └─────────────────────────────┘
                │
                ▼
┌───────────────────────────┐
│   PostgreSQL + Redis        │
│  - users, groups, channels │
│  - messages, calls, members│
└─────────────────────────────┘
```

**Fluxo de uma call:**
1. Usuário clica em "entrar no canal de voz X".
2. Frontend chama o backend (`POST /rooms/:id/join-token`).
3. Backend valida permissão do usuário na sala e **gera um token JWT assinado pelo LiveKit** (usando a API key/secret do LiveKit).
4. Frontend usa esse token para conectar diretamente no LiveKit Server via `livekit-client`.
5. Daí em diante, toda a mídia (áudio/vídeo/tela) trafega entre o cliente e o LiveKit Server — **o backend Phoenix/Node não participa da mídia**, só emitiu o "passe de entrada".
6. Presença ("quem está na call") pode ser sincronizada via webhooks do LiveKit de volta pro backend, ou via Phoenix Presence separadamente.

**Fluxo de compartilhamento de tela:**
- Usa `getDisplayMedia()` do navegador para capturar a tela/janela.
- O stream capturado é publicado como uma track extra no LiveKit (`localParticipant.setScreenShareEnabled(true)` no SDK).
- LiveKit distribui essa track para os demais participantes da sala automaticamente — não precisa de lógica extra no backend.

---

## 5. Modelo de dados (rascunho inicial)

```
users
 - id, username, email, password_hash, avatar_url, created_at

groups (equivalente a "servidor" do Discord)
 - id, name, owner_id, created_at

group_members
 - group_id, user_id, role (owner/admin/member), joined_at

channels
 - id, group_id, name, type (text | voice), created_at

messages
 - id, channel_id, user_id, content, created_at, edited_at

call_sessions
 - id, channel_id, livekit_room_name, started_at, ended_at

call_participants
 - call_session_id, user_id, joined_at, left_at
```

> Este modelo é o mínimo para P0–P5. Cargos/permissões granulares (P7) vão exigir uma tabela `roles`/`permissions` separada depois.

---

## 6. Principais problemas técnicos a resolver (riscos conhecidos)

Ordenados por relevância para a prioridade atual (call + tela compartilhada):

1. **NAT traversal** — resolvido em grande parte pelo LiveKit (STUN embutido), mas TURN próprio pode ser necessário se algum amigo estiver atrás de CGNAT/rede corporativa. Precisamos configurar um servidor TURN (coturn ou o TURN embutido do LiveKit) e testar com todos os membros do grupo em redes diferentes antes de considerar "pronto".
2. **Qualidade adaptativa** — LiveKit já faz simulcast/bitrate adaptativo, mas precisamos testar com upload fraco (rede residencial brasileira) e configurar limites de resolução/bitrate para não travar quem tem internet mais fraca.
3. **Compartilhamento de tela + performance** — capturar tela em resolução alta consome CPU/banda; definir resolução/fps padrão (ex: 1080p30 ou 720p30) como valor sensato por padrão, com opção de ajuste manual.
4. **Reconexão** — perda de rede momentânea (troca de Wi-Fi para 4G) precisa reconectar sem derrubar todo mundo da call; o LiveKit client SDK já tem lógica de reconexão automática, mas precisa ser testada e validada no nosso fluxo.
5. **Autenticação dos tokens LiveKit** — tokens devem ter tempo de expiração curto e ser gerados só depois de validar que o usuário tem permissão na sala, para não vazar acesso.
6. **Gerenciamento de sala "vazia"** — decidir se a call fecha automaticamente quando o último participante sai, e como/quando o `call_session` é marcado como encerrado no banco.
7. **Escala vertical simples primeiro** — não complicar com múltiplos nós/Kubernetes agora; um único VPS decente resolve para o tamanho do grupo. Só revisitar se o grupo crescer muito.

---

## 7. Decisões já tomadas (não reabrir sem motivo forte)

- ✅ Usar LiveKit em vez de WebRTC puro ou Jitsi.
- ✅ Backend em Phoenix (Elixir) ou Node.js — qualquer um resolve, decisão final fica a critério de quem for codar mais.
- ✅ PostgreSQL como banco principal.
- ✅ Prioridade máxima: call de voz + compartilhamento de tela funcionando bem antes de qualquer outra feature.
- ✅ Modelo de "sala" é baseado em canais dentro de grupos (como Discord), não em salas 100% P2P efêmeras.
- ✅ Self-hosted em VPS própria, não depender de serviços pagos de terceiros (exceto LiveKit Cloud como fallback temporário se o self-host de mídia der problema).
- ✅ **Arquitetura multi-servidor:** qualquer amigo do grupo pode hospedar sua própria instância completa e independente (backend + LiveKit + Postgres), rodando o mesmo pacote self-hosted. Não é federação nem failover automático de call em andamento — é redundância manual: se o servidor de uma pessoa está fora do ar, o grupo troca pra outro servidor hospedado por outro amigo. Isso implica que o **cliente (frontend) precisa suportar múltiplos servidores/URLs** (adicionar servidor, trocar entre eles), parecido com a lista de servidores do Discord — cada "servidor" tem sua própria base de usuários/contas (não é conta única compartilhada entre instâncias). Isso afeta principalmente o frontend e o P6 (Grupos/servidores) do roadmap; não muda o modelo de dados atual (cada instância roda seu próprio Postgres isolado).
- ✅ **Backend: Node.js + TypeScript + Express** escolhido (a alternativa que a seção 3 já deixava aceitável). Motivo: ecossistema JS único com o frontend/scripts já existentes (mesma lib `livekit-server-sdk` do `generate-token.js`), mais simples de empacotar tudo num `docker compose up` só. Phoenix/Elixir descartado por ora (poderia ser revisitado, mas não há motivo forte pra trocar agora).
- ✅ **Autenticação simplificada (mudança pós-Etapa 3):** removido cadastro/login com senha. Substituído por `POST /auth/identify` — só um nome, sem senha, sem conta persistente. Token JWT válido por 30 dias (não faz sentido expirar rápido como no login com senha, já que não há como "revalidar"). **Sem checagem de nome duplicado** — se dois amigos entrarem com o mesmo nome ao mesmo tempo, o segundo "rouba" a identidade do primeiro na sala do LiveKit (comportamento padrão do LiveKit); aceitável pro grupo, mas documentado como limitação conhecida.
- ✅ **Postgres removido do projeto (por enquanto).** Sem conta persistente, não há mais nada pra guardar no banco. Removidos: serviço `postgres` do `docker-compose.yml`, `backend/src/db.ts`, `backend/migrations/`, dependências `pg`/`bcryptjs` do backend. **Volta a entrar quando o chat de texto (P4) precisar de histórico de mensagens** — decisão consciente de não manter infraestrutura não usada.
- ✅ **Modelo de dados atual: nenhum.** Não existe mais tabela `users` nem qualquer persistência. `groups`/`channels`/`messages`/etc. (seção 5) continuam sendo só o modelo alvo futuro.
- ✅ **Permissão de sala:** por enquanto, qualquer usuário autenticado pode gerar token pra qualquer nome de sala (sem checagem de grupo/canal/cargo). Isso é uma simplificação deliberada, aceitável pro tamanho do grupo atual — revisitar quando `groups`/`channels`/`roles` (P6/P7) existirem de verdade.
- **Esclarecimento importante:** usuário interpretou o bug de UDP como "o projeto não pode ser Docker" de forma geral — corrigido: o bug é específico do **Docker Desktop no Windows/WSL2** e afeta só o **LiveKit** (mídia/UDP). Backend e Postgres usam HTTP/TCP normal e sempre funcionaram certinho no Docker, inclusive nos testes com o amigo. Numa VPS Linux, o LiveKit também funcionaria normalmente dentro do Docker (sem esse bug). **Decisão:** no Windows, LiveKit roda nativo (fora do Docker) por padrão; Postgres + Backend continuam no Docker.
- **Facilidade de execução no Windows (iteração 2):** `start-windows.ps1` evoluído para baixar o `livekit-server.exe` automaticamente (via GitHub API) se não existir, além de detectar IP do Tailscale e configurar `backend/.env`. Criado `start.bat` como launcher de duplo clique (chama o `.ps1` com `-ExecutionPolicy Bypass`, evitando o bloqueio padrão do Windows pra rodar scripts `.ps1` sem configuração prévia). Fluxo atual pro usuário: só dar duplo clique em `start.bat`.
- **Facilidade de execução (iteração 3):** criados `start-livekit.ps1` + `start-livekit.bat` — versão que inicia SÓ o LiveKit nativo (download automático + IP do Tailscale), sem subir/mexer no Postgres/Backend via Docker. Útil quando o resto já está rodando e só precisa reiniciar o LiveKit. Avisa (mas não força) se o `backend/.env` estiver com uma `LIVEKIT_URL` diferente da que o LiveKit vai usar agora.
- **Bug corrigido:** erro de build TypeScript no `backend/src/middleware.ts` (conversão de tipo `string | JwtPayload` para o tipo esperado sem passar por `unknown` primeiro) — só aparecia ao buildar dentro do Docker (`npm run build` via `tsc`), não seria pego sem essa etapa. Corrigido fazendo o cast passar por `unknown` primeiro.
- ✅ **Frontend: React + TypeScript + Vite** (confirma a seção 3 original). Usa a lib oficial `@livekit/components-react` para a grade de vídeo/participantes (evita reimplementar isso na mão), mas com barra de controles customizada (não o `<VideoConference />` pronto da lib) para manter os ajustes finos de qualidade do compartilhamento de tela (`contentHint: motion`, 30fps, 4Mbps) validados na Etapa 1. Esse frontend é a base que será empacotada com Tauri no P10 — decisão de manter web puro (sem Tauri ainda) nesta fase, só entra quando o resto estiver sólido, conforme já definido na seção 3.
- ✅ **P10 implementado: empacotamento Tauri v2 + auto-update via GitHub Releases.** Projeto Rust em `frontend/src-tauri/`. Chave de assinatura do updater **precisa ser gerada pelo usuário** (`npx tauri signer generate`) e colada em `tauri.conf.json` (`plugins.updater.pubkey`) — placeholder deixado no código. Endpoint do updater (`plugins.updater.endpoints`) também precisa ser trocado pelo link real do repositório GitHub do usuário — placeholder `SEU_USUARIO/SEU_REPOSITORIO` deixado no código. GitHub Actions (`.github/workflows/release.yml`) builda Windows/Mac/Linux e publica ao criar uma tag `vX.Y.Z` — precisa dos secrets `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` configurados no repositório. **Nada disso foi testado de verdade** (ambiente de desenvolvimento não tem Rust/Cargo instalado) — validação real depende do usuário rodar `npm run tauri dev` na própria máquina.
- **Descoberta importante (limitação de navegador, não bug nosso):** acesso a microfone/câmera (`getUserMedia`) só funciona em contexto seguro do navegador (`https://` ou especificamente `http://localhost`). Se a página do frontend for acessada por um IP (ex: via Tailscale, `http://100.x.x.x:5173`), o navegador bloqueia silenciosamente e o erro que aparece é confuso. **Isso invalida a sugestão original de "só quem hospeda roda o frontend, os amigos acessam pelo IP dele"** (`npm run dev:lan`) — cada pessoa precisa rodar o próprio frontend localmente (`npm run dev`, acessando via `localhost`) e só apontar a URL do backend pro host. O backend/LiveKit não têm essa restrição (não usam `getUserMedia` diretamente no navegador do lado servidor). Resolvido definitivamente só quando virar app nativo (Tauri, P10) ou com HTTPS via certificado do Tailscale (`tailscale cert`) — não vale a complexidade agora. Adicionado check proativo no `CallRoom.tsx` (`navigator.mediaDevices`) pra dar erro claro em vez do `TypeError` genérico.

---

## 8. Processo de trabalho (como vamos desenvolver)

- Desenvolvimento **incremental**: uma etapa pequena de cada vez, na ordem do roadmap (seção 2). Não pular pra frente nem tentar entregar várias fases de uma vez.
- Cada etapa concluída é entregue como um **.zip** com o código daquela etapa, pronto pra rodar/testar.
- Este arquivo (`PROJECT_CONTEXT.md`) é atualizado **sempre** que uma decisão relevante for tomada ou mudar — inclusive dentro de uma mesma etapa. Ele deve sempre refletir o estado atual real do projeto.
- Empacotamento final como app instalável (Tauri) e auto-update via GitHub Releases (P10) ficam para o fim — não devem influenciar decisões técnicas nas fases iniciais além de já sabermos que o frontend será React (compatível com Tauri quando chegar a hora).

## 9. Log de etapas entregues

| Etapa | Conteúdo | Status |
|-------|----------|--------|
| 1 | LiveKit self-hosted (docker-compose) + cliente HTML/JS de teste (entrar em call, mute, câmera, compartilhar tela) + script de geração de token | ✅ Entregue e **validado ponta a ponta com um amigo fora da rede** via Tailscale (áudio, mute, câmera e compartilhamento de tela funcionando). Correções ao longo do caminho: portas explícitas em vez de `network_mode: host`; `--node-ip` apontando pro IP Tailscale; porta de mídia correta (UDP mux 7882, não a faixa 50000-50100 que eu tinha colocado errado); regra de firewall do Windows para TCP 7881 + UDP 7882; bug de repasse UDP do Docker Desktop no Windows contornado rodando `livekit-server.exe` nativo; qualidade do compartilhamento de tela ajustada (`contentHint: motion`, 30fps, 4Mbps) pra conteúdo com movimento rápido (jogos). |
| 2 | Backend mínimo (Node.js + TypeScript + Express + Postgres): cadastro (`POST /auth/register`), login (`POST /auth/login`, retorna JWT), geração automática de token LiveKit (`POST /rooms/:roomName/join-token`, autenticado). `docker-compose.yml` unificado sobe Postgres + Backend + LiveKit com um único comando. Cliente de teste (`test-client/index.html`) reescrito com tela de login/cadastro embutida — não precisa mais copiar/colar token manualmente. `start.bat` + `start-windows.ps1`: duplo clique sobe tudo no Windows (Postgres+Backend no Docker, LiveKit nativo com download automático do binário e IP do Tailscale auto-detectado). `start-livekit.bat` separado pra (re)iniciar só o LiveKit. | ✅ Entregue e **validado ponta a ponta pelo usuário** (cadastro, login, geração automática de token, call funcionando com amigo via Tailscale) |
| 3 | Frontend React + TypeScript + Vite (`frontend/`), substituindo o cliente HTML de teste como app "de verdade". Usa `@livekit/components-react` (grade de participantes) + controles customizados próprios (mute, câmera, compartilhar tela com os mesmos ajustes de qualidade da Etapa 1: `contentHint: motion`, 30fps, 4Mbps). Login/cadastro persistido em `localStorage`. `npm run dev:lan` permite amigos acessarem pela rede Tailscale sem instalar Node.js. Adicionado tratamento de erro visível (`onError`/`onDisconnected` na `LiveKitRoom`) — antes, falha de conexão (ex: LiveKit não rodando) mandava o usuário de volta pra tela de escolher sala silenciosamente, sem explicação. | ✅ Entregue e **validado pelo usuário** (causa do bug inicial: `livekit-server.exe` não estava rodando; corrigido tratamento de erro pra próxima vez ficar claro) |
| 3.1 | Simplificação de autenticação: removido cadastro/login com senha, substituído por `POST /auth/identify` (só nome). Postgres removido do projeto (sem uso enquanto não há persistência real). Atualizado backend, frontend React e `test-client/index.html` para o novo fluxo. | ✅ Entregue e **validado pelo usuário** |
| 3.2 | Canal de voz fixado em um único nome (`geral`), removido campo de digitar/escolher sala em ambos os clientes (React e HTML de teste). Endpoint do backend continua genérico (`/rooms/:roomName/join-token`) para flexibilidade futura, mas os dois clientes sempre chamam com `"geral"`. | ✅ Entregue e validado |
| 4 | Chat de texto em tempo real via WebSocket (canal único `geral`), integrado ao layout estilo Discord: sidebar de canais (texto/voz), tela de chamada dedicada (grade de participantes com placeholder pra quem não tem câmera) com opção de mostrar/esconder o chat ao lado, ícones reais via `lucide-react`. | ✅ Entregue e validado |
| 5 | Persistência do histórico do chat via SQLite (`better-sqlite3`), com volume Docker pra sobreviver a rebuild/restart do container. Mantém últimas 500 mensagens no banco, últimas 50 enviadas ao cliente ao conectar. | ✅ Entregue e **validado pelo usuário** |
| 6 | Reconexão automática mais robusta (call não é mais derrubada em erros transitórios — banner "Reconectando..." aparece; chat reconecta sozinho com backoff exponencial). Sons de entrada/saída da call (sintetizados via Web Audio, sem arquivo externo). Indicador visual de quem está falando na sidebar. Painel de configurações pra trocar microfone/câmera/saída de áudio (`SettingsModal.tsx`, via `useMediaDeviceSelect`). | ✅ Entregue |
| 7 | Empacotamento como app instalável via **Tauri v2** (`frontend/src-tauri/`), com **auto-update via GitHub Releases**: `tauri-plugin-updater` + `tauri-plugin-process` (Rust) e checagem automática ao iniciar (`frontend/src/updater.ts`). Workflow do GitHub Actions (`.github/workflows/release.yml`, usando `tauri-action`) builda Windows/Mac/Linux e publica o Release + `latest.json` automaticamente ao criar uma tag `vX.Y.Z`. Ícones placeholder gerados via Pillow (trocar pelo definitivo depois com `npm run tauri icon`). | ✅ Entregue (não testado — exige Rust instalado, que não está disponível no ambiente onde o código foi escrito; primeira validação real depende do usuário) |

## 9.1. Ambiente de desenvolvimento confirmado
- Usuário desenvolve em **Windows** (rodando Docker Desktop). Isso importa para decisões futuras (ex: `network_mode: host` no Docker não funciona no Windows/Mac, só Linux — usar sempre `ports:` explícito nos compose files deste projeto).
- **Rede residencial usa CGNAT / bloqueio de porta** — não é possível abrir portas no roteador de casa para expor o LiveKit local aos amigos. Isso **antecipa a necessidade de VPS** (já estava planejada no item 3 "Infraestrutura", mas agora é bloqueante mesmo para testes com pessoas fora da rede local, não só para produção final). Usuário nunca configurou uma VPS antes — passo a passo básico precisa ser explicado, não assumir familiaridade com SSH/VPS.
- **Decisão final: Tailscale** (não Oracle Cloud, não Cloudflare Tunnel) para testes entre redes diferentes nesta fase. VPN privada gratuita (baseada em WireGuard) que faz os PCs dos amigos se enxergarem diretamente, contornando o CGNAT sem precisar de VPS/domínio/porta aberta. Requisito: cada amigo precisa instalar o Tailscale além do app de chat em si. O `--node-ip` do LiveKit passa a ser o IP do Tailscale de quem está hospedando (formato 100.x.x.x) em vez de IP público/domínio. Isso também viabiliza de forma simples a arquitetura multi-servidor (seção 7): qualquer amigo na mesma tailnet pode rodar o `docker-compose` localmente e ser "o host do dia", bastando avisar o IP Tailscale dele.
  - Nota: Tailscale/VPS continuam sendo soluções para o mesmo problema raiz (CGNAT exige algum mecanismo de NAT traversal/relay). P2P puro sem nenhuma infraestrutura foi descartado (ver decisão acima).
  - Risco conhecido: firewall do Windows pode bloquear conexões de entrada na interface do Tailscale dependendo do perfil de rede — documentado no README como troubleshooting.
  - **Confirmado:** o problema era mesmo bug de repasse UDP do Docker Desktop no Windows/WSL2 — rodando o `livekit-server.exe` nativo (sem Docker) a mídia conectou corretamente. **Decisão pendente:** por ora, testes locais no Windows usam o binário nativo (`RODANDO_SEM_DOCKER.md`); revisitar se vale a pena investigar o fix do Docker Desktop mais tarde, ou manter nativo/Linux (VPS) como padrão daqui pra frente (VPS já seria Linux, então esse bug específico do Windows não se repete lá).
  - **Ajuste de qualidade de compartilhamento de tela:** configuração inicial não especificava fps nem contentHint, causando percepção de lag em conteúdo com movimento rápido (ex: jogos). Corrigido no `test-client/index.html`: `contentHint: "motion"`, `frameRate: 30`, `maxBitrate: 4_000_000`, `simulcast: false` (grupo pequeno não precisa de múltiplas camadas). Documentado no README como ajustar caso ainda trave (reduzir bitrate/resolução) ou fique borrado (aumentar bitrate).

---

## 10. Glossário rápido

- **SFU (Selective Forwarding Unit):** servidor que recebe os streams de áudio/vídeo de cada participante e redistribui para os outros, sem misturar (diferente de um MCU, que mixa tudo).
- **STUN:** protocolo que ajuda dois peers a descobrirem seu IP público/porta para tentar conexão direta.
- **TURN:** servidor que retransmite mídia quando a conexão direta P2P não é possível (consome banda do servidor).
- **Simulcast:** enviar o mesmo vídeo em múltiplas qualidades simultâneas, para que cada participante receba a resolução compatível com sua banda.
- **Token LiveKit (JWT):** credencial de curta duração que autoriza um cliente a entrar numa sala específica do LiveKit, gerada pelo backend.

---

## 11. Visão de produto esclarecida (uso real do usuário)

- **Uso fechado, só os amigos do usuário** — não precisa de fluxo de cadastro tipo "criar conta" (usuário/senha com hash, etc). Basta **se identificar** (ex: escolher um nome ao entrar, sem senha). O registro/login completo construído na Etapa 2 é mais robusto do que o necessário para esse caso de uso. **Simplificar isso é trabalho futuro** — decisão consciente de manter como está até a base (call + tela) estar bem estável e o frontend React validado, pra não misturar mudanças de arquitetura com validação de features já prontas.
- **Estrutura fixa e simples: um canal de texto + um canal de voz, só isso.** Não é o modelo "grupos/múltiplos canais" do Discord (P6 do roadmap) — pelo menos não nesta fase, e talvez nunca, dado o tamanho do grupo. Isso simplifica bastante o que P4 (chat) e P6 (grupos/canais) precisam ser: não precisa de tabelas `channels`/`groups`, só uma sala de voz fixa (já existe) + um chat de texto fixo (ainda não implementado).
- **Confirmado: app instalável (Tauri), não site.** Já era a decisão da seção 3 (P10) — usuário reforçou que essa é a forma final de uso, não uma opção entre outras. O frontend React (Etapa 3) é web puro de propósito, servindo de base pro empacotamento Tauri mais pra frente — não trocar de framework antes disso.
- **Ordem confirmada pelo usuário:** base estável (call de voz + compartilhamento de tela, já validados nas Etapas 1-2) é prioridade sobre essas simplificações/novas features. Próximas mudanças de arquitetura (auth simples, chat de texto único) só depois que o frontend React (Etapa 3) estiver testado e validado como os anteriores.

---

## 12. Próximos passos imediatos

1. ~~Subir LiveKit self-hosted localmente (docker) e testar uma call de 2 pessoas entre navegadores diferentes.~~ ✅ Etapa 1
2. ~~Testar `getDisplayMedia` + publicação da track de tela no LiveKit.~~ ✅ Etapa 1 (incluído no cliente de teste)
3. ~~Montar o backend mínimo (Node) só com: cadastro/login + endpoint que gera token do LiveKit.~~ ✅ Etapa 2
4. ~~Montar frontend React mínimo com botão "entrar na call" + área de compartilhamento de tela (substitui o cliente HTML de teste).~~ ✅ Etapa 3
5. ~~Simplificar autenticação (só nome, sem conta) + canal único de voz/texto.~~ ✅ Etapa 3.1/3.2
6. ~~Chat de texto em tempo real + persistência (SQLite) + reconexão automática + layout estilo Discord.~~ ✅ Etapas 4-6
7. ~~Empacotar com Tauri v2 + auto-update via GitHub Releases (estrutura inicial).~~ ✅ Etapa 7 (não testado ainda pelo usuário — ver seção 13, isso está sendo revisado/expandido)
8. **(atual, ver seção 13)** Simplificar drasticamente a experiência de hospedar/rodar o app pra usuário final não-técnico, e desacoplar a rede do Tailscale especificamente.

## 13. Nova fase: hospedagem "um clique" + abstração de rede (planejado, não implementado ainda)

Visão trazida pelo usuário em 21/08/2026, registrada aqui antes de qualquer implementação — a orientação explícita foi **analisar a estrutura atual primeiro, propor a menor mudança necessária, não reescrever o que já funciona**.

### Problema a resolver
Hoje, hospedar o servidor exige que o usuário lide com: Docker, containers, LiveKit, arquivos `.bat`, PowerShell, Node.js, npm, frontend em modo dev (`npm run dev`, acessar `localhost:5173`). Isso é aceitável pra desenvolvimento, mas não pra um usuário final sem conhecimento técnico.

### Experiência desejada (alvo)
Um único `DiscordPrivado.exe` (o app Tauri já existente). Ao abrir, tela inicial com **"Hospedar servidor"** / **"Entrar em servidor"**. Escolhendo "Hospedar", o próprio app deve, sozinho, internamente:
1. Detectar rede disponível (local, Tailscale, Radmin VPN, etc.)
2. Selecionar o IP apropriado
3. Iniciar o backend (Node/Express)
4. Iniciar o LiveKit Server com a configuração/`--node-ip` corretos
5. Verificar se backend e LiveKit estão respondendo (health check)
6. Mostrar status ("Backend ✓, LiveKit ✓, Rede ✓ [tipo detectado], IP: x.x.x.x") com botão "Copiar endereço do servidor"
7. Abrir a própria interface do Discord Privado dentro do app Tauri (sem navegador, sem `localhost:5173` visível ao usuário)

O usuário final não deve precisar saber que Node.js, npm, Docker, LiveKit, PowerShell, `.bat`, portas ou configuração de backend existem.

### Arquitetura-alvo (dentro do próprio Tauri, como "sidecars"/processos gerenciados pelo app, não containers Docker pro usuário final)
```
DiscordPrivado.exe
├── Interface React (compilada/embutida no Tauri, não npm run dev)
├── Tauri (processo principal)
├── Backend empacotado (Node compilado, ou binário via pkg/similar — a analisar)
├── LiveKit Server (livekit-server.exe já usado, empacotado/distribuído junto)
└── Dados locais (SQLite)
```
Processos auxiliares (backend, LiveKit) podem existir internamente, mas sem exigir interação manual do usuário (nada de abrir PowerShell, rodar `.bat`).

### Docker
Continua OK pra **desenvolvimento** (pode seguir sendo usado nessa fase). Mas o **usuário final no Windows não deve precisar de Docker Desktop nem Node.js/npm instalados** — o app final deve rodar/empacotar tudo sozinho.

### Desacoplar de Tailscale especificamente
Decisão importante: **o LiveKit e o app não devem ter lógica hardcoded de "é Tailscale"**. A rede deve virar uma camada abstrata:
```
NetworkProvider
├── TailscaleProvider
├── RadminProvider
├── LocalNetworkProvider
└── AutoProvider
```
O app deve conseguir detectar interfaces de rede disponíveis no Windows (Tailscale, Radmin VPN, Ethernet, Wi-Fi, etc.) e os IPs correspondentes, escolher automaticamente uma interface apropriada (ou permitir escolha manual em configurações avançadas), e usar esse IP pra configurar o `--node-ip` do LiveKit e a URL que o frontend usa.

**Ordem de implementação dos provedores:** 1) rede local, 2) Tailscale, 3) Radmin VPN. Outros entram depois. Implementação deve ser modular o bastante pra adicionar novos provedores sem reescrever o resto.

**Importante (ressalva do usuário):** não presumir que qualquer VPN é automaticamente compatível — primeiro analisar tecnicamente como detectar interfaces/endereços no Windows e como isso se traduz em configuração válida pro LiveKit, antes de generalizar.

### Explicitamente FORA de escopo por enquanto (não implementar ainda)
- Sistema de descoberta global de servidores / servidor central
- VPS, Cloudflare Tunnel, domínio próprio
- Federação entre instâncias
- Kubernetes
- Múltiplos hosts simultâneos
- Sistema de autenticação mais complexo
- Novas funcionalidades do Discord (isso é sobre simplificar execução, não adicionar feature)

### Processo combinado antes de implementar
O usuário pediu explicitamente, **antes de escrever qualquer código**, uma análise da estrutura atual cobrindo:
1. Como o backend é iniciado hoje (`docker-compose.yml`, `start.bat`/`start-windows.ps1`)
2. Como o LiveKit é iniciado hoje (nativo no Windows via `.exe`, ver `start-livekit.ps1`/`RODANDO_SEM_DOCKER.md`)
3. Como o Tauri está configurado hoje (`frontend/src-tauri/`)
4. Quais scripts `.bat`/`.ps1` já existem e o que cada um faz
5. Como o frontend hoje descobre a URL do backend/LiveKit (hoje: campo manual "URL do backend" na tela de login + `LIVEKIT_URL` no `backend/.env`, devolvido pelo endpoint `/rooms/:roomName/join-token`)
6. Como o IP do Tailscale é detectado hoje (`tailscale ip -4` chamado dentro dos scripts PowerShell)
7. O que já pode ser reaproveitado sem reescrever

**Primeira entrega esperada desta fase:** transformar o fluxo em `DiscordPrivado.exe → clica "Hospedar" → backend inicia sozinho → LiveKit inicia sozinho → frontend abre dentro do próprio Tauri` — sem múltiplos provedores de rede ainda implementados de verdade, só a base modular preparada (começando por rede local + Tailscale + Radmin).

**Status:** registrado, análise da estrutura atual **feita** (ver abaixo). Primeira sub-etapa de implementação em andamento: backend como executável standalone.

### Análise da estrutura atual (feita em 21/08/2026)

1. **Backend hoje:** `docker-compose.yml` builda `backend/Dockerfile` e sobe via `docker compose up -d --build backend`.
2. **LiveKit hoje:** no Windows, roda nativo (`livekit-server.exe`, baixado automaticamente pelo `start-windows.ps1` na primeira vez), `--dev --bind 0.0.0.0 --node-ip=<IP detectado>`.
3. **Tauri hoje:** já configurado corretamente pra embutir o frontend compilado (`devUrl` + `frontendDist` no `tauri.conf.json`) — o `.exe` final do Tauri **já não vai depender de `npm run dev`**, isso já estava certo desde a Etapa 7.
4. **Scripts existentes:** `start.bat`/`start-windows.ps1` (backend Docker + LiveKit nativo + detecção de IP Tailscale + atualização do `.env`), `start-livekit.bat`/`start-livekit.ps1` (só reinicia o LiveKit, com opção de corrigir o `.env`/reiniciar o backend automaticamente).
5. **Como o frontend descobre a URL hoje:** campo manual "URL do backend" na tela de login (salvo em `localStorage`); a URL do LiveKit vem embutida na resposta do `/rooms/:roomName/join-token`.
6. **Detecção do IP Tailscale hoje:** só via `tailscale ip -4` chamado dentro dos scripts PowerShell — **hardcoded pra Tailscale especificamente**, precisa virar abstração de provedor de rede.
7. **O que dá pra reaproveitar:** quase tudo. A peça que falta é o Tauri iniciar backend+LiveKit sozinho como processos-filho (mecanismo de "sidecar" do Tauri) em vez do usuário rodar os scripts na mão.

### Sub-etapa 1 em andamento: backend como executável standalone

**Decisão:** trocado `better-sqlite3` (módulo nativo, exige compilar com Python/C++, não empacota bem num único `.exe`) por **`node:sqlite`**, embutido no Node.js desde a v22 (confirmado funcionando sem flag especial no Node 22.22, só emite aviso de "experimental"). API compatível com o código existente (`chat.ts` não precisou mudar nada, testado diretamente). Isso remove a necessidade de `python3`/`make`/`g++` no `Dockerfile` também (simplificado).

**Build do executável:** usando o recurso oficial "Single Executable Applications" (SEA) do Node.js — não usamos `pkg` (sem manutenção). Pipeline: `tsc` → `esbuild` (empacota tudo num arquivo `.cjs` só) → `node --experimental-sea-config` (gera blob) → copia `node.exe` → `postject` (injeta o blob no exe). Script: `backend/build-exe.ps1`, rodado via `npm run build:exe`.

**⚠️ Não testado de verdade** — só a parte do `node:sqlite` foi validada diretamente (rodando node aqui). O pipeline completo do `esbuild`/`postject`/SEA não pôde ser testado (ambiente sem acesso à internet pra instalar esses pacotes). Validação real depende do usuário rodar `npm run build:exe`.

**Próximas sub-etapas (ainda não implementadas):** empacotar `discord-privado-backend.exe` + `livekit-server.exe` como "sidecars" do Tauri (`tauri-plugin-shell`, `bundle.externalBin`); tela de "Hospedar servidor" dentro do app que inicia os dois processos e faz health-check; abstração `NetworkProvider` (Tailscale/Radmin/rede local/auto).

### Sub-etapa 2 em andamento: backend como sidecar do Tauri + tela "Hospedar/Entrar"

**Implementado:** `tauri-plugin-shell` adicionado (Rust + JS); `bundle.externalBin` no `tauri.conf.json` apontando pro sidecar `binaries/discord-privado-backend`; permissão `shell:allow-execute` escopada só pra esse sidecar nas capabilities. `frontend/src/host.ts` inicia o sidecar e faz polling no `/health` até responder. Nova `StartScreen.tsx`: "Hospedar servidor" (inicia o backend local automaticamente, só funciona dentro do app Tauri — detecta via `__TAURI_INTERNALS__`) ou "Entrar em servidor" (cai no fluxo antigo, URL manual). Script `frontend/copy-backend-sidecar.ps1` copia e renomeia o `.exe` gerado pelo `backend/build-exe.ps1` pra dentro de `src-tauri/binaries/` com o "target triple" que o Tauri exige pro nome do sidecar.

**Deliberadamente fora desta sub-etapa (próxima):** LiveKit **ainda não** é iniciado pelo "Hospedar servidor" — só o backend. "Hospedar" hoje sobe o backend e leva pro login com a URL pré-preenchida; o LiveKit continua precisando ser iniciado à parte (`start-livekit.bat`) até a próxima sub-etapa. Abstração `NetworkProvider` (Tailscale/Radmin/local) também não começou — hoje "Hospedar" só usa `localhost`, sem detecção de rede pra outros PCs ainda.

**⚠️ Não testado de verdade** (schema exato de permissions do `tauri-plugin-shell` v2 pode precisar de ajuste — escrito com base no conhecimento até jan/2026, mas o Tauri v2 shell/capabilities é uma área que muda; se der erro de permissão negada ao spawnar o sidecar, é o primeiro lugar a investigar). **Erro real encontrado e corrigido:** a permissão certa é `shell:allow-spawn` (não `shell:allow-execute`, que também foi mantida por precaução) — confirmado via mensagem de erro real do usuário.

### Sub-etapa 3 em andamento: detecção de rede (início do `NetworkProvider`)

**Implementado:** comando Rust `list_network_interfaces` (usa a crate `if-addrs`) expõe as interfaces de rede IPv4 não-loopback da máquina pro frontend via `invoke()`. `frontend/src/network.ts` classifica cada interface por heurística de nome/faixa de IP (Tailscale = nome contém "tailscale" ou faixa `100.64.0.0/10`; Radmin VPN = nome contém "radmin" ou faixa `26.0.0.0/8`; Rede local = `192.168.x.x`/`10.x.x.x`/`172.16-31.x.x`) e ordena por prioridade pra sugerir a melhor automaticamente. `StartScreen.tsx` agora tem uma etapa intermediária "qual rede usar" antes de hospedar, com essa sugestão pré-selecionada mas todas as opções visíveis pra escolha manual. O IP escolhido é passado como `LIVEKIT_URL` (env var) pro backend sidecar.

**Isso é uma heurística simples, não o `NetworkProvider` plugável de verdade** descrito na visão original (seção 13) — não tem classes `TailscaleProvider`/`RadminProvider` separadas ainda, é uma função de classificação única. Suficiente pro objetivo imediato (deixar o usuário escolher/confirmar a rede), mas se mais provedores precisarem de lógica específica (não só heurística de IP), vale revisitar a abstração de verdade.

**Ainda não faz:** iniciar o LiveKit automaticamente com o `--node-ip` correspondente ao IP escolhido — isso continua manual (`start-livekit.bat`) por enquanto. A tela já avisa isso ao usuário explicitamente após hospedar. Essa é a próxima sub-etapa natural (LiveKit também virar sidecar, usando o IP já escolhido nesta tela).

**⚠️ Não testado.**

### Sub-etapa 4: LiveKit também virou sidecar do Tauri

**Implementado:** `livekit-server.exe` agora também roda como sidecar (`binaries/livekit-server`), iniciado automaticamente por "Hospedar servidor" com `--node-ip` igual ao IP escolhido na tela de rede (sub-etapa 3). Ordem: LiveKit inicia primeiro, health-check na raiz (`http://localhost:7880`, responde texto "OK"), depois o backend (que recebe o `LIVEKIT_URL` já apontando pro IP certo). Script `frontend/copy-livekit-sidecar.ps1`/`.bat` copia o `livekit-server.exe` (baixado na raiz do projeto pelos scripts antigos) pra `src-tauri/binaries/` com o nome que o Tauri exige. Permissões `shell:allow-spawn`/`shell:allow-execute` das capabilities ampliadas pra cobrir os dois sidecars.

**Com isso, "Hospedar servidor" agora deveria** iniciar backend + LiveKit sozinho, de ponta a ponta, sem nenhum script manual — esse era o objetivo da "primeira entrega" descrita na seção 13 original. Falta só confirmar na prática (próximo teste do usuário).

**Bug real já encontrado e corrigido nesse processo:** o backend sidecar não tinha acesso a nenhuma variável de ambiente (sem `.env` do lado, diferente do modo Docker) — `JWT_SECRET` undefined quebrava a assinatura do JWT com erro 500. Corrigido com um `DEFAULT_BACKEND_ENV` fixo no `host.ts` (mesma chave JWT pra todo mundo que hospedar — simplificação conhecida, ok pro estágio atual, revisitar se algum dia isso rodar em rede pouco confiável).

**⚠️ Não testado ainda.**

### Melhorias de UI/mídia pós-instalador (22/08/2026)

- ✅ **Focar/maximizar participante:** clicar num vídeo/tela compartilhada na tela de chamada faz ele ocupar a tela toda, com os outros numa faixa (usa os componentes prontos `FocusLayoutContainer`/`FocusLayout`/`CarouselLayout` da própria `@livekit/components-react`, não construído do zero). Botão "Voltar pra grade" pra desfazer. `ParticipantGrid.tsx`.
- ✅ **Volume individual por participante:** slider por pessoa na lista de participantes da sidebar (`VoiceParticipants.tsx`), usando `RemoteAudioTrack.setVolume()` da própria LiveKit. Preferência salva por pessoa no `localStorage` (`voiceVolume:<identity>`), reaplicada automaticamente quando a track dela existir. Só afeta o que você ouve, não o volume de ninguém pros outros.
- ✅ **Áudio do sistema ao compartilhar tela:** adicionado `audio: true` + `systemAudio: "include"` nas opções de captura (`VoiceUserBar.tsx`). Funciona quando a pessoa compartilha "Toda a tela" ou uma aba no Chrome/Edge — compartilhar só uma janela específica pode não trazer áudio (limitação do próprio navegador, não do nosso código).
- ❌ **Volume/ganho do PRÓPRIO microfone (não implementado):** pedido pelo usuário junto com o volume dos outros, mas decidido **adiar** — exigiria substituir o pipeline de publicação do microfone por um customizado (Web Audio GainNode + publishTrack manual em vez do `setMicrophoneEnabled` de conveniência da LiveKit), o que arriscava quebrar o mute/desmute que já funciona bem. Revisitar como etapa própria, isolada, se for realmente necessário.
- ✅ **RESOLVIDO com a migração pro Electron (confirmado pelo usuário em produção):** ao compartilhar tela, o WebView2 (Chromium por baixo, no Tauri) mostrava uma barra/aviso de "compartilhando" — a causa era usar `getDisplayMedia()` puro do navegador, que aciona esse aviso de segurança do motor do navegador. No Electron, como interceptamos a captura via `desktopCapturer` (processo principal) + seletor próprio (`ScreenSharePicker.tsx`) em vez do fluxo padrão de `getDisplayMedia`, o Windows não identifica isso como "o navegador pedindo pra gravar" — **a barra não aparece mais**. Não precisou de captura nativa em Rust como se cogitou antes; a arquitetura de sidecar do Electron já resolveu isso como efeito colateral bem-vindo.

---

## 14. Migração Tauri → Electron (22/08/2026)

**Todo o conteúdo sobre Tauri nas seções 13/sub-etapas acima (`src-tauri/`, `tauri.conf.json`, `tauri-plugin-shell`, `tauri-plugin-updater`, sidecars com nome de target-triple, permissões `shell:allow-spawn`) está SUPERADO — mantido só como histórico de decisões/bugs já resolvidos (ex: o bug real de `JWT_SECRET` undefined no sidecar continua válido conceitualmente, só mudou de mecanismo).**

**Motivo da troca:** preferência direta do usuário (já usou Electron em outro projeto e gostou), não uma limitação técnica do Tauri — o Tauri estava funcionando (backend sidecar + LiveKit sidecar + detecção de rede, tudo validado end-to-end pelo usuário antes da troca). Esclarecido explicitamente: trocar pra Electron **não resolve** a barra de "compartilhando tela" do Windows (ambos usam Chromium por baixo — WebView2 no caso do Tauri, Chromium embutido no caso do Electron; o `getDisplayMedia` se comporta igual nos dois).

### O que mudou

- **Removido:** `frontend/src-tauri/` inteiro (projeto Rust, Cargo.toml, tauri.conf.json, capabilities, ícones — ícones foram copiados pra `frontend/build-icons/` antes de apagar). Scripts `copy-backend-sidecar.*`/`copy-livekit-sidecar.*` (não precisam mais — Electron não exige renomear `.exe` com target-triple).
- **Adicionado:**
  - `frontend/electron/main.cjs` — processo principal: cria a janela, spawna backend/LiveKit via `child_process.spawn()` (equivalente ao sidecar do Tauri, mas usando Node puro — sem sistema de permissões/capabilities pra configurar), expõe handlers IPC (`ipcMain.handle`) pra: listar interfaces de rede (`os.networkInterfaces()` nativo do Node — **mais simples que o Tauri**, não precisou de crate Rust nenhuma tipo `if-addrs`), iniciar/parar backend, iniciar/parar LiveKit. Auto-update via `electron-updater` (`autoUpdater.checkForUpdatesAndNotify()`) rodando automaticamente ao abrir — não precisa mais de chamada explícita no frontend nem de gerar/colar chave pública manualmente como no Tauri (`tauri-plugin-updater` exigia isso).
  - `frontend/electron/preload.cjs` — expõe `window.electronAPI` pro React via `contextBridge` (equivalente ao que `@tauri-apps/api` fazia).
  - `frontend/prepare-resources.ps1`/`.bat` — copia os `.exe` (backend + LiveKit) pra `frontend/resources/`, **sem precisar renomear** (diferente do Tauri, que exigia o nome incluir o target-triple tipo `-x86_64-pc-windows-msvc.exe`).
  - `package.json` do frontend: removido tudo de `@tauri-apps/*`; adicionado `electron`, `electron-builder`, `electron-updater`, `concurrently`, `wait-on`. Scripts novos: `electron:dev` (roda Vite + Electron juntos), `electron:build` (build de produção + gera instalador via `electron-builder`, saída em `frontend/release/` — não em `dist/`, que já é usado pelo build do Vite).
  - `.github/workflows/release.yml` reescrito pra `electron-builder` em vez de `tauri-action`. **Escopo reduzido pra Windows apenas** por enquanto (o pipeline de build do backend `.exe` via `build-exe.ps1` é PowerShell-específico; Mac/Linux exigiriam adaptar pra bash — não feito, ficou mais simples que a versão Tauri que tentava as 3 plataformas de uma vez).
- **Arquivos do frontend atualizados (mesma lógica, API diferente):** `host.ts`, `network.ts`, `App.tsx`, `StartScreen.tsx` — `isEnvTauri()` virou `isEnvElectron()` (checa `window.electronAPI` em vez de `window.__TAURI_INTERNALS__`). `updater.ts` **removido** — não precisa mais de lógica no lado do frontend, o `electron-updater` já cuida disso inteiramente no processo principal.
- **Mantido sem nenhuma mudança:** todo o resto — React/Vite, backend Node/Express, `node:sqlite`, LiveKit, WebSocket do chat, layout estilo Discord, volume por participante, foco/maximizar, etc. A troca foi só na "casca" de empacotamento.

### Status

**⚠️ Não testado ainda** — trocado às pressas a pedido do usuário, sem acesso à internet pra instalar `electron`/`electron-builder` e validar. Próximo passo do usuário: `cd frontend && npm install && npm run electron:dev`.

### Correções pós-migração (22/08/2026, mesmo dia)

- **Bug real encontrado e corrigido:** `useSystemPicker: true` no `setDisplayMediaRequestHandler` não funcionou na prática — o app pegava a primeira tela (`sources[0]`) sem nunca perguntar nada ao usuário (compartilhamento "funcionava" tecnicamente, mas sem escolha). Substituído por um **seletor customizado nosso**: `ScreenSharePicker.tsx` (grid de miniaturas via `desktopCapturer.getSources()`, exposto por IPC) — usuário escolhe explicitamente, ID escolhido guardado no processo principal (`pendingScreenShareSourceId`) e usado no `setDisplayMediaRequestHandler` na hora H.
- **Adicionado:** mute individual do **áudio da tela compartilhada** por participante (`VoiceParticipants.tsx`), separado do volume do microfone — usa `RemoteAudioTrack.setVolume()` na track de `Track.Source.ScreenShareAudio`, preferência salva em `localStorage`.
- **Bug real encontrado e corrigido:** sessão (login + "estar hospedando") persistia no `localStorage` e, ao reabrir o app, pulava direto pra tela de canais **mesmo sem o backend/LiveKit estarem rodando de novo** (processos filho não sobrevivem entre uma abertura e outra do Electron). Corrigido: no Electron, `loadSession()` sempre retorna `null` — o app sempre recomeça pela tela "Hospedar/Entrar". No navegador (modo antigo, backend externo via Docker), o comportamento de lembrar sessão continua igual.
- **Bug real encontrado e corrigido (não relacionado, achado ao revisar):** classe CSS `.secondary-btn` era usada no `SettingsModal.tsx` desde a Etapa 6 mas **nunca existia no `styles.css`** — botão "Trocar de nome/servidor" ficava sem estilo nenhum. Adicionado agora.
- **⚠️ Ainda não testado** (mesma limitação de ambiente sem internet/Electron instalado).

### Correções de build/empacotamento (22/08/2026)

- **Bug corrigido:** `updater.ts` antigo (do Tauri) esquecido no projeto do usuário depois da migração — apagar manualmente (`Remove-Item frontend\src\updater.ts`), já não existe do lado do código atual.
- **Bug corrigido:** `electron-builder` quebrava (`Cannot read properties of null (reading 'provider')`) ao gerar metadados de auto-update sem conseguir detectar o repositório Git. Corrigido adicionando campo `"repository"` no `package.json` (usuário deve trocar `SEU_USUARIO_GITHUB` pelo real). `--publish never` sozinho não bastava — o `electron-builder` tenta montar os metadados mesmo sem publicar de verdade.
- **Bug corrigido (tela branca após instalar):** Vite gera caminhos absolutos nos assets do build (`/assets/x.js`), que quebram quando o Electron carrega o `index.html` via `file://`. Corrigido com `base: "./"` no `vite.config.ts`.
- **Bug real de produção corrigido:** slider de volume por participante permitia até 200% (valor `2`), mas `HTMLMediaElement.volume` nativo do navegador só aceita `0`-`1` — passar `2` lançava `IndexSizeError` **não capturado**, derrubando a conexão inteira (tela cinza pro amigo que acabara de entrar). Corrigido: slider limitado a 0-1, com clamp defensivo em `getStoredVolume`/`handleVolumeChange` pra nunca deixar passar valor inválido (inclusive protegendo contra valores antigos já salvos no `localStorage` de testes anteriores). **Validado funcionando pelo usuário.**

### Mute individual por participante com indicador visual (22/08/2026)

- ✅ Criado `frontend/src/localAudioPrefs.ts` — estado compartilhado (via `useSyncExternalStore`) de volume/mute "só pra mim" por participante, usado tanto na sidebar (`VoiceParticipants.tsx`) quanto na grade de vídeo (`ParticipantGrid.tsx`), pra ficarem sincronizados.
- ✅ Botão de mutar dedicado (ícone `Mic`/`MicOff`) por participante na sidebar, separado do slider de volume (antes só dava pra "mutar" arrastando o slider até 0, sem controle explícito).
- ✅ Indicador visual de mutado: ícone de microfone cortado aparece (1) do lado do nome na sidebar, com a linha inteira meio apagada (`opacity: 0.7`), e (2) como uma bolinha vermelha sobre o vídeo/avatar da pessoa na grade de chamada e na visão em foco.
- **⚠️ Não testado ainda** (mesma limitação de ambiente).

### Correção: mute do áudio da tela compartilhada não atualizava visualmente

- **Bug real corrigido (crash em produção):** `micTrack.setVolume is not a function` — no refactor pra estado compartilhado, a checagem `instanceof RemoteAudioTrack` (que já existia antes) foi perdida sem querer. O próprio microfone do usuário é um `LocalAudioTrack` (sem `setVolume`), diferente do de outros participantes (`RemoteAudioTrack`, que tem). Sem essa checagem, a call quebrava assim que conectava. **Corrigido e validado pelo usuário.**
- **Bug corrigido:** o mute de áudio da tela compartilhada (separado do mute de voz — pedido do usuário: "quero ver o jogo de alguém sem ouvir o jogo dele, mas continuar ouvindo a voz dela") já existia, mas o ícone do botão não atualizava visualmente ao clicar (o mute funcionava por trás, mas sem feedback visual imediato) — a função lia direto do `localStorage` sem passar pelo sistema de notificação reativa (`useSyncExternalStore`). Movido pra dentro de `localAudioPrefs.ts` (`isScreenAudioMuted`/`toggleScreenAudioMute`), junto com o resto do estado de áudio compartilhado — agora atualiza corretamente em tempo real, tanto na sidebar quanto na grade de vídeo.
- ✅ `ParticipantGrid.tsx`: indicador de mutado agora é específico por tipo de tela — avatar/câmera mostra se a VOZ está mutada; tela compartilhada mostra se o ÁUDIO DA TELA está mutado (ícones diferentes: `MicOff` vs `VolumeX`).

### P9: Notificações (22/08/2026)

- ✅ `frontend/src/notifications.ts` — usa a Web Notification API (funciona nativa no Electron, mostra notificação real do Windows). Só notifica se a janela **não estiver em foco** (`document.hasFocus()`), evitando spam enquanto a pessoa já está olhando o app. Clicar na notificação foca a janela de volta (IPC `focus-window` no `main.cjs`/`preload.cjs`).
- ✅ Notificação de **mensagem nova** no chat (`ChatPanel.tsx`) — só para mensagens de outras pessoas, não das próprias.
- ✅ Notificação de **alguém entrou no canal de voz** (`VoiceSoundEffects.tsx`, junto com o som que já existia).
- ✅ Permissão de notificação pedida ao entrar no `Workspace` (pós-login), não na tela de login — contexto mais lógico pro navegador/Electron perguntar.
- **⚠️ Não testado ainda.**

### Ajustes de UX na call (22/08/2026)

- ✅ **Ver quem está na call sem estar nela:** endpoint novo `GET /rooms/:roomName/participants` no backend (`RoomServiceClient` da `livekit-server-sdk` — API de servidor, não a de cliente/`AccessToken`), consulta quem está na sala no LiveKit sem precisar entrar de verdade. `VoiceChannelPreview.tsx` (novo) faz polling nesse endpoint a cada 4s e mostra os nomes na sidebar quando você **não** está na call — troca automaticamente pro `VoiceParticipants.tsx` (com controles de verdade, tempo real via LiveKit) assim que você entra.
- ✅ **Mute de áudio da tela movido pra cima da própria transmissão:** antes era um botão na lista de participantes (sidebar); agora é um botão circular sobre a própria tela compartilhada (`ScreenAudioButton` em `ParticipantGrid.tsx`), tanto na grade quanto na visão em foco — mais intuitivo, já que é o áudio *daquela transmissão*, não da pessoa.
- ✅ **Volume por pessoa agora é via clique direito:** o slider que ficava sempre visível na sidebar virou um menu de contexto (botão direito no participante) com mutar + slider de volume — lista de participantes ficou mais limpa, só com indicador visual de quem está mutado (ícone + linha meio apagada).
- **⚠️ Nenhuma dessas três foi testada ainda.**

### P5 — Presença geral, fora da call (22/08/2026)

**Mudança de arquitetura necessária primeiro:** a conexão WebSocket do chat vivia dentro do `ChatPanel.tsx`, que só fica montado quando você está *vendo* o chat (cai quando você entra na call e esconde o chat). Isso faria presença "piscar" errado. Criado `frontend/src/ChatConnectionContext.tsx` — a conexão agora vive no nível do `Workspace.tsx` (envolve tudo, inclusive quando dentro da `LiveKitRoom`), sobrevivendo independente de qual tela você está vendo. `ChatPanel.tsx` virou consumidor simples desse contexto (`useChatConnection()`) em vez de gerenciar a própria conexão — `MainContent.tsx` e `CallView.tsx` não precisam mais passar `backendUrl`/`authToken` pra ele.

**Backend (`chat.ts`):** novo `Map<identity, Set<WebSocket>>` rastreando quem está conectado (várias abas da mesma pessoa contam como uma só — só sai da lista quando a última conexão fecha). Toda vez que alguém conecta/desconecta, transmite `{type: "presence", online: [...]}` pra todo mundo.

**Frontend:** `ChannelSidebar.tsx` ganhou uma seção "Online — N" (novo componente `OnlineMembers`, usa `useChatConnection()`), mostrando todo mundo com o app aberto e conectado no chat — independente de estar na call de voz ou não.

**⚠️ Não testado ainda.**

---

*Última atualização: P5 — presença geral fora da call (seção acima), 22/08/2026. Atualizar este arquivo conforme decisões mudarem.*
