import { Router } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { db } from "./db";
import { getDataDir } from "./paths";
import { requireAuth, AuthedRequest } from "./middleware";

const router = Router();

// Sons ficam em <pasta de dados>/sounds/<id><extensão> — mesma base do
// banco SQLite (ver paths.ts), na pasta de dados do usuário, NÃO do lado
// do .exe, pra sobreviver a atualizações do app.
export const SOUNDS_DIR = process.env.SOUNDS_DIR || path.join(getDataDir(), "sounds");
fs.mkdirSync(SOUNDS_DIR, { recursive: true });

// Guarda-corpo técnico, NÃO é um limite "estilo Discord": sem isso, um
// arquivo enorme enviado por engano derrubaria o backend ou lotaria o
// disco. Não há limite de DURAÇÃO nem de QUANTIDADE de sons — só esse
// teto de tamanho de arquivo por segurança. Aumente se precisar.
const MAX_SOUND_BYTES = 100 * 1024 * 1024; // 100 MB

interface SoundRow {
  id: string;
  name: string;
  filename: string;
  added_by: string;
  created_at: number;
}

const insertStmt = db.prepare(
  "INSERT INTO sounds (id, name, filename, added_by, created_at) VALUES (?, ?, ?, ?, ?)"
);
const listStmt = db.prepare("SELECT * FROM sounds ORDER BY created_at ASC");
const getStmt = db.prepare("SELECT * FROM sounds WHERE id = ?");
const deleteStmt = db.prepare("DELETE FROM sounds WHERE id = ?");

function toPublic(row: SoundRow) {
  return {
    id: row.id,
    name: row.name,
    addedBy: row.added_by,
    createdAt: row.created_at,
    url: `/sounds/files/${row.filename}`,
  };
}

function sanitizeExtension(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase().replace(/[^a-z0-9.]/g, "");
  // Sem extensão reconhecível, salva sem ela — o navegador toca do mesmo
  // jeito pelo Content-Type, só o nome do arquivo no disco fica genérico.
  return ext && ext.length <= 6 ? ext : "";
}

/**
 * Corta uma string por CARACTERE (ponto de código Unicode), não por
 * unidade UTF-16 crua como o `.slice()` normal faz. Isso importa pra
 * suportar emoji no nome do som (planejado, ver PROJECT_CONTEXT.md) —
 * a maioria dos emojis usa 2 unidades UTF-16 (surrogate pair), e um
 * `.slice()` ingênuo pode cortar bem no meio de um, corrompendo o
 * caractere. `Array.from` já separa certo por caractere percebido o
 * suficiente pra esse caso (emoji simples; sequências compostas com
 * ZWJ/variação ainda podem, em teoria, ser separadas — não é um problema
 * prático aqui, com nomes curtos de som).
 */
function truncateByCharacter(text: string, maxLength: number): string {
  return Array.from(text).slice(0, maxLength).join("");
}

/** GET /sounds — lista todos os sons disponíveis pra tocar. */
router.get("/", requireAuth, (_req, res) => {
  const rows = listStmt.all() as unknown as SoundRow[];
  res.json({ sounds: rows.map(toPublic) });
});

/**
 * POST /sounds?name=...&filename=...
 * Corpo: bytes crus do arquivo de áudio (Content-Type = tipo do arquivo,
 * ex: audio/mpeg). Sem limite de duração nem de quantidade de sons — só
 * o teto de tamanho de arquivo (MAX_SOUND_BYTES) por segurança técnica.
 */
router.post(
  "/",
  requireAuth,
  express.raw({ type: () => true, limit: MAX_SOUND_BYTES }),
  (req: AuthedRequest, res) => {
    const name = typeof req.query.name === "string" ? truncateByCharacter(req.query.name.trim(), 60) : "";
    const originalFilename = typeof req.query.filename === "string" ? req.query.filename : "";

    if (!name) {
      res.status(400).json({ error: "Nome do som é obrigatório" });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Arquivo de áudio vazio ou ausente" });
      return;
    }

    const id = randomUUID();
    const ext = sanitizeExtension(originalFilename);
    const filename = `${id}${ext}`;

    fs.writeFileSync(path.join(SOUNDS_DIR, filename), req.body);

    const row: SoundRow = {
      id,
      name,
      filename,
      added_by: req.user!.username,
      created_at: Date.now(),
    };
    insertStmt.run(row.id, row.name, row.filename, row.added_by, row.created_at);

    res.status(201).json({ sound: toPublic(row) });
  }
);

/**
 * DELETE /sounds/:id — remove um som (arquivo + registro). Só quem
 * adicionou pode remover (checagem simples por username, sem cargo/admin
 * de verdade — aceitável pro tamanho do grupo, igual o resto do app).
 */
router.delete("/:id", requireAuth, (req: AuthedRequest, res) => {
  const row = getStmt.get(req.params.id) as unknown as SoundRow | undefined;
  if (!row) {
    res.status(404).json({ error: "Som não encontrado" });
    return;
  }
  if (row.added_by !== req.user!.username) {
    res.status(403).json({ error: "Só quem adicionou esse som pode removê-lo" });
    return;
  }

  deleteStmt.run(row.id);
  fs.rm(path.join(SOUNDS_DIR, row.filename), { force: true }, () => {});

  res.json({ ok: true });
});

export default router;
