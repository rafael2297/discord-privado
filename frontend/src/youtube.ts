const YOUTUBE_REGEX =
  /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s]*/;

/** Primeira URL de vídeo do YouTube encontrada no texto, ou null se não tiver nenhuma. */
export function extractFirstYoutubeUrl(text: string): string | null {
  const match = text.match(YOUTUBE_REGEX);
  return match ? match[0] : null;
}
