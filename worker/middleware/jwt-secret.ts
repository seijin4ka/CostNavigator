import { Context, Next } from "hono";
import type { Env } from "../env";
import { getJwtSecret } from "../utils/jwt-secret";

// JWT_SECRETをコンテキストに設定するミドルウェア
export async function jwtSecretMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
  c.set("jwtSecret", jwtSecret);
  await next();
}
