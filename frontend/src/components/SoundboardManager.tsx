import { useEffect, useRef, useState, FormEvent } from "react";
import { Trash2, Plus, Smile } from "lucide-react";
import { fetchSounds, uploadSound, deleteSound, fetchEmojis, CustomEmoji, SoundboardSound } from "../api";
import { renderMessageText, buildEmojiUrlMap } from "../emojiText";
import EmojiPicker from "./EmojiPicker";

interface Props {
  backendUrl: string;
  authToken: string;
  username: string;
}

/**
 * Gerenciar sons (adicionar/remover) fica nas Configurações — separado
 * do painel de "usar" o soundboard (SoundboardPanel.tsx), que abre a
 * partir da barra de voz e é só pra tocar. Mesma lógica do Discord:
 * gerenciar é uma coisa, tocar é outra.
 */
export default function SoundboardManager({ backendUrl, authToken, username }: Props) {
  const [sounds, setSounds] = useState<SoundboardSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Emoji personalizado usado no NOME do som (ex: "🎺 Buzina" ou
  // ":buzina: Buzina") — pra mostrar a imagem em vez do ":codigo:" cru,
  // tanto aqui na lista quanto na grade de tocar (SoundboardPanel.tsx).
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchSounds(backendUrl, authToken)
      .then((list) => {
        if (!cancelled) setSounds(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar sons");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    fetchEmojis(backendUrl, authToken)
      .then((list) => {
        if (!cancelled) setCustomEmojis(list);
      })
      .catch(() => {
        // Sem emoji carregado, o nome só aparece com o ":codigo:" cru em
        // vez da imagem — não trava a lista de sons por causa disso.
      });
    return () => {
      cancelled = true;
    };
  }, [backendUrl, authToken]);

  const emojiByCode = buildEmojiUrlMap(backendUrl, customEmojis);

  function insertAtCursor(text: string) {
    const el = nameInputRef.current;
    if (!el) {
      setNewName((prev) => prev + text);
      return;
    }
    const start = el.selectionStart ?? newName.length;
    const end = el.selectionEnd ?? newName.length;
    const next = newName.slice(0, start) + text + newName.slice(end);
    setNewName(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + text.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  async function handleDelete(sound: SoundboardSound) {
    const confirmed = window.confirm(`Remover o som "${sound.name}"?`);
    if (!confirmed) return;
    try {
      await deleteSound(backendUrl, authToken, sound.id);
      setSounds((prev) => prev.filter((s) => s.id !== sound.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover som");
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newFile) return;
    setUploading(true);
    setError(null);
    try {
      const sound = await uploadSound(backendUrl, authToken, newName.trim(), newFile);
      setSounds((prev) => [...prev, sound]);
      setNewName("");
      setNewFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar som");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {loading ? (
        <p className="device-select-empty">Carregando sons...</p>
      ) : sounds.length === 0 ? (
        <p className="device-select-empty">Nenhum som ainda — adicione um abaixo.</p>
      ) : (
        <ul className="soundboard-manage-list">
          {sounds.map((sound) => (
            <li key={sound.id} className="soundboard-manage-item">
              <span>{renderMessageText(sound.name, emojiByCode)}</span>
              {sound.addedBy === username && (
                <button
                  className="icon-btn small muted"
                  onClick={() => handleDelete(sound)}
                  title="Remover som"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="soundboard-error">{error}</p>}

      <form className="soundboard-upload-form" onSubmit={handleUpload}>
        <div className="input-with-emoji">
          <input
            ref={nameInputRef}
            type="text"
            // Emoji nativo funciona direto ao digitar/colar; o botão 😊
            // também insere emoji personalizado (":codigo:"), que já
            // aparece como imagem aqui na lista e na grade de tocar.
            placeholder="Nome do som (ex: 🎺 Buzina)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={60}
          />
          <button
            type="button"
            className="icon-btn input-emoji-btn"
            onClick={() => setPickerOpen(true)}
            title="Inserir emoji"
          >
            <Smile size={16} />
          </button>
        </div>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
        />
        <button
          className="secondary-btn soundboard-add-btn"
          type="submit"
          disabled={uploading || !newName.trim() || !newFile}
        >
          <Plus size={14} /> {uploading ? "Enviando..." : "Adicionar"}
        </button>
        <p className="device-select-note">
          Sem limite de duração ou de quantidade de sons — só evite arquivos muito grandes
          (até 100&nbsp;MB por som).
        </p>
      </form>

      {pickerOpen && (
        <EmojiPicker
          backendUrl={backendUrl}
          authToken={authToken}
          onClose={() => setPickerOpen(false)}
          onSelectNative={(emoji) => insertAtCursor(emoji)}
          onSelectCustom={(emoji) => {
            insertAtCursor(`:${emoji.code}:`);
            setCustomEmojis((prev) => (prev.some((e) => e.id === emoji.id) ? prev : [...prev, emoji]));
          }}
        />
      )}
    </>
  );
}
