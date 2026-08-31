export interface AuthUser {
  username: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface JoinTokenResult {
  token: string;
  url: string;
  identity: string;
  room: string;
}

export interface VoiceParticipant {
  identity: string;
}

export async function fetchVoiceParticipants(
  backendUrl: string,
  authToken: string,
  roomName: string
): Promise<VoiceParticipant[]> {
  const res = await fetch(`${backendUrl}/rooms/${encodeURIComponent(roomName)}/participants`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = await parseJsonOrThrow(res);
  return data.participants;
}

async function parseJsonOrThrow(res: Response): Promise<any> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem corpo JSON (ex: erro de rede tratado antes de chegar aqui)
  }
  if (!res.ok) {
    throw new Error(data?.error || `Erro ${res.status}`);
  }
  return data;
}

/**
 * Substitui login/cadastro: só um nome, sem senha nem conta persistente.
 */
export async function identify(backendUrl: string, username: string): Promise<AuthResult> {
  const res = await fetch(`${backendUrl}/auth/identify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  return parseJsonOrThrow(res);
}

export async function fetchJoinToken(
  backendUrl: string,
  authToken: string,
  roomName: string
): Promise<JoinTokenResult> {
  const res = await fetch(`${backendUrl}/rooms/${encodeURIComponent(roomName)}/join-token`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return parseJsonOrThrow(res);
}
