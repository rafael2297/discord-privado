import { useEffect, useState } from "react";
import { fetchVoiceParticipants, VoiceParticipant } from "../api";

interface Props {
  backendUrl: string;
  authToken: string;
  roomName: string;
}

const POLL_INTERVAL_MS = 4000;

export default function VoiceChannelPreview({ backendUrl, authToken, roomName }: Props) {
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const list = await fetchVoiceParticipants(backendUrl, authToken, roomName);
        if (!cancelled) setParticipants(list);
      } catch {
        // Provavelmente ninguém na sala ainda — silencioso, não é erro
        // que precise incomodar o usuário.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [backendUrl, authToken, roomName]);

  if (participants.length === 0) return null;

  return (
    <div className="voice-participants">
      {participants.map((p) => (
        <div key={p.identity} className="voice-participant">
          <span className="user-avatar small">{p.identity.slice(0, 2).toUpperCase()}</span>
          <span className="voice-participant-name">{p.identity}</span>
        </div>
      ))}
    </div>
  );
}
