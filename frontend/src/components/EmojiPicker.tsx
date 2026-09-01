import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchEmojis, CustomEmoji } from "../api";

interface Props {
  backendUrl: string;
  authToken: string;
  onClose: () => void;
  onSelectNative: (emoji: string) => void;
  onSelectCustom: (emoji: CustomEmoji) => void;
}

// Set curado de emoji nativos comuns — não é a lista completa do Unicode
// (isso pediria uma lib própria, tipo emoji-mart, com busca/categorias de
// verdade). Cobre o uso do dia a dia de um grupo de amigos; dá pra
// ampliar essa lista ou trocar por uma lib depois, se fizer falta.
const NATIVE_EMOJIS = [
  "😀", "😂", "😅", "😉", "😊", "😍", "😘", "😜", "🤔", "🙄",
  "😴", "😭", "😱", "😡", "🥳", "🤗", "🤝", "👍", "👎", "👏",
  "🙌", "🙏", "💪", "👀", "🔥", "✨", "💯", "🎉", "🎮", "🎵",
  "☕", "🍕", "🍺", "⚽", "🏆", "💀", "🤡", "😈", "👻", "🐱",
  "🐶", "🦆", "🐍", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤",
  "🤍", "😎", "🤯", "🥶", "🫡", "🙃", "😏", "🥲", "😬", "🤙",
];

/**
 * Painel de USAR emoji (nativo + personalizado) — aberto a partir do
 * botão no campo de mensagem. Adicionar/remover emoji personalizado fica
 * nas Configurações (EmojiManager.tsx), não aqui.
 */
export default function EmojiPicker({
  backendUrl,
  authToken,
  onClose,
  onSelectNative,
  onSelectCustom,
}: Props) {
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchEmojis(backendUrl, authToken)
      .then((list) => {
        if (!cancelled) setCustomEmojis(list);
      })
      .catch(() => {
        // Se falhar, só não mostra a seção de personalizados — não vale
        // travar o resto do seletor por causa disso.
      });
    return () => {
      cancelled = true;
    };
  }, [backendUrl, authToken]);

  return (
    <div className="emoji-picker-backdrop" onClick={onClose}>
      <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
        <div className="emoji-picker-header">
          <span>Emojis</span>
          <button className="icon-btn small" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {customEmojis.length > 0 && (
          <>
            <div className="emoji-picker-section-title">Personalizados</div>
            <div className="emoji-picker-grid">
              {customEmojis.map((emoji) => (
                <button
                  key={emoji.id}
                  className="emoji-picker-item emoji-picker-item-custom"
                  title={`:${emoji.code}:`}
                  onClick={() => onSelectCustom(emoji)}
                >
                  <img src={`${backendUrl}${emoji.url}`} alt={emoji.code} />
                </button>
              ))}
            </div>
          </>
        )}

        <div className="emoji-picker-section-title">Emojis</div>
        <div className="emoji-picker-grid">
          {NATIVE_EMOJIS.map((emoji) => (
            <button key={emoji} className="emoji-picker-item" onClick={() => onSelectNative(emoji)}>
              {emoji}
            </button>
          ))}
        </div>

        <p className="device-select-note emoji-picker-note">
          Quer adicionar um emoji personalizado? Vá em Configurações → Emojis.
        </p>
      </div>
    </div>
  );
}
