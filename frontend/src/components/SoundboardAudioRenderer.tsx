import { useEffect, useRef } from "react";
import { RoomEvent, RemoteTrack, RemoteTrackPublication, Track } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

/**
 * Fica montado dentro do <LiveKitRoom> (ver Workspace.tsx) só ouvindo por
 * tracks de áudio extras chamadas "soundboard" (ver soundboard.ts) e
 * tocando elas — o RoomAudioRenderer padrão da lib não sabe lidar com
 * tracks fora de microfone/tela, então cuidamos manualmente aqui, do
 * mesmo jeito que o áudio da tela compartilhada já é tratado à parte.
 */
export default function SoundboardAudioRenderer() {
  const room = useRoomContext();
  const elementsRef = useRef(new Map<string, HTMLAudioElement>());

  useEffect(() => {
    function handleSubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
      if (track.kind !== Track.Kind.Audio || publication.trackName !== "soundboard") return;

      const el = document.createElement("audio");
      el.autoplay = true;
      el.srcObject = new MediaStream([track.mediaStreamTrack]);
      document.body.appendChild(el);
      elementsRef.current.set(publication.trackSid, el);

      el.play().catch(() => {
        // Autoplay bloqueado pelo navegador raramente acontece aqui
        // (já teve interação do usuário pra entrar na call), mas não
        // deixamos isso quebrar nada se acontecer.
      });
    }

    function handleUnsubscribed(_track: RemoteTrack, publication: RemoteTrackPublication) {
      const el = elementsRef.current.get(publication.trackSid);
      if (el) {
        el.pause();
        el.remove();
        elementsRef.current.delete(publication.trackSid);
      }
    }

    room.on(RoomEvent.TrackSubscribed, handleSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleUnsubscribed);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleUnsubscribed);
      elementsRef.current.forEach((el) => el.remove());
      elementsRef.current.clear();
    };
  }, [room]);

  return null;
}
