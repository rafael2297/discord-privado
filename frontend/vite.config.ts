import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Caminhos relativos nos assets do build — essencial pro Electron
  // conseguir carregar o index.html via file:// (caminhos absolutos tipo
  // "/assets/x.js" quebram nesse contexto, viram tela branca).
  base: "./",
  server: {
    // host: true permite acessar o servidor de dev por outro IP (ex: pelo
    // Tailscale), não só localhost — útil pra rodar `npm run dev:lan` e
    // deixar um amigo acessar direto sem cada um rodar o próprio frontend.
    host: true,
  },
});
