import { ArrowDownCircle, Loader2 } from "lucide-react";
import { useUpdateStatus } from "../UpdateContext";

/**
 * Aviso "Nova versão" fixo no canto superior direito — usado só nas
 * telas de login/hospedar (antes de entrar no app). Dentro do app, o
 * aviso equivalente é o <UpdateBadge> no cabeçalho (ver MainContent.tsx
 * e CallView.tsx), ao lado do botão de mostrar/esconder membros.
 */
export default function UpdateBanner() {
  const { status, installing, install } = useUpdateStatus();

  if (!status) return null;

  const ready = status.status === "downloaded";

  return (
    <button
      className={`update-banner ${ready ? "ready" : "downloading"}`}
      onClick={install}
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
