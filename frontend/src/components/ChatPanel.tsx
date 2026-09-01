import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { useChatConnection } from "../ChatConnectionContext";
import { fetchEmojis, CustomEmoji } from "../api";
import { renderMessageText, buildEmojiUrlMap } from "../emojiText";
import EmojiPicker from "./EmojiPicker";

interface Props {
  username: string;
  backendUrl: string;
  authToken: string;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Mensagens consecutivas da mesma pessoa em menos de 5 minutos ficam
// agrupadas (sem repetir avatar/nome), igual ao Discord.
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export default function ChatPanel({ username, backendUrl, authToken }: Props) {
  const { messages, connected, sendMessage } = useChatConnection();
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Carrega os emojis personalizados uma vez, pra saber traduzir ":codigo:"
  // em imagem nas mensagens já recebidas. Se alguém adicionar um emoji
  // novo enquanto o chat já está aberto, só aparece depois de reabrir o
  // chat/app — aceitável por enquanto, não há um evento em tempo real
  // avisando sobre emojis novos.
  useEffect(() => {
    let cancelled = false;
    fetchEmojis(backendUrl, authToken)
      .then((list) => {
        if (!cancelled) setCustomEmojis(list);
      })
      .catch(() => {
        // Sem emoji personalizado carregado, as mensagens só não mostram
        // a imagem (o ":codigo:" some/vira imagem quebrada) — não trava
        // o chat por causa disso.
      });
    return () => {
      cancelled = true;
    };
  }, [backendUrl, authToken]);

  const emojiByCode = buildEmojiUrlMap(backendUrl, customEmojis);

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

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) {
      setDraft((prev) => prev + text);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + text + draft.slice(end);
    setDraft(next);
    // Devolve o foco e o cursor logo depois do que foi inserido.
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + text.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function handleSelectNative(emoji: string) {
    insertAtCursor(emoji);
  }

  function handleSelectCustom(emoji: CustomEmoji) {
    insertAtCursor(`:${emoji.code}:`);
    setCustomEmojis((prev) => (prev.some((e) => e.id === emoji.id) ? prev : [...prev, emoji]));
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
                  <span className="chat-text">{renderMessageText(m.text, emojiByCode)}</span>
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
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? "Mensagem para #geral" : "Reconectando ao chat..."}
          rows={1}
        />
        <button className="icon-btn chat-emoji-btn" onClick={() => setPickerOpen(true)} title="Emojis">
          <Smile size={20} />
        </button>
        <button onClick={send} disabled={!draft.trim() || !connected}>
          Enviar
        </button>
      </div>

      {pickerOpen && (
        <EmojiPicker
          backendUrl={backendUrl}
          authToken={authToken}
          onClose={() => setPickerOpen(false)}
          onSelectNative={handleSelectNative}
          onSelectCustom={handleSelectCustom}
        />
      )}
    </div>
  );
}
