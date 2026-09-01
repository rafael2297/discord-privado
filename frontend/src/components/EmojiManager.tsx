import { useEffect, useState, FormEvent } from "react";
import { Trash2, Plus } from "lucide-react";
import { fetchEmojis, uploadEmoji, deleteEmoji, CustomEmoji } from "../api";

interface Props {
  backendUrl: string;
  authToken: string;
  username: string;
}

/**
 * Gerenciar emojis personalizados (adicionar/remover) fica nas
 * Configurações — mesma lógica do soundboard: gerenciar é uma coisa,
 * usar (o EmojiPicker, no chat) é outra.
 */
export default function EmojiManager({ backendUrl, authToken, username }: Props) {
  const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchEmojis(backendUrl, authToken)
      .then((list) => {
        if (!cancelled) setEmojis(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar emojis");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendUrl, authToken]);

  async function handleDelete(emoji: CustomEmoji) {
    const confirmed = window.confirm(`Remover o emoji :${emoji.code}:?`);
    if (!confirmed) return;
    try {
      await deleteEmoji(backendUrl, authToken, emoji.id);
      setEmojis((prev) => prev.filter((e) => e.id !== emoji.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover emoji");
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newFile) return;
    setUploading(true);
    setError(null);
    try {
      const emoji = await uploadEmoji(backendUrl, authToken, newCode.trim(), newFile);
      setEmojis((prev) => [...prev, emoji]);
      setNewCode("");
      setNewFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar emoji");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {loading ? (
        <p className="device-select-empty">Carregando emojis...</p>
      ) : emojis.length === 0 ? (
        <p className="device-select-empty">Nenhum emoji personalizado ainda — adicione um abaixo.</p>
      ) : (
        <ul className="soundboard-manage-list">
          {emojis.map((emoji) => (
            <li key={emoji.id} className="soundboard-manage-item emoji-manage-item">
              <img
                className="emoji-manage-preview"
                src={`${backendUrl}${emoji.url}`}
                alt={emoji.code}
              />
              <span>:{emoji.code}:</span>
              {emoji.addedBy === username && (
                <button
                  className="icon-btn small muted"
                  onClick={() => handleDelete(emoji)}
                  title="Remover emoji"
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
        <input
          type="text"
          placeholder="Código (ex: buzina, vira :buzina:)"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          maxLength={32}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
        />
        <button
          className="secondary-btn soundboard-add-btn"
          type="submit"
          disabled={uploading || !newCode.trim() || !newFile}
        >
          <Plus size={14} /> {uploading ? "Enviando..." : "Adicionar"}
        </button>
        <p className="device-select-note">
          Sem limite de quantidade de emojis — só evite imagens muito grandes (até 5&nbsp;MB
          cada). Use só letras minúsculas, números e "_" no código.
        </p>
      </form>
    </>
  );
}
