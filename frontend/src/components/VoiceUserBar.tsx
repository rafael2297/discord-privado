import { useRef, useState } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff } from "lucide-react";
import { isEnvElectron } from "../host";
import ScreenSharePicker from "./ScreenSharePicker";

export default function VoiceUserBar() {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerResolveRef = useRef<((sourceId: string | null) => void) | null>(null);

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  async function toggleCam() {
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }

  async function startScreenShare() {
    await localParticipant.setScreenShareEnabled(
      true,
      {
        // Mesmos ajustes validados na Etapa 1: fps alto + contentHint
        // "motion" evitam a sensação de lag em conteúdo com movimento
        // rápido (jogos).
        resolution: { width: 1920, height: 1080, frameRate: 30 },
        contentHint: "motion",
        // Pede áudio do sistema/janela junto com a tela (equivalente ao
        // "compartilhar áudio" do Discord). No Electron, quem decide de
        // verdade é o main.cjs (audio: "loopback"); isso aqui é o pedido
        // do lado do navegador.
        audio: true,
        systemAudio: "include",
      },
      {
        videoEncoding: { maxBitrate: 4_000_000, maxFramerate: 30 },
        simulcast: false,
      }
    );
  }

  async function toggleScreenShare() {
    try {
      if (isScreenShareEnabled) {
        await localParticipant.setScreenShareEnabled(false);
        return;
      }

      if (isEnvElectron()) {
        // No Electron, o Chromium embutido não mostra um seletor nativo
        // sozinho — mostramos o nosso (ScreenSharePicker) antes de pedir
        // o compartilhamento de verdade.
        const sourceId = await new Promise<string | null>((resolve) => {
          pickerResolveRef.current = resolve;
          setPickerOpen(true);
        });
        if (!sourceId) return; // cancelou no seletor
        await (window as any).electronAPI.setScreenShareSource(sourceId);
      }

      await startScreenShare();
    } catch (err) {
      console.warn("Usuário cancelou ou erro ao compartilhar tela:", err);
    }
  }

  function handlePick(sourceId: string | null) {
    setPickerOpen(false);
    pickerResolveRef.current?.(sourceId);
    pickerResolveRef.current = null;
  }

  function leave() {
    room.disconnect();
  }

  return (
    <div className="voice-status-bar">
      <div className="voice-status-info">
        <span className="voice-connected-dot" />
        <div>
          <div className="voice-status-title">Voz conectada</div>
          <div className="voice-status-sub"># geral</div>
        </div>
      </div>
      <div className="voice-status-actions">
        <button
          className={`icon-btn ${!isMicrophoneEnabled ? "muted" : ""}`}
          onClick={toggleMic}
          title={isMicrophoneEnabled ? "Mutar" : "Desmutar"}
        >
          {isMicrophoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button
          className={`icon-btn ${isCameraEnabled ? "on" : ""}`}
          onClick={toggleCam}
          title="Câmera"
        >
          {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
        <button
          className={`icon-btn ${isScreenShareEnabled ? "on" : ""}`}
          onClick={toggleScreenShare}
          title="Compartilhar tela"
        >
          {isScreenShareEnabled ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
        </button>
        <button className="icon-btn danger" onClick={leave} title="Desconectar">
          <PhoneOff size={18} />
        </button>
      </div>

      {pickerOpen && <ScreenSharePicker onPick={handlePick} />}
    </div>
  );
}
