import { GridLayout, ParticipantTile, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function VideoStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Sem câmera/tela ativa de ninguém: não ocupa espaço nenhum (só chat).
  if (tracks.length === 0) return null;

  return (
    <div className="video-stage">
      <GridLayout tracks={tracks}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}
