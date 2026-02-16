import { Context, Next } from "hono";
import type { Env } from "../env";
import { autoMigrate } from "../utils/auto-migrate";
import { getJwtSecret } from "../utils/jwt-secret";
import { AuthService } from "../services/auth-service";

// セットアップ済みフラグ（Worker起動中は保持される）
let isSetupComplete = false;

// 初回リクエスト時に自動セットアップを実行するミドルウェア
export async function autoSetupMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // すでにセットアップ済みの場合はスキップ
  if (isSetupComplete) {
    await next();
    return;
  }

  try {
    // D1バインディングをチェック
    if (!c.env.DB) {
      console.error("D1データベースバインディングが見つかりません");
      throw new Error("D1データベースバインディングが見つかりません");
    }

    // マイグレーション実行（未実行分のみ自動適用）
    await autoMigrate(c.env.DB);

    // 初期管理者作成（既に存在する場合はスキップ）
    const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
    const authService = new AuthService(c.env.DB, jwtSecret);
    await authService.ensureAdminExists();

    isSetupComplete = true;
  } catch (error) {
    console.error("自動セットアップエラー:", error);
    if (error instanceof Error) {
      console.error("エラーメッセージ:", error.message);
    }
    // 失敗時は次のリクエストで再試行（isSetupCompleteはfalseのまま）
  }

  await next();
}
