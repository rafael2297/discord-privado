import { isEnvElectron } from "./host";

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

/**
 * Só notifica se a janela não estiver em foco — evita spam de notificação
 * enquanto a pessoa já está olhando pro app.
 */
function shouldNotify(): boolean {
  return typeof document !== "undefined" && document.hidden === false
    ? !document.hasFocus()
    : true;
}

export function notify(title: string, body: string) {
  if (!canNotify() || Notification.permission !== "granted") return;
  if (!shouldNotify()) return;

  const n = new Notification(title, { body });
  n.onclick = () => {
    if (isEnvElectron()) {
      (window as any).electronAPI?.focusWindow?.();
    } else {
      window.focus();
    }
  };
}
