import { Router } from "express";
import { requireAuth } from "./middleware";

const router = Router();

const YOUTUBE_PATTERN =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

interface YoutubeOEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

/**
 * GET /link-preview?url=...
 *
 * Hoje só sabe fazer preview de link do YouTube, usando o oEmbed oficial
 * deles (não precisa de chave de API). Qualquer outro link continua
 * funcionando no chat normalmente, só que como link clicável simples,
 * sem card — dá pra estender esse endpoint no futuro pra outros sites
 * (Open Graph genérico) se fizer falta.
 *
 * Por que isso precisa passar pelo backend em vez do frontend chamar
 * direto: o oEmbed do YouTube não manda cabeçalho de CORS, então o
 * navegador bloqueia um fetch direto de dentro do app.
 */
router.get("/", requireAuth, async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";
  const match = url.match(YOUTUBE_PATTERN);
  if (!match) {
    res.status(404).json({ error: "Sem preview disponível pra esse link" });
    return;
  }

  const videoId = match[1];
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    if (!oembedRes.ok) {
      res.status(404).json({ error: "Vídeo não encontrado, privado ou removido" });
      return;
    }
    const data = (await oembedRes.json()) as YoutubeOEmbedResponse;
    res.json({
      type: "youtube",
      videoId,
      title: data.title ?? "",
      authorName: data.author_name ?? "",
      thumbnailUrl: data.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  } catch (err) {
    console.error("Erro buscando preview do YouTube:", err);
    res.status(502).json({ error: "Não foi possível buscar informações do vídeo agora" });
  }
});

export default router;
