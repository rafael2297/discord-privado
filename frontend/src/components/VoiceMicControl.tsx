import { useLocalParticipant } from "@livekit/components-react";
import { Mic, MicOff } from "lucide-react";

/**
 * Controle de mic isolado, pra viver na barra do usuário (sidebar-bottom)
 * em vez de junto com os outros botões de voz — igual ao Discord, que
 * separa o mic (fica sempre visível, junto com o seu nome) das features
 * da call (câmera/tela/soundboard, que ficam num bloco à parte).
 *
 * Só é renderizado quando `inCall` é verdadeiro (ver ChannelSidebar.tsx),
 * então sempre está dentro do contexto do <LiveKitRoom> quando montado.
 */
export default function VoiceMicControl() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  return (
    <button
      className={`icon-btn small ${!isMicrophoneEnabled ? "muted" : ""}`}
      onClick={toggleMic}
      title={isMicrophoneEnabled ? "Mutar" : "Desmutar"}
    >
      {isMicrophoneEnabled ? <Mic size={16} /> : <MicOff size={16} />}
    </button>
  );
}
