import fs from "fs";
import path from "path";
import os from "os";

// Duas gerações de pasta antiga a migrar, na ordem certa:
// 1) %APPDATA%\discord-privado\ — nome do app antes de virar Murmity.
// 2) resources\backend\data\ — de antes da correção que tirou os dados
//    de dentro da pasta de instalação (ver seção 5 do PROJECT_CONTEXT.md).
// Sem migrar a nº 1, renomear o app pra Murmity teria o EXATO mesmo
// efeito do bug antigo: chat/sons/emojis "sumindo" pra quem já usava.
const LEGACY_APPDATA_DIR_NAME = "discord-privado";
const OLDEST_DATA_DIR = path.join(__dirname, "..", "data");

function resolveBaseDir(): string {
  // %APPDATA% é o padrão do Windows (só onde o app roda hoje). Os outros
  // dois são só pra rodar em dev fora do Windows sem quebrar; não há
  // instalador de Mac/Linux ainda (ver PROJECT_CONTEXT.md).
  return (
    process.env.APPDATA ||
    (process.platform === "darwin"
      ? path.join(os.homedir(), "Library", "Application Support")
      : path.join(os.homedir(), ".local", "share"))
  );
}

let cachedDataDir: string | null = null;

function migrateIfNeeded(dataDir: string, legacyDir: string, label: string) {
  try {
    if (!fs.existsSync(dataDir) && fs.existsSync(legacyDir)) {
      fs.mkdirSync(path.dirname(dataDir), { recursive: true });
      fs.cpSync(legacyDir, dataDir, { recursive: true });
      console.log(`[dados] Migrado (${label}): ${legacyDir} -> ${dataDir}`);
    }
  } catch (err) {
    console.warn(`[dados] Falha ao migrar pasta antiga (${label}), seguindo sem migrar:`, err);
  }
}

/**
 * Pasta de dados persistente do app — INDEPENDENTE de onde o executável
 * do backend está instalado, pra sobreviver a atualizações (o
 * instalador NSIS substitui a pasta de instalação inteira a cada
 * update). Guardar no perfil do usuário é o mesmo que qualquer app de
 * desktop de verdade faz.
 *
 * Migra automaticamente, na primeira vez que roda: primeiro tenta achar
 * dados na pasta do nome antigo do app (%APPDATA%\discord-privado\);
 * se não achar nada ali, tenta a pasta ainda mais antiga (do lado do
 * .exe, de antes dessa migração existir). Sem isso, cada mudança de
 * nome/local faria parecer que o chat/sons/emojis "sumiram".
 *
 * Pode ser sobrescrito por variável de ambiente DATA_DIR (usado no
 * Docker, ver docker-compose.yml).
 */
export function getDataDir(): string {
  if (cachedDataDir) return cachedDataDir;

  if (process.env.DATA_DIR) {
    cachedDataDir = process.env.DATA_DIR;
    fs.mkdirSync(cachedDataDir, { recursive: true });
    return cachedDataDir;
  }

  const dataDir = path.join(resolveBaseDir(), "murmity");

  if (!fs.existsSync(dataDir)) {
    const legacyAppDataDir = path.join(resolveBaseDir(), LEGACY_APPDATA_DIR_NAME);
    migrateIfNeeded(dataDir, legacyAppDataDir, "nome antigo do app");
  }
  if (!fs.existsSync(dataDir)) {
    migrateIfNeeded(dataDir, OLDEST_DATA_DIR, "pasta ao lado do .exe");
  }

  fs.mkdirSync(dataDir, { recursive: true });
  cachedDataDir = dataDir;
  return dataDir;
}
