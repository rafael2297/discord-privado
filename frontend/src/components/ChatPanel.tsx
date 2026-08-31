import { useEffect, useRef, useState } from "react";
import { useChatConnection } from "../ChatConnectionContext";

interface Props {
  username: string;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Mensagens consecutivas da mesma pessoa em menos de 5 minutos ficam
// agrupadas (sem repetir avatar/nome), igual ao Discord.
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export default function ChatPanel({ username }: Props) {
  const { messages, connected, sendMessage } = useChatConnection();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && <p className="chat-empty">Nenhuma mensagem ainda.</p>}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped =
            prev &&
            prev.username === m.username &&
            m.timestamp - prev.timestamp < GROUP_WINDOW_MS;

          return (
            <div key={m.id} className={`chat-message-row ${grouped ? "grouped" : ""}`}>
              {!grouped && (
                <div className="user-avatar" title={m.username}>
                  {m.username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="chat-message-body">
                {!grouped && (
                  <div className="chat-message-meta">
                    <span className={`chat-author ${m.username === username ? "own" : ""}`}>
                      {m.username}
                    </span>
                    <span className="chat-timestamp">{formatTime(m.timestamp)}</span>
                  </div>
                )}
                <div className="chat-text-row">
                  <span className="chat-text">{m.text}</span>
                  {grouped && <span className="chat-timestamp-hover">{formatTime(m.timestamp)}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? "Mensagem para #geral" : "Reconectando ao chat..."}
          rows={1}
        />
        <button onClick={send} disabled={!draft.trim() || !connected}>
          Enviar
        </button>
      </div>
    </div>
  );
}
