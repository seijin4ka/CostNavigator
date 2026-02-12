import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import type { Env } from "../env";

// JWT認証ペイロード型
export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

// JWT認証ミドルウェア
export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { jwtPayload: JWTPayload };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
      401
    );
  }

  const token = authHeader.slice(7);
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, "HS256")) as unknown as JWTPayload;
    c.set("jwtPayload", payload);
    await next();
  } catch {
    return c.json(
      { success: false, error: { code: "INVALID_TOKEN", message: "トークンが無効です" } },
      401
    );
  }
});
