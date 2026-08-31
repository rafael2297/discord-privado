import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthedRequest extends Request {
  user?: { username: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "token ausente" });
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = jwt.verify(token, JWT_SECRET) as unknown as { username: string };
    next();
  } catch {
    res.status(401).json({ error: "token inválido ou expirado" });
  }
}
