import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { IncomingMessage } from "http";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET as string;

// Canal de texto único (mesma decisão do canal de voz "geral"). Mensagens
// persistem em SQLite (backend/data/chat.db) — sobrevivem a reinício do
// backend agora. Mantemos só as últimas HISTORY_CAP pra não crescer sem
// limite (grupo pequeno, não precisa de paginação/arquivamento ainda).
const HISTORY_LIMIT = 50; // quantas mensagens mandar pro cliente ao conectar
const HISTORY_CAP = 500; // quantas mensagens manter no banco no total

// Anexo é opcional e pode vir SOZINHO (sem texto, ex: mandou só um GIF)
// ou junto com texto (ex: legenda + imagem). "gif" é uma URL externa
// (Tenor), "image"/"audio" apontam pro nosso próprio /attachments/files.
type AttachmentType = "image" | "audio" | "gif";
const ALLOWED_ATTACHMENT_TYPES: AttachmentType[] = ["image", "audio", "gif"];

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  attachmentUrl?: string | null;
  attachmentType?: AttachmentType | null;
  attachmentName?: string | null;
}

const insertStmt = db.prepare(
  `INSERT INTO messages (id, username, text, timestamp, attachment_url, attachment_type, attachment_name)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const historyStmt = db.prepare(
  `SELECT id, username, text, timestamp, attachment_url, attachment_type, attachment_name
   FROM messages ORDER BY timestamp DESC LIMIT ?`
);
const pruneStmt = db.prepare(
  "DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY timestamp DESC LIMIT ?)"
);

interface MessageRow {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
}

function rowToMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    username: row.username,
    text: row.text,
    timestamp: row.timestamp,
    attachmentUrl: row.attachment_url,
    attachmentType: row.attachment_type as AttachmentType | null,
    attachmentName: row.attachment_name,
  };
}

function getHistory(): ChatMessage[] {
  const rows = historyStmt.all(HISTORY_LIMIT) as unknown as MessageRow[];
  return rows.reverse().map(rowToMessage); // banco devolve mais recente primeiro, chat quer cronológico
}

const clients = new Set<WebSocket>();

// Rastreia quem está "online" (com o app aberto e conectado no chat) —
// independente de estar na call de voz ou não. Usa identity -> conjunto de
// sockets, pra funcionar direito se a mesma pessoa abrir 2 abas/janelas
// (só sai da lista quando a ÚLTIMA conexão dela fechar).
const onlineByIdentity = new Map<string, Set<WebSocket>>();

function broadcastPresence() {
  const payload = JSON.stringify({ type: "presence", online: Array.from(onlineByIdentity.keys()) });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function verifyToken(req: IncomingMessage): { username: string } | null {
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET) as { username: string };
  } catch {
    return null;
  }
}

export function setupChat(wss: WebSocketServer) {
  wss.on("connection", (ws, req) => {
    const auth = verifyToken(req);
    if (!auth) {
      ws.close(4001, "token inválido ou ausente");
      return;
    }
    const username = auth.username;

    clients.add(ws);

    if (!onlineByIdentity.has(username)) {
      onlineByIdentity.set(username, new Set());
    }
    onlineByIdentity.get(username)!.add(ws);
    broadcastPresence();

    ws.send(JSON.stringify({ type: "history", messages: getHistory() }));

    ws.on("message", (raw) => {
      let data: unknown;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (typeof data !== "object" || data === null || (data as any).type !== "send") {
        return;
      }

      const rawText = typeof (data as any).text === "string" ? (data as any).text : "";
      const text = rawText.trim().slice(0, 2000);

      const rawAttachmentUrl = (data as any).attachmentUrl;
      const rawAttachmentType = (data as any).attachmentType;
      const hasAttachment =
        typeof rawAttachmentUrl === "string" &&
        rawAttachmentUrl.length > 0 &&
        ALLOWED_ATTACHMENT_TYPES.includes(rawAttachmentType);

      // Mensagem precisa ter TEXTO ou ANEXO — as duas vazias não é uma
      // mensagem de verdade.
      if (!text && !hasAttachment) return;

      const message: ChatMessage = {
        id: randomUUID(),
        username,
        text,
        timestamp: Date.now(),
        attachmentUrl: hasAttachment ? rawAttachmentUrl : null,
        attachmentType: hasAttachment ? (rawAttachmentType as AttachmentType) : null,
        attachmentName:
          hasAttachment && typeof (data as any).attachmentName === "string"
            ? (data as any).attachmentName.slice(0, 200)
            : null,
      };

      insertStmt.run(
        message.id,
        message.username,
        message.text,
        message.timestamp,
        message.attachmentUrl ?? null,
        message.attachmentType ?? null,
        message.attachmentName ?? null
      );
      pruneStmt.run(HISTORY_CAP);

      const payload = JSON.stringify({ type: "message", message });
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    });

    ws.on("close", () => {
      clients.delete(ws);

      const sockets = onlineByIdentity.get(username);
      sockets?.delete(ws);
      if (sockets && sockets.size === 0) {
        onlineByIdentity.delete(username);
      }
      broadcastPresence();
    });
  });
}
