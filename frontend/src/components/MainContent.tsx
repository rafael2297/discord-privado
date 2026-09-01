import { Hash, Users } from "lucide-react";
import ChatPanel from "./ChatPanel";
import CallView from "./CallView";

interface Props {
  username: string;
  inCall: boolean;
  view: "chat" | "call";
  showMembers: boolean;
  onToggleMembers: () => void;
  backendUrl: string;
  authToken: string;
}

export default function MainContent({
  username,
  inCall,
  view,
  showMembers,
  onToggleMembers,
  backendUrl,
  authToken,
}: Props) {
  if (view === "call" && inCall) {
    return (
      <CallView
        username={username}
        showMembers={showMembers}
        onToggleMembers={onToggleMembers}
        backendUrl={backendUrl}
        authToken={authToken}
      />
    );
  }

  return (
    <div className="main-content">
      <div className="main-header">
        <Hash size={18} className="main-header-icon" />
        <span>geral</span>
        <button
          className={`icon-btn member-toggle ${showMembers ? "on" : ""}`}
          onClick={onToggleMembers}
          title={showMembers ? "Esconder lista de membros" : "Mostrar lista de membros"}
          aria-label={showMembers ? "Esconder lista de membros" : "Mostrar lista de membros"}
        >
          <Users size={18} />
        </button>
      </div>
      <ChatPanel username={username} backendUrl={backendUrl} authToken={authToken} />
    </div>
  );
}
