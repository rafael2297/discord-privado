/**
 * Inicia backend e LiveKit como processos filho do app (via o processo
 * principal do Electron) e espera cada um responder no health-check antes
 * de considerar "pronto".
 *
 * Só funciona dentro do app Electron empacotado — no navegador
 * (`npm run dev`), isEnvElectron() retorna false e quem chama deve usar o
 * fluxo manual antigo (digitar a URL do backend).
 */

interface ElectronAPI {
  isElectron: true;
  listNetworkInterfaces: () => Promise<{ name: string; address: string }[]>;
  startBackend: (env: Record<string, string>) => Promise<{ url: string }>;
  stopBackend: () => Promise<void>;
  startLiveKit: (nodeIp: string) => Promise<void>;
  stopLiveKit: () => Promise<void>;
  onHostLog: (callback: (line: string) => void) => () => void;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
  installUpdate: () => Promise<void>;
}

export interface UpdateStatus {
  status: "available" | "downloaded";
  version: string;
}

function getElectronAPI(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  return (window as any).electronAPI ?? null;
}

export function isEnvElectron(): boolean {
  return getElectronAPI() !== null;
}

export async function startBackendSidecar(
  options: { env?: Record<string, string>; onLog?: (line: string) => void } = {}
): Promise<{ url: string }> {
  const api = getElectronAPI();
  if (!api) {
    throw new Error("startBackendSidecar só funciona dentro do app instalado (Electron).");
  }

  let removeListener: (() => void) | null = null;
  if (options.onLog) {
    removeListener = api.onHostLog(options.onLog);
  }

  try {
    return await api.startBackend(options.env ?? {});
  } finally {
    removeListener?.();
  }
}

export async function stopBackendSidecar(): Promise<void> {
  await getElectronAPI()?.stopBackend();
}

export async function startLiveKitSidecar(
  nodeIp: string,
  onLog?: (line: string) => void
): Promise<void> {
  const api = getElectronAPI();
  if (!api) {
    throw new Error("startLiveKitSidecar só funciona dentro do app instalado (Electron).");
  }

  let removeListener: (() => void) | null = null;
  if (onLog) {
    removeListener = api.onHostLog(onLog);
  }

  try {
    await api.startLiveKit(nodeIp);
  } finally {
    removeListener?.();
  }
}

export async function stopLiveKitSidecar(): Promise<void> {
  await getElectronAPI()?.stopLiveKit();
}

/**
 * Escuta os avisos de atualização (ver UpdateBanner.tsx). Fora do
 * Electron (navegador, npm run dev) não faz nada — não existe checagem
 * de atualização fora do app instalado.
 */
export function onUpdateStatus(callback: (status: UpdateStatus) => void): () => void {
  const api = getElectronAPI();
  if (!api) return () => {};
  return api.onUpdateStatus(callback);
}

/** Fecha o app e instala a versão já baixada (o instalador reabre sozinho). */
export async function installUpdate(): Promise<void> {
  await getElectronAPI()?.installUpdate();
}
