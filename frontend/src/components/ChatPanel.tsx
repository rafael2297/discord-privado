import { useEffect, useRef, useState } from "react";
import { Smile, Paperclip, Image as ImageIcon, X } from "lucide-react";
import { useChatConnection, ChatAttachment } from "../ChatConnectionContext";
import { fetchEmojis, uploadAttachment, fetchLinkPreview, CustomEmoji, LinkPreview } from "../api";
import { renderMessageContent, buildEmojiUrlMap } from "../emojiText";
import { extractFirstYoutubeUrl } from "../youtube";
import EmojiPicker from "./EmojiPicker";
import GifPicker from "./GifPicker";
import YoutubeEmbed from "./YoutubeEmbed";

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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkPreviews, setLinkPreviews] = useState<Map<string, LinkPreview>>(new Map());
  const fetchedUrlsRef = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Sempre que uma mensagem nova tem um link de YouTube, busca o preview
  // dele (uma vez só por URL, mesmo que apareça em várias mensagens).
  useEffect(() => {
    for (const m of messages) {
      const youtubeUrl = extractFirstYoutubeUrl(m.text);
      if (!youtubeUrl || fetchedUrlsRef.current.has(youtubeUrl)) continue;
      fetchedUrlsRef.current.add(youtubeUrl);
      fetchLinkPreview(backendUrl, authToken, youtubeUrl).then((preview) => {
        if (!preview) return; // sem preview disponível — o link continua clicável normal
        setLinkPreviews((prev) => new Map(prev).set(youtubeUrl, preview));
      });
    }
  }, [messages, backendUrl, authToken]);

  const emojiByCode = buildEmojiUrlMap(backendUrl, customEmojis);

  function send() {
    if (!draft.trim() && !pendingAttachment) return;
    sendMessage(draft, pendingAttachment ?? undefined);
    setDraft("");
    setPendingAttachment(null);
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

  function handleSelectGif(gif: { url: string; width: number; height: number }) {
    // GIF já está hospedado pela Klipy — não precisa passar pelo nosso
    // backend, é só mandar a URL direto como anexo.
    setGifPickerOpen(false);
    sendMessage("", { url: gif.url, type: "gif" });
  }

  async function uploadPickedFile(file: File) {
    const kind = file.type.startsWith("audio/") ? "audio" : "image";
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadAttachment(backendUrl, authToken, kind, file);
      setPendingAttachment({ url: uploaded.url, type: uploaded.type, name: uploaded.name });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  }

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!file) return;
    await uploadPickedFile(file);
  }

  // Ctrl+V com uma imagem copiada (ex: print de tela) sobe ela igual ao
  // botão de anexo — sem isso, colar uma imagem no campo de texto não
  // fazia nada.
  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await uploadPickedFile(file);
        return;
      }
    }
    // Nada de imagem no clipboard — deixa o paste de texto normal acontecer.
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
            m.timestamp - prev.timestamp < GROUP_WINDOW_MS &&
            !prev.attachmentUrl &&
            !m.attachmentUrl;

          const youtubeUrl = m.text ? extractFirstYoutubeUrl(m.text) : null;
          const youtubePreview = youtubeUrl ? linkPreviews.get(youtubeUrl) : undefined;

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
                {m.text && (
                  <div className="chat-text-row">
                    <span className="chat-text">{renderMessageContent(m.text, emojiByCode)}</span>
                    {grouped && <span className="chat-timestamp-hover">{formatTime(m.timestamp)}</span>}
                  </div>
                )}
                {youtubeUrl && youtubePreview && (
                  <YoutubeEmbed preview={youtubePreview} sourceUrl={youtubeUrl} />
                )}
                {m.attachmentUrl && m.attachmentType === "audio" ? (
                  <audio
                    className="chat-attachment-audio"
                    controls
                    src={m.attachmentUrl.startsWith("http") ? m.attachmentUrl : `${backendUrl}${m.attachmentUrl}`}
                  />
                ) : m.attachmentUrl ? (
                  <a
                    href={m.attachmentUrl.startsWith("http") ? m.attachmentUrl : `${backendUrl}${m.attachmentUrl}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      className="chat-attachment-image"
                      src={m.attachmentUrl.startsWith("http") ? m.attachmentUrl : `${backendUrl}${m.attachmentUrl}`}
                      alt={m.attachmentName || (m.attachmentType === "gif" ? "GIF" : "imagem")}
                      loading="lazy"
                    />
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {(pendingAttachment || uploading || uploadError) && (
        <div className="chat-pending-attachment">
          {uploading ? (
            <span className="device-select-empty">Enviando arquivo...</span>
          ) : uploadError ? (
            <span className="soundboard-error">{uploadError}</span>
          ) : pendingAttachment ? (
            <>
              {pendingAttachment.type === "audio" ? (
                <span>🎵 {pendingAttachment.name || "áudio"}</span>
              ) : (
                <img src={`${backendUrl}${pendingAttachment.url}`} alt="" />
              )}
              <button
                className="icon-btn small muted"
                onClick={() => setPendingAttachment(null)}
                title="Remover anexo"
              >
                <X size={14} />
              </button>
            </>
          ) : null}
        </div>
      )}

      <div className="chat-input-row">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*"
          hidden
          onChange={handleFilePicked}
        />
        <button
          className="icon-btn chat-emoji-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar imagem ou áudio"
        >
          <Paperclip size={20} />
        </button>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={connected ? "Mensagem para #geral" : "Reconectando ao chat..."}
          rows={1}
        />
        <button
          className="icon-btn chat-emoji-btn chat-gif-btn"
          onClick={() => setGifPickerOpen(true)}
          title="GIF"
        >
          <ImageIcon size={18} />
          <span>GIF</span>
        </button>
        <button className="icon-btn chat-emoji-btn" onClick={() => setEmojiPickerOpen(true)} title="Emojis">
          <Smile size={20} />
        </button>
        <button onClick={send} disabled={(!draft.trim() && !pendingAttachment) || !connected || uploading}>
          Enviar
        </button>
      </div>

      {emojiPickerOpen && (
        <EmojiPicker
          backendUrl={backendUrl}
          authToken={authToken}
          onClose={() => setEmojiPickerOpen(false)}
          onSelectNative={handleSelectNative}
          onSelectCustom={handleSelectCustom}
        />
      )}

      {gifPickerOpen && (
        <GifPicker onClose={() => setGifPickerOpen(false)} onSelect={handleSelectGif} />
      )}
    </div>
  );
}
