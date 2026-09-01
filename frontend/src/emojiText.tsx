import { ReactNode } from "react";
import { CustomEmoji } from "./api";

const CODE_REGEX = /:([a-z0-9_]{2,32}):/g;

/**
 * Troca ":codigo:" pela imagem do emoji personalizado correspondente,
 * quando o código existir no mapa passado. Emoji nativo (unicode,
 * digitado ou colado do seletor do sistema/picker) já funciona sozinho
 * como texto normal — não precisa de nenhum tratamento aqui, o
 * navegador já renderiza.
 *
 * `emojiByCode` deve conter URLs já absolutas (com o backendUrl na
 * frente), não os caminhos relativos que a API devolve.
 */
export function renderMessageText(
  text: string,
  emojiByCode: Map<string, { url: string }>
): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  CODE_REGEX.lastIndex = 0;
  while ((match = CODE_REGEX.exec(text)) !== null) {
    const [full, code] = match;
    const emoji = emojiByCode.get(code);
    if (!emoji) continue; // código desconhecido — deixa como texto normal, sem tratamento

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <img key={`emoji-${key++}`} className="chat-emoji" src={emoji.url} alt={full} title={full} />
    );
    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function buildEmojiUrlMap(
  backendUrl: string,
  emojis: CustomEmoji[]
): Map<string, { url: string }> {
  const map = new Map<string, { url: string }>();
  for (const emoji of emojis) {
    map.set(emoji.code, { url: `${backendUrl}${emoji.url}` });
  }
  return map;
}
