import { useEffect, useState } from "react";
import { ArrowDownCircle, Loader2 } from "lucide-react";
import { onUpdateStatus, installUpdate, UpdateStatus } from "../host";

/**
 * Aviso "Nova versão" no canto superior direito — aparece sozinho quando
 * o electron-updater encontra uma atualização no GitHub Releases (ver
 * main.cjs). Enquanto ainda está baixando, mostra só um spinner (não dá
 * pra instalar ainda); quando termina de baixar, fica clicável e instala
 * ao clicar. Fora do Electron (navegador) não faz nada — onUpdateStatus
 * nunca dispara.
 */
export default function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    return onUpdateStatus(setStatus);
  }, []);

  if (!status) return null;

  const ready = status.status === "downloaded";

  async function handleClick() {
    if (!ready || installing) return;
    setInstalling(true);
    try {
      await installUpdate();
    } catch {
      setInstalling(false);
    }
  }

  return (
    <button
      className={`update-banner ${ready ? "ready" : "downloading"}`}
      onClick={handleClick}
      disabled={!ready || installing}
      title={
        ready
          ? `Instalar v${status.version} e reiniciar o app`
          : `Baixando a versão v${status.version}...`
      }
    >
      {ready ? <ArrowDownCircle size={16} /> : <Loader2 size={16} className="update-banner-spin" />}
      <span>{ready ? "Nova versão" : "Baixando atualização..."}</span>
    </button>
  );
}
