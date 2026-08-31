import { useLocalParticipant, useRoomContext } from "@livekit/components-react";

interface Props {
  onLeave: () => void;
}

export default function ControlBar({ onLeave }: Props) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  async function toggleCam() {
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }

  async function toggleScreenShare() {
    try {
      await localParticipant.setScreenShareEnabled(
        !isScreenShareEnabled,
        {
          // Mesmos ajustes validados na Etapa 1: fps alto + contentHint
          // "motion" evitam a sensação de lag em conteúdo com movimento
          // rápido (jogos). Ver README para como ajustar se travar/borrar.
          resolution: { width: 1920, height: 1080, frameRate: 30 },
          contentHint: "motion",
        },
        {
          videoEncoding: { maxBitrate: 4_000_000, maxFramerate: 30 },
          simulcast: false,
        }
      );
    } catch (err) {
      console.warn("Usuário cancelou ou erro ao compartilhar tela:", err);
    }
  }

  function leave() {
    room.disconnect();
    onLeave();
  }

  return (
    <div className="control-bar">
      <span className="room-label">Sala: {room.name}</span>
      <button onClick={toggleMic}>{isMicrophoneEnabled ? "🎤 Mutar" : "🔇 Desmutar"}</button>
      <button onClick={toggleCam}>{isCameraEnabled ? "📷 Desligar câmera" : "📷 Câmera"}</button>
      <button onClick={toggleScreenShare}>
        {isScreenShareEnabled ? "🛑 Parar compartilhamento" : "🖥️ Compartilhar tela"}
      </button>
      <button className="danger" onClick={leave}>
        Sair
      </button>
    </div>
  );
}
