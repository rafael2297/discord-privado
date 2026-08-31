import { useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, RemoteParticipant } from "livekit-client";
import { playJoinSound, playLeaveSound } from "../soundEffects";
import { notify } from "../notifications";

export default function VoiceSoundEffects() {
  const room = useRoomContext();

  useEffect(() => {
    function handleConnected(participant: RemoteParticipant) {
      playJoinSound();
      notify("Canal de voz", `${participant.identity} entrou no canal de voz`);
    }
    function handleDisconnected() {
      playLeaveSound();
    }

    room.on(RoomEvent.ParticipantConnected, handleConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleDisconnected);
    };
  }, [room]);

  return null;
}
