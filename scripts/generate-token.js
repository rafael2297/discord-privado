/**
 * Gera um token JWT de acesso ao LiveKit para testes manuais.
 *
 * Em produção isso vira o endpoint POST /rooms/:id/join-token do backend
 * (Phoenix ou Node), que:
 *   1. valida se o usuário tem permissão na sala
 *   2. gera esse mesmo token, assinado com API key/secret do LiveKit
 *   3. devolve pro frontend, que usa pra conectar via livekit-client
 *
 * Uso:
 *   node generate-token.js <nome-da-sala> <identidade-do-usuario>
 *
 * Exemplo:
 *   node generate-token.js sala-teste alice
 *   node generate-token.js sala-teste bob
 */

const { AccessToken } = require("livekit-server-sdk");

const API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

const room = process.argv[2];
const identity = process.argv[3];

if (!room || !identity) {
  console.error("Uso: node generate-token.js <sala> <identidade>");
  process.exit(1);
}

async function main() {
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,
    // token de curta duração — item de risco #5 do PROJECT_CONTEXT.md
    ttl: "10m",
  });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  console.log(token);
}

main();
