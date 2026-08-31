-- Migration inicial: tabela de usuários.
-- Por enquanto aplicada automaticamente pelo próprio backend ao iniciar
-- (ver src/db.ts). Uma ferramenta de migration de verdade (ex: node-pg-migrate)
-- entra quando o modelo de dados crescer (grupos, canais, mensagens — P4-P7).

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
