import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../env";
import { AuthService } from "../services/auth-service";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { LoginSchema, AdminPasswordChangeSchema } from "../../shared/types";
import { hashPassword, verifyPassword } from "../utils/password";
import { getJwtSecret } from "../utils/jwt-secret";
import { autoMigrate } from "../utils/auto-migrate";

// リフレッシュトークンリクエストスキーマ
const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "リフレッシュトークンが必要です"),
});

// 初期セットアップリクエストスキーマ（オプショナル）
const SetupSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
  password: z.string().min(8, "パスワードは8文字以上である必要があります").optional(),
});

// パスワード変更リクエストスキーマ
const AdminPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください"),
  confirmPassword: z.string("新しいパスワード確認を入力してください"),
});

const auth = new Hono<{ Bindings: Env }>();

// ログイン（レート制限: 5回/60秒）
auth.post("/login", rateLimit(5, 60000), async (c) => {
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
// レート制限: 10回/60秒
auth.post("/refresh", rateLimit(10, 60000), async (c) => {
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

// セットアップ状態確認
auth.get("/setup-status", async (c) => {
  const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
  const userRepo = new (await import("../repositories/user-repository")).UserRepository(c.env.DB);

  const userCount = await userRepo.count();
  const isSetupComplete = userCount > 0;

  return success(c, {
    isSetupComplete,
    userCount,
  });
});

// 初期セットアップ（マイグレーション + 初期管理者作成）
auth.post("/setup", async (c) => {
  try {
    // リクエストボディから email と password を取得（オプショナル）
    console.log("📝 セットアップリクエスト受信");
    const data = await validateBody(c, SetupSchema);
    if (!data) return c.res;

    // 1. データベースマイグレーションを自動実行
    try {
      console.log("🔄 データベースマイグレーション開始");
      await autoMigrate(c.env.DB);
      console.log("✅ マイグレーション完了");
    } catch (migrateError) {
      console.error("❌ マイグレーションエラー:", migrateError);
      throw new Error(`マイグレーション失敗: ${migrateError}`);
    }

    // 2. 初期管理者ユーザーを作成（存在しない場合のみ）
    try {
      console.log("🔑 JWT Secret取得中");
      const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
      console.log("✅ JWT Secret取得完了");

      const userRepo = new (await import("../repositories/user-repository")).UserRepository(c.env.DB);

      // 既にユーザーが存在する場合はメッセージを変更
      console.log("👤 既存ユーザー数チェック中");
      const userCount = await userRepo.count();
      console.log(`✅ 既存ユーザー数: ${userCount}`);

      if (userCount > 0) {
        return success(c, {
          message: "セットアップは既に完了しています（マイグレーションは実行されました）",
          alreadySetup: true
        });
      }

      // カスタムの email と password が提供された場合はそれを使用、そうでない場合はデフォルト
      const email = data.email || "admin@costnavigator.dev";
      const password = data.password || "admin1234";

      console.log("🔐 パスワードハッシュ化中");
      const passwordHash = await (await import("../utils/password")).hashPassword(password);
      console.log("✅ パスワードハッシュ化完了");

      console.log("👤 ユーザー作成中");
      await userRepo.create(email, passwordHash, "管理者", "super_admin");
      console.log("✅ ユーザー作成完了");

      return success(c, {
        message: "セットアップが完了しました。管理画面にログインしてください。",
        credentials: {
          email,
          password
        }
      });
    } catch (userCreateError) {
      console.error("❌ ユーザー作成エラー:", userCreateError);
      throw new Error(`ユーザー作成失敗: ${userCreateError}`);
    }
  } catch (setupError) {
    console.error("❌ セットアップエラー:", setupError);
    return error(c, "SETUP_FAILED", `セットアップに失敗しました: ${setupError}`, 500);
  }
});

// Cloudflare Access（Zero Trust）SSOログインエンドポイント
auth.post("/sso/cloudflare-login", async (c) => {
  const { CF_Access_Token } = c.req.header();

  if (!CF_Access_Token) {
    return error(c, "MISSING_TOKEN", "Cloudflare Accessトークンが見つかりません", 400);
  }

  // Cloudflare Accessトークン検証
  const service = new AuthService(c.env.DB, await getJwtSecret(c.env.DB, c.env.JWT_SECRET));
  const verification = await service.verifyCloudflareToken(CF_Access_Token);

  if (!verification || !verification.valid) {
    return error(c, "INVALID_TOKEN", "トークンが無効です", 401);
  }

  // トークンからユーザー識別
  const user = await service.getUser(verification.email);

  if (!user) {
    return error(c, "USER_NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  // アクセストークンとリフレッシュトークンを発行
  const { password_hash: _ } = user;
  const accessToken = await service.generateAccessToken(user);
  const refreshToken = await service.generateRefreshToken(user.id);

  return success(c, {
    token: accessToken,
    refreshToken,
    user: { ...user, password_hash: undefined },
  });
});

// パスワード変更エンドポイント（認証必須）
auth.patch("/admin/change-password", authMiddleware, async (c) => {
  const data = await validateBody(c, AdminPasswordChangeSchema);
  if (!data) return c.res;

  const payload = c.get("jwtPayload");
  const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
  const service = new AuthService(c.env.DB, jwtSecret);

  // 現在のユーザー情報を取得
  const user = await service.getUser(payload.sub);
  if (!user) {
    return error(c, "USER_NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  // パスワードの検証
  const isValid = await verifyPassword(data.currentPassword, user.password_hash);
  if (!isValid) {
    return error(c, "INVALID_PASSWORD", "現在のパスワードが正しくありません", 401);
  }

  // 新しいパスワードの確認
  if (data.newPassword !== data.confirmPassword) {
    return error(c, "PASSWORD_MISMATCH", "新しいパスワードと確認用パスワードが一致しません", 400);
  }

  // パスワードハッシュ化と更新
  const passwordHash = await hashPassword(data.newPassword);
  await service.updatePassword(user.id, passwordHash);

  return success(c, {
    message: "パスワードを変更しました",
  });
});

// アカウントロック解除エンドポイント（認証必須）
auth.post("/admin/unlock-account", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const userRepo = new (await import("../repositories/user-repository")).UserRepository(c.env.DB);

  // 現在のユーザー情報を取得
  const user = await userRepo.findById(payload.sub);
  if (!user) {
    return error(c, "USER_NOT_FOUND", "ユーザーが見つかりません", 404);
  }

  // ロック解除実行
  await userRepo.unlockAccount(user.id);

  return success(c, {
    message: "アカウントのロックを解除しました",
  });
});

export default auth;
