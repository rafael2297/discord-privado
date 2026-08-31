import { useEffect, useState } from "react";

interface DesktopSource {
  id: string;
  name: string;
  thumbnailDataURL: string;
}

interface Props {
  onPick: (sourceId: string | null) => void;
}

export default function ScreenSharePicker({ onPick }: Props) {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (window as any).electronAPI
      .getDesktopSources()
      .then((s: DesktopSource[]) => {
        setSources(s);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="modal-backdrop" onClick={() => onPick(null)}>
      <div className="modal screen-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>O que você quer compartilhar?</h3>
        </div>

        {loading && <p className="device-select-empty">Carregando telas e janelas...</p>}

        {!loading && sources.length === 0 && (
          <p className="device-select-empty">Nenhuma tela ou janela encontrada.</p>
        )}

        <div className="screen-picker-grid">
          {sources.map((s) => (
            <button key={s.id} className="screen-picker-item" onClick={() => onPick(s.id)}>
              <img src={s.thumbnailDataURL} alt={s.name} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>

        <button className="secondary-btn" onClick={() => onPick(null)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
