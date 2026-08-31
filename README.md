# Discord Privado

Um app de chat + chamada de voz/vídeo + compartilhamento de tela, do
jeitinho do Discord, mas privado — feito pra um grupo pequeno de amigos
rodar no próprio PC de alguém, sem depender de servidor de terceiros.

Se você só quer **usar** o app (não mexer no código), este é o guia certo.
Se você é dev e quer rodar o projeto a partir do código-fonte, veja
[`DESENVOLVIMENTO.md`](./DESENVOLVIMENTO.md).

---

## O que o app faz

- 💬 Chat de texto em tempo real (canal `#geral`)
- 🎙️ Canal de voz com mute/desmute e indicador de quem está falando
- 📹 Câmera (liga/desliga a qualquer momento)
- 🖥️ Compartilhamento de tela (com áudio do sistema, ex: som de jogo/vídeo)
- 🔊 Volume individual por pessoa e mute individual da voz ou do áudio da
  tela de cada um (clique direito na pessoa)
- 🔔 Notificações do Windows (mensagem nova, alguém entrou na call)
- 👥 Lista de quem está online, à direita, mesmo sem estar na call
- 🔄 Atualização automática — quando sai uma versão nova, o app se
  atualiza sozinho

Não tem cadastro nem senha: você só digita um nome pra entrar.

---

## Instalando

1. Vá até a página de **[Releases](../../releases)** deste repositório.
2. Baixe o instalador mais recente (`Discord-Privado-Setup-x.y.z.exe`).
3. Rode o instalador — é um instalador comum do Windows (NSIS), como
   qualquer outro programa. Não pede nada estranho, não precisa instalar
   Node.js, Docker ou qualquer outra coisa.
4. Abra o **Discord Privado** pelo atalho criado.

> Hoje o instalador só existe para **Windows**. Mac e Linux ainda não são
> empacotados.

Depois de instalado, o app se atualiza sozinho quando sai uma versão nova
— não precisa baixar de novo manualmente.

---

## Como usar

Ao abrir o app pela primeira vez, você escolhe entre duas opções:

### 🖥️ Hospedar servidor

Escolha essa opção se você é quem vai "dar a call" — o app vai iniciar o
servidor de chat e o servidor de voz/vídeo (LiveKit) sozinho, no seu
próprio PC, sem precisar instalar nada a mais.

1. Clique em **"Hospedar servidor"**.
2. O app mostra as redes disponíveis no seu PC (rede local, VPN, etc.) e
   já sugere a melhor opção pra usar. Se seus amigos estão na mesma
   rede/Wi-Fi que você, a rede local já basta. Se estão em outra casa,
   veja a seção **["Jogando com amigos em outra rede"](#jogando-com-amigos-em-outra-rede)**
   abaixo antes de continuar.
3. Confirme, e o app inicia tudo sozinho. No final, ele mostra um
   endereço (algo como `http://100.x.x.x:3000`) — copie e manda pros seus
   amigos.
4. Digite seu nome e pronto, você já está dentro.

Enquanto o app estiver aberto e você continuar hospedando, seus amigos
conseguem entrar. Se você fechar o app, a call e o chat caem pra todo
mundo (é o seu PC que está segurando o servidor).

### 🔗 Entrar em servidor

Escolha essa opção se um amigo seu já está hospedando e te passou um
endereço.

1. Clique em **"Entrar em servidor"**.
2. Cole o endereço que seu amigo te passou (ex: `http://100.x.x.x:3000`).
3. Digite seu nome e pronto.

---

## Jogando com amigos em outra rede

Se todo mundo está na mesma casa/Wi-Fi, a opção **"Rede local"** dentro de
"Hospedar servidor" já resolve, sem precisar de mais nada.

Se seus amigos estão em **outras casas/redes**, vocês precisam de um app
que simule uma rede local entre os PCs pela internet (uma "VPN de LAN").
O Discord Privado detecta essas redes automaticamente e mostra elas na
lista de "Hospedar servidor" assim que estiverem ativas — não precisa
configurar nada dentro do app além de escolher a rede certa.

**✅ Testado e recomendado: [ZeroTier](https://www.zerotier.com/)**

1. Crie uma conta grátis em zerotier.com e crie uma rede (Network) pelo
   painel deles — é só clicar em "Create A Network".
2. Instale o **ZeroTier** em todos os PCs (quem hospeda e quem entra):
   https://www.zerotier.com/download/
3. Em cada PC, entre na mesma rede usando o ID que o painel mostrou
   (`zerotier-cli join <ID_DA_REDE>`, ou pela interface gráfica do app).
4. No painel do ZeroTier, **autorize** cada PC que entrar na rede (tem uma
   caixinha de "Auth" pra marcar — por padrão, PCs novos ficam pendentes).
5. Agora, na hora de **"Hospedar servidor"** no Discord Privado, a rede do
   ZeroTier deve aparecer na lista de redes disponíveis — escolha ela.
   O endereço que o app vai gerar pra compartilhar já vai usar o IP do
   ZeroTier automaticamente.
6. Seus amigos (que já instalaram o ZeroTier e entraram na mesma rede)
   escolhem "Entrar em servidor" e colam esse endereço.

Outras opções que também funcionam, pelo mesmo princípio (todo mundo
entra na mesma "rede virtual" antes de abrir o Discord Privado):

- **[Hamachi](https://www.vpn.net/)** (LogMeIn Hamachi)
- **[Radmin VPN](https://www.radmin-vpn.com/)**
- **[Tailscale](https://tailscale.com/)**

> Só o ZeroTier foi testado de ponta a ponta até agora. Os outros devem
> funcionar do mesmo jeito (o app detecta qualquer rede/VPN ativa no PC),
> mas ainda não foram validados na prática — se usar um deles e a rede não
> aparecer certo na lista, [reporta aqui](../../issues) o que aconteceu.

---

## Perguntas comuns

**Preciso ficar com o app aberto o tempo todo pra hospedar?**
Sim, enquanto você for o host, seu PC precisa estar ligado e com o app
aberto. Se fechar, a call e o chat caem pra todo mundo.

**Posso usar câmera e compartilhar tela ao mesmo tempo?**
Sim, são independentes — pode ligar/desligar cada um a qualquer momento
pelos botões da barra de controles.

**O app pediu permissão de microfone/câmera do Windows, isso é normal?**
Sim, é a permissão normal do sistema pra qualquer app que usa
microfone/câmera. Sem aceitar, a call não funciona.

**Existe versão para celular?**
Não, por enquanto é só para PC Windows.

**Meus dados ficam salvos em algum servidor da empresa?**
Não. Tudo roda no PC de quem está hospedando — não existe nenhum servidor
central de terceiros guardando suas mensagens ou seu histórico.
