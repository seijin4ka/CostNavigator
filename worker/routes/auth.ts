import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../env";
import { AuthService } from "../services/auth-service";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { LoginSchema } from "../../shared/types";
import { getJwtSecret } from "../utils/jwt-secret";
import { autoMigrate } from "../utils/auto-migrate";

// リフレッシュトークンリクエストスキーマ
const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "リフレッシュトークンが必要です"),
});

const auth = new Hono<{ Bindings: Env }>();

// ログイン
auth.post("/login", async (c) => {
  const data = await validateBody(c, LoginSchema);
  if (!data) return c.res;

  // JWT_SECRETを環境変数またはD1から取得
  const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
  const service = new AuthService(c.env.DB, jwtSecret);
  const result = await service.login(data.email, data.password);

  if (!result) {
    return error(c, "INVALID_CREDENTIALS", "メールアドレスまたはパスワードが正しくありません", 401);
  }

  return success(c, result);
});

// ユーザー情報取得（認証必須）
auth.get("/me", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
  const service = new AuthService(c.env.DB, jwtSecret);
  const user = await service.getUser(payload.sub);

  if (!user) {
    return error(c, "USER_NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  return success(c, user);
});

// トークンリフレッシュ（リフレッシュトークンを使ってアクセストークンを再発行）
auth.post("/refresh", async (c) => {
  const data = await validateBody(c, RefreshTokenSchema);
  if (!data) return c.res;

  const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
  const service = new AuthService(c.env.DB, jwtSecret);
  const result = await service.refreshAccessToken(data.refreshToken);

  if (!result) {
    return error(c, "INVALID_REFRESH_TOKEN", "リフレッシュトークンが無効または期限切れです", 401);
  }

  return success(c, {
    token: result.token,
    refreshToken: result.refreshToken,
  });
});

// 初期セットアップ（マイグレーション + 初期管理者作成）
auth.post("/setup", async (c) => {
  try {
    // 1. データベースマイグレーションを自動実行
    console.log("🔄 データベースマイグレーション開始");
    await autoMigrate(c.env.DB);
    console.log("✅ マイグレーション完了");

    // 2. 初期管理者ユーザーを作成
    const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
    const service = new AuthService(c.env.DB, jwtSecret);

    // 既にユーザーが存在する場合はメッセージを変更
    const userRepo = new (await import("../repositories/user-repository")).UserRepository(c.env.DB);
    const userCount = await userRepo.count();

    if (userCount > 0) {
      return success(c, {
        message: "セットアップは既に完了しています（マイグレーションは実行されました）",
        alreadySetup: true
      });
    }

    await service.ensureAdminExists();
    return success(c, {
      message: "セットアップが完了しました。管理画面にログインしてください。",
      credentials: {
        email: "admin@costnavigator.dev",
        password: "admin1234"
      }
    });
  } catch (setupError) {
    console.error("セットアップエラー:", setupError);
    return error(c, "SETUP_FAILED", `セットアップに失敗しました: ${setupError}`, 500);
  }
});

export default auth;
