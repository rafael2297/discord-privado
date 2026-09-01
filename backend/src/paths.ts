import fs from "fs";
import path from "path";
import os from "os";

// Onde os dados (chat.db, sons, emojis) ficavam antes dessa correção:
// do lado do próprio .exe, dentro de resources/backend/data/. O
// problema: toda atualização do app substitui a pasta de instalação
// inteira (incluindo resources/), então tudo que morava ali era apagado
// a cada update. Ver PROJECT_CONTEXT.md.
const OLD_DATA_DIR = path.join(__dirname, "..", "data");

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

/**
 * Pasta de dados persistente do app — INDEPENDENTE de onde o executável
 * do backend está instalado, pra sobreviver a atualizações (o
 * instalador NSIS substitui a pasta de instalação inteira a cada
 * update). Guardar no perfil do usuário é o mesmo que qualquer app de
 * desktop de verdade faz.
 *
 * Na primeira vez que roda com essa correção, migra automaticamente
 * quem já tinha dados na pasta antiga (do lado do .exe) — sem isso,
 * quem já usava o app veria o chat/sons/emojis "sumirem" de vez nessa
 * atualização específica, mesmo já não perdendo mais nada dali em diante.
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

  const dataDir = path.join(resolveBaseDir(), "discord-privado");

  try {
    if (!fs.existsSync(dataDir) && fs.existsSync(OLD_DATA_DIR)) {
      fs.mkdirSync(path.dirname(dataDir), { recursive: true });
      fs.cpSync(OLD_DATA_DIR, dataDir, { recursive: true });
      console.log(`[dados] Pasta antiga migrada: ${OLD_DATA_DIR} -> ${dataDir}`);
    }
  } catch (err) {
    console.warn("[dados] Falha ao migrar pasta de dados antiga (seguindo com pasta nova vazia):", err);
  }

  fs.mkdirSync(dataDir, { recursive: true });
  cachedDataDir = dataDir;
  return dataDir;
}
