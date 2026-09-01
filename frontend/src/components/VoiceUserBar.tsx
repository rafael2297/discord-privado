import { useRef, useState } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, Music4 } from "lucide-react";
import { isEnvElectron } from "../host";
import ScreenSharePicker from "./ScreenSharePicker";
import SoundboardPanel from "./SoundboardPanel";

interface Props {
  backendUrl: string;
  authToken: string;
}

export default function VoiceUserBar({ backendUrl, authToken }: Props) {
  const room = useRoomContext();
  const { localParticipant, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [soundboardOpen, setSoundboardOpen] = useState(false);
  const pickerResolveRef = useRef<((sourceId: string | null) => void) | null>(null);

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
      <div className="voice-status-top">
        <div className="voice-status-info">
          <span className="voice-connected-dot" />
          <div>
            <div className="voice-status-title">Voz conectada</div>
            <div className="voice-status-sub"># geral</div>
          </div>
        </div>
        <button className="icon-btn danger" onClick={leave} title="Desconectar">
          <PhoneOff size={18} />
        </button>
      </div>

      <div className="voice-status-features">
        <button
          className={`voice-feature-btn ${isCameraEnabled ? "on" : ""}`}
          onClick={toggleCam}
          title="Câmera"
        >
          {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
        <button
          className={`voice-feature-btn ${isScreenShareEnabled ? "on" : ""}`}
          onClick={toggleScreenShare}
          title="Compartilhar tela"
        >
          {isScreenShareEnabled ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
        </button>
        <button className="voice-feature-btn" onClick={() => setSoundboardOpen(true)} title="Soundboard">
          <Music4 size={18} />
        </button>
      </div>

      {pickerOpen && <ScreenSharePicker onPick={handlePick} />}
      {soundboardOpen && (
        <SoundboardPanel
          onClose={() => setSoundboardOpen(false)}
          backendUrl={backendUrl}
          authToken={authToken}
        />
      )}
    </div>
  );
}
