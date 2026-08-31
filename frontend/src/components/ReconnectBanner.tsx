import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

export default function ReconnectBanner() {
  const state = useConnectionState();

  if (state !== ConnectionState.Reconnecting && state !== ConnectionState.SignalReconnecting) {
    return null;
  }

  return <div className="reconnect-banner">🔄 Reconectando à call...</div>;
}
