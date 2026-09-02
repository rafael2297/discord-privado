import { ArrowDownCircle, Loader2 } from "lucide-react";
import { useUpdateStatus } from "../UpdateContext";

/**
 * Versão compacta do aviso de atualização, pra ficar dentro do
 * cabeçalho do app (main-header), do lado esquerdo do botão de
 * mostrar/esconder membros — não é um elemento flutuante como o
 * <UpdateBanner> das telas de login/hospedar.
 */
export default function UpdateBadge() {
  const { status, installing, install } = useUpdateStatus();

  if (!status) return null;

  const ready = status.status === "downloaded";

  return (
    <button
      className={`update-badge ${ready ? "ready" : "downloading"}`}
      onClick={install}
      disabled={!ready || installing}
      title={
        ready
          ? `Instalar v${status.version} e reiniciar o app`
          : `Baixando a versão v${status.version}...`
      }
    >
      {ready ? <ArrowDownCircle size={14} /> : <Loader2 size={14} className="update-banner-spin" />}
      <span>{ready ? "Nova versão" : "Baixando..."}</span>
    </button>
  );
}
