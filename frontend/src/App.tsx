import { useState } from "react";
import StartScreen from "./components/StartScreen";
import LoginScreen from "./components/LoginScreen";
import Workspace from "./components/Workspace";
import UpdateBanner from "./components/UpdateBanner";
import { AuthUser } from "./api";
import { isEnvElectron } from "./host";

interface Session {
  backendUrl: string;
  token: string;
  user: AuthUser;
}

// Fora do Electron (navegador, npm run dev), pula direto pro fluxo antigo
// de login manual — a tela de "Hospedar/Entrar" só faz sentido no app
// instalado, onde dá pra rodar o backend/LiveKit como processo filho.
type Screen = "start" | "login";

function loadSession(): Session | null {
  // No Electron, sempre recomeça pela tela inicial — backend/LiveKit são
  // processos filho que não continuam rodando entre uma abertura e outra
  // do app, então "lembrar" que você tinha hospedado antes é enganoso
  // (a sessão salva aponta pra um servidor que não está mais de pé).
  if (isEnvElectron()) return null;

  const raw = localStorage.getItem("session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession());
  const [screen, setScreen] = useState<Screen>(isEnvElectron() ? "start" : "login");
  const [prefillBackendUrl, setPrefillBackendUrl] = useState<string | undefined>(undefined);

  function handleAuthenticated(params: Session) {
    localStorage.setItem("session", JSON.stringify(params));
    setSession(params);
  }

  function handleLogout() {
    localStorage.removeItem("session");
    setSession(null);
    setScreen(isEnvElectron() ? "start" : "login");
  }

  if (!session) {
    return (
      <div className="app-shell">
        <UpdateBanner />
        <header>
          <h1>🎧 Discord Privado</h1>
        </header>
        <main>
          {screen === "start" ? (
            <StartScreen
              onHostReady={(backendUrl) => {
                setPrefillBackendUrl(backendUrl);
                setScreen("login");
              }}
              onJoinExisting={() => setScreen("login")}
            />
          ) : (
            <LoginScreen
              onAuthenticated={handleAuthenticated}
              initialBackendUrl={prefillBackendUrl}
              onBack={isEnvElectron() ? () => setScreen("start") : undefined}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <>
      <UpdateBanner />
      <Workspace
        backendUrl={session.backendUrl}
        authToken={session.token}
        username={session.user.username}
        onLogout={handleLogout}
      />
    </>
  );
}
