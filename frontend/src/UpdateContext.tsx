import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onUpdateStatus, installUpdate, UpdateStatus } from "./host";

interface UpdateContextValue {
  status: UpdateStatus | null;
  installing: boolean;
  install: () => void;
}

const UpdateContext = createContext<UpdateContextValue>({
  status: null,
  installing: false,
  install: () => {},
});

/**
 * Fica montado UMA vez, no topo do App inteiro (fora de qualquer tela
 * condicional) — assim o estado sobrevive quando o usuário sai da tela
 * de login/hospedar e entra no Workspace. Bug corrigido: antes o
 * <UpdateBanner> era montado separadamente em cada tela, e como o
 * evento "update-status" só é disparado UMA vez pelo processo principal
 * (ao abrir o app), a instância nova (depois de trocar de tela) nunca
 * recebia o evento — só a primeira, que já tinha sido desmontada.
 */
export function UpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    return onUpdateStatus(setStatus);
  }, []);

  async function install() {
    if (status?.status !== "downloaded" || installing) return;
    setInstalling(true);
    try {
      await installUpdate();
    } catch {
      setInstalling(false);
    }
  }

  return <UpdateContext.Provider value={{ status, installing, install }}>{children}</UpdateContext.Provider>;
}

export function useUpdateStatus() {
  return useContext(UpdateContext);
}
