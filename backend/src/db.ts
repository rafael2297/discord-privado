import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

// node:sqlite é embutido no próprio Node.js (>=22.5) — sem módulo nativo
// externo pra compilar. Isso é essencial pra poder empacotar o backend num
// executável único (SEA) sem depender de toolchain de compilação (o
// better-sqlite3 antigo exigia python3/make/g++ e não empacota bem num
// único .exe). "Experimental" no Node só emite um aviso no console, não
// impede o uso.
//
// DB_PATH configurável (usado no Docker, ver docker-compose.yml). Fora do
// Docker/exe empacotado, cai num arquivo local em backend/data/chat.db.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "chat.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`);
