import { Hono } from "hono";
import type { Env } from "../env";
import { AuthService } from "../services/auth-service";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { LoginSchema } from "../../shared/types";

const auth = new Hono<{ Bindings: Env }>();

// ログイン
auth.post("/login", async (c) => {
  const data = await validateBody(c, LoginSchema);
  if (!data) return c.res;

  const service = new AuthService(c.env.DB, c.env.JWT_SECRET);
  const result = await service.login(data.email, data.password);

  if (!result) {
    return error(c, "INVALID_CREDENTIALS", "メールアドレスまたはパスワードが正しくありません", 401);
  }

  return success(c, result);
});

// ユーザー情報取得（認証必須）
auth.get("/me", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const service = new AuthService(c.env.DB, c.env.JWT_SECRET);
  const user = await service.getUser(payload.sub);

  if (!user) {
    return error(c, "USER_NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  return success(c, user);
});

// 初期管理者作成（開発用・初回セットアップ用）
auth.post("/setup", async (c) => {
  const service = new AuthService(c.env.DB, c.env.JWT_SECRET);
  await service.ensureAdminExists();
  return success(c, { message: "初期管理者ユーザーをセットアップしました" });
});

export default auth;
