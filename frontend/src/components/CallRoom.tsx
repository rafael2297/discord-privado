import { useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { fetchJoinToken, JoinTokenResult } from "../api";
import ControlBar from "./ControlBar";

interface Props {
  backendUrl: string;
  authToken: string;
  username: string;
  onLogout: () => void;
}

// Projeto tem só um canal de voz (não é o modelo "múltiplos servidores/
// canais" do Discord — decisão consciente pra manter simples pro tamanho
// do grupo, ver seção 11 do PROJECT_CONTEXT.md). Se algum dia precisar de
// mais de um canal, isso vira uma lista vinda do backend em vez de um
// valor fixo aqui.
const VOICE_ROOM_NAME = "geral";

export default function CallRoom({ backendUrl, authToken, username, onLogout }: Props) {
  const [joinInfo, setJoinInfo] = useState<JoinTokenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    setError(null);

    // getUserMedia (microfone/câmera) só funciona em "contexto seguro":
    // HTTPS, ou especificamente http://localhost. Se a página foi aberta
    // por um IP (ex: via Tailscale, tipo http://100.x.x.x:5173), o
    // navegador bloqueia silenciosamente o acesso e o erro que aparece lá
    // na frente ("Cannot read properties of undefined") é bem confuso.
    // Detectamos isso ANTES de tentar conectar pra dar um erro claro.
    if (!navigator.mediaDevices) {
      setError(
        "Seu navegador bloqueou o acesso a microfone/câmera nesta página. " +
          "Isso costuma acontecer quando a página é aberta por um endereço " +
          `IP (${window.location.hostname}) em vez de "localhost" — só ` +
          "funciona em HTTPS ou http://localhost. Acesse via " +
          "http://localhost:5173 nesta máquina."
      );
      return;
    }

    setJoining(true);
    try {
      const info = await fetchJoinToken(backendUrl, authToken, VOICE_ROOM_NAME);
      setJoinInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao pedir token pro backend.");
    } finally {
      setJoining(false);
    }
  }

  if (!joinInfo) {
    return (
      <div className="prejoin-screen">
        <p className="whoami">Logado como {username}</p>
        <p className="whoami">Servidor: {backendUrl}</p>
        <div className="auth-actions">
          <button disabled={joining} onClick={handleJoin}>
            {joining ? "Entrando..." : "🎙️ Entrar no canal de voz"}
          </button>
          <button className="secondary" onClick={onLogout}>
            Trocar de nome/servidor
          </button>
        </div>
        {error && <p className="auth-error">{error}</p>}
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={joinInfo.url}
      token={joinInfo.token}
      connect
      audio
      video={false}
      onDisconnected={() => {
        setError((prev) => prev || "Desconectado da call (conexão perdida ou LiveKit fora do ar).");
        setJoinInfo(null);
      }}
      onError={(err) => {
        console.error("Erro na LiveKitRoom:", err);
        setError(`Erro ao conectar: ${err.message}. Confira se o LiveKit está rodando (start-livekit.bat).`);
        setJoinInfo(null);
      }}
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
    >
      <ControlBar onLeave={() => setJoinInfo(null)} />
      <VideoGrid />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function VideoGrid() {
  // Pega as tracks de câmera e tela compartilhada de todos os participantes
  // (o áudio é tratado à parte pelo RoomAudioRenderer, não precisa de tile).
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ flex: 1 }}>
      <ParticipantTile />
    </GridLayout>
  );
}
