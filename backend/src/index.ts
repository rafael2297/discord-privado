import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import "dotenv/config";
import identifyRouter from "./identify";
import roomsRouter from "./rooms";
import { setupChat } from "./chat";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", identifyRouter);
app.use("/rooms", roomsRouter);

// WebSocket precisa de um servidor HTTP explícito (não dá pra usar
// app.listen direto quando também tem WS na mesma porta).
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/chat" });
setupChat(wss);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT} (HTTP + WebSocket /ws/chat)`);
});
