import { Router } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { getDataDir } from "./paths";
import { requireAuth, AuthedRequest } from "./middleware";

const router = Router();

// Anexos de mensagem (imagem/áudio) ficam em <pasta de dados>/attachments/
// — diferente de sons/emojis, não têm um catálogo reutilizável próprio no
// banco: são um anexo de UMA mensagem específica, e a própria linha da
// mensagem (tabela messages) guarda a URL. Ver paths.ts pra pasta base.
export const ATTACHMENTS_DIR = process.env.ATTACHMENTS_DIR || path.join(getDataDir(), "attachments");
fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

// Guarda-corpo técnico (não é limite de feature): evita anexo gigante
// travando o backend ou lotando o disco.
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_KINDS = ["image", "audio"] as const;
type Kind = (typeof ALLOWED_KINDS)[number];

function sanitizeExtension(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase().replace(/[^a-z0-9.]/g, "");
  return ext && ext.length <= 6 ? ext : "";
}

/**
 * POST /attachments?kind=image|audio&filename=...
 * Corpo: bytes crus do arquivo (Content-Type = tipo do arquivo). O
 * frontend faz esse upload primeiro e só manda a mensagem de chat de
 * verdade (via WebSocket) depois, com a URL que essa rota devolve.
 */
router.post(
  "/",
  requireAuth,
  express.raw({ type: () => true, limit: MAX_ATTACHMENT_BYTES }),
  (req: AuthedRequest, res) => {
    const kind = req.query.kind as Kind;
    if (!ALLOWED_KINDS.includes(kind)) {
      res.status(400).json({ error: "kind precisa ser 'image' ou 'audio'" });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Arquivo vazio ou ausente" });
      return;
    }

    const originalFilename = typeof req.query.filename === "string" ? req.query.filename : "";
    const id = randomUUID();
    const ext = sanitizeExtension(originalFilename);
    const filename = `${id}${ext}`;

    fs.writeFileSync(path.join(ATTACHMENTS_DIR, filename), req.body);

    res.status(201).json({
      url: `/attachments/files/${filename}`,
      type: kind,
      name: originalFilename || filename,
    });
  }
);

export default router;
