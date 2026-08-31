import { useState } from "react";
import { useParticipants } from "@livekit/components-react";
import { Volume2, MessageSquare, Users } from "lucide-react";
import ParticipantGrid from "./ParticipantGrid";
import ChatPanel from "./ChatPanel";

interface Props {
  username: string;
  showMembers: boolean;
  onToggleMembers: () => void;
}

export default function CallView({ username, showMembers, onToggleMembers }: Props) {
  const [showChat, setShowChat] = useState(false);
  const participants = useParticipants();

  return (
    <div className="call-view">
      <div className="main-header">
        <Volume2 size={18} className="main-header-icon" />
        <span>geral</span>
        <span className="main-header-count">{participants.length}</span>
        <button
          className={`icon-btn member-toggle ${showMembers ? "on" : ""}`}
          onClick={onToggleMembers}
          title={showMembers ? "Esconder lista de membros" : "Mostrar lista de membros"}
          aria-label={showMembers ? "Esconder lista de membros" : "Mostrar lista de membros"}
        >
          <Users size={18} />
        </button>
        <button
          className={`icon-btn chat-toggle ${showChat ? "on" : ""}`}
          onClick={() => setShowChat((v) => !v)}
          title={showChat ? "Esconder chat" : "Mostrar chat"}
        >
          <MessageSquare size={18} />
        </button>
      </div>

      <div className="call-view-body">
        <div className="call-view-grid">
          <ParticipantGrid />
        </div>
        {showChat && (
          <div className="call-view-chat">
            <ChatPanel username={username} />
          </div>
        )}
      </div>
    </div>
  );
}
