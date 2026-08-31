import { useMediaDeviceSelect } from "@livekit/components-react";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  inCall: boolean;
  username: string;
  backendUrl: string;
  onLogout: () => void;
}

function DeviceSelect({ kind, label }: { kind: MediaDeviceKind; label: string }) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind });

  if (devices.length === 0) {
    return (
      <div className="device-select">
        <label>{label}</label>
        <p className="device-select-empty">Nenhum dispositivo encontrado.</p>
      </div>
    );
  }

  return (
    <div className="device-select">
      <label>{label}</label>
      <select value={activeDeviceId} onChange={(e) => setActiveMediaDevice(e.target.value)}>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Dispositivo ${d.deviceId.slice(0, 6)}`}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SettingsModal({ onClose, inCall, username, backendUrl, onLogout }: Props) {
  function handleLogoutClick() {
    if (inCall) {
      const confirmed = window.confirm(
        "Trocar de nome/servidor vai te desconectar da call de voz agora. Continuar?"
      );
      if (!confirmed) return;
    }
    onClose();
    onLogout();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Configurações</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-section">
          <div className="modal-section-title">Dispositivos</div>
          {inCall ? (
            <>
              <DeviceSelect kind="audioinput" label="Microfone" />
              <DeviceSelect kind="videoinput" label="Câmera" />
              <DeviceSelect kind="audiooutput" label="Saída de áudio (alto-falante)" />
              <p className="device-select-note">
                Saída de áudio pode não funcionar no Firefox (suporte limitado do navegador).
              </p>
            </>
          ) : (
            <p className="device-select-empty">
              Entre no canal de voz pra poder trocar microfone/câmera.
            </p>
          )}
        </div>

        <div className="modal-section">
          <div className="modal-section-title">Conta</div>
          <p className="account-info">
            Logado como <strong>{username}</strong>
            <br />
            Servidor: {backendUrl}
          </p>
          <button className="secondary-btn" onClick={handleLogoutClick}>
            Trocar de nome/servidor
          </button>
        </div>
      </div>
    </div>
  );
}
