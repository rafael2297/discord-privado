import { isEnvElectron } from "./host";

export interface NetworkInterfaceOption {
  name: string;
  address: string;
  label: string;
}

/**
 * Classifica uma interface de rede por heurística (nome da interface e
 * faixa de IP conhecida). Isso é a "abstração de rede" mencionada no
 * PROJECT_CONTEXT.md (seção 13) — hoje é só uma heurística simples, não
 * um NetworkProvider plugável de verdade ainda, mas já cobre os 3 casos
 * pedidos: Tailscale, Radmin VPN, rede local.
 */
function classify(name: string, address: string): string {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("tailscale")) return "Tailscale";
  if (lowerName.includes("radmin")) return "Radmin VPN";

  // Tailscale sempre usa a faixa 100.64.0.0/10 (CGNAT range)
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(address)) return "Tailscale (provável)";
  // Radmin VPN historicamente usa a faixa 26.0.0.0/8
  if (address.startsWith("26.")) return "Radmin VPN (provável)";

  if (
    address.startsWith("192.168.") ||
    address.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  ) {
    return "Rede local";
  }

  return "Outra";
}

const PRIORITY = [
  "Tailscale",
  "Tailscale (provável)",
  "Radmin VPN",
  "Radmin VPN (provável)",
  "Rede local",
  "Outra",
];

export async function listNetworkInterfaces(): Promise<NetworkInterfaceOption[]> {
  if (!isEnvElectron()) return [];
  const api = (window as any).electronAPI;
  const raw: { name: string; address: string }[] = await api.listNetworkInterfaces();
  return raw
    .map((iface) => ({ ...iface, label: classify(iface.name, iface.address) }))
    .sort((a, b) => PRIORITY.indexOf(a.label) - PRIORITY.indexOf(b.label));
}

export function pickBestInterface(
  interfaces: NetworkInterfaceOption[]
): NetworkInterfaceOption | null {
  if (interfaces.length === 0) return null;
  for (const label of PRIORITY) {
    const found = interfaces.find((i) => i.label === label);
    if (found) return found;
  }
  return interfaces[0];
}
