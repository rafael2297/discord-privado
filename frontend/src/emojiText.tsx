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
  emojiByCode: Map<string, { url: string }>,
  keyPrefix = ""
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
      <img
        key={`${keyPrefix}emoji-${key++}`}
        className="chat-emoji"
        src={emoji.url}
        alt={full}
        title={full}
      />
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

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/g;
// Pontuação comum que costuma vir GRUDADA no fim de um link dentro de uma
// frase (ex: "olha isso: https://x.com.") mas não faz parte da URL.
const TRAILING_PUNCTUATION_REGEX = /[).,!?;:]+$/;

/**
 * Mesma coisa que `renderMessageText`, mas também reconhece URLs
 * (http/https) no meio do texto e transforma em link clicável. Emoji
 * personalizado dentro dos trechos de texto continua funcionando normal.
 */
export function renderMessageContent(
  text: string,
  emojiByCode: Map<string, { url: string }>
): ReactNode[] {
  const segments = text.split(URL_SPLIT_REGEX);
  const nodes: ReactNode[] = [];

  segments.forEach((segment, i) => {
    if (!segment) return;

    if (/^https?:\/\//.test(segment)) {
      const trailingMatch = segment.match(TRAILING_PUNCTUATION_REGEX);
      const trailing = trailingMatch ? trailingMatch[0] : "";
      const url = trailing ? segment.slice(0, -trailing.length) : segment;

      nodes.push(
        <a key={`link-${i}`} href={url} target="_blank" rel="noreferrer" className="chat-link">
          {url}
        </a>
      );
      if (trailing) nodes.push(trailing);
    } else {
      nodes.push(...renderMessageText(segment, emojiByCode, `seg${i}-`));
    }
  });

  return nodes;
}
