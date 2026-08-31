import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET as string;

/**
 * POST /auth/identify
 *
 * Substitui o cadastro/login com senha. Este é um app privado só pros
 * amigos do dono — não precisa de conta persistente, só de um nome pra se
 * identificar nas calls e (futuramente) no chat.
 *
 * Sem verificação de duplicidade: se duas pessoas entrarem com o mesmo
 * nome ao mesmo tempo, a segunda vai "roubar" a identidade da primeira na
 * sala do LiveKit (comportamento padrão do LiveKit pra identities
 * repetidas). Aceitável pro tamanho do grupo — combine nomes com os amigos.
 */
router.post("/identify", (req, res) => {
  const { username } = req.body ?? {};

  if (typeof username !== "string" || username.trim().length < 2) {
    res.status(400).json({ error: "Digite um nome com pelo menos 2 caracteres" });
    return;
  }

  const cleanUsername = username.trim().slice(0, 32);

  const token = jwt.sign({ username: cleanUsername }, JWT_SECRET, {
    // Sem conta persistente, então o token dura mais (30 dias) — não tem
    // "senha" pra revalidar depois, então não faz sentido expirar rápido
    // como fazíamos com o JWT de login antes.
    expiresIn: "30d",
  });

  res.json({ token, user: { username: cleanUsername } });
});

export default router;
