import { Context, Next } from "hono";
import type { Env } from "../env";
import { autoMigrate } from "../utils/auto-migrate";
import { getJwtSecret } from "../utils/jwt-secret";
import { AuthService } from "../services/auth-service";

// セットアップ済みフラグ（Worker起動中は保持される）
let isSetupChecked = false;
let isSetupComplete = false;

// 初回リクエスト時に自動セットアップを実行するミドルウェア
export async function autoSetupMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // すでにセットアップ済みの場合はスキップ
  if (isSetupComplete) {
    await next();
    return;
  }

  // 初回チェック時のみ実行
  if (!isSetupChecked) {
    isSetupChecked = true;

    try {
      console.log("🔍 セットアップ状態を確認中...");

      // schema_migrationsテーブルの存在をチェック
      const tableCheck = await c.env.DB
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
        )
        .first();

      if (!tableCheck) {
        console.log("🚀 初回セットアップを開始します...");

        // 1. マイグレーション実行
        console.log("📊 データベースマイグレーション実行中...");
        await autoMigrate(c.env.DB);
        console.log("✅ マイグレーション完了");

        // 2. 初期管理者作成
        console.log("👤 初期管理者アカウント作成中...");
        const jwtSecret = await getJwtSecret(c.env.DB, c.env.JWT_SECRET);
        const authService = new AuthService(c.env.DB, jwtSecret);
        await authService.ensureAdminExists();
        console.log("✅ 初期管理者作成完了");

        console.log("🎉 初回セットアップが完了しました");
        console.log("   管理者アカウント:");
        console.log("   - Email: admin@costnavigator.dev");
        console.log("   - Password: admin1234");
      } else {
        console.log("✅ セットアップ済みです");
      }

      isSetupComplete = true;
    } catch (error) {
      console.error("❌ 自動セットアップエラー:", error);
      // エラーが発生してもリクエストは続行
      // ユーザーは手動で /api/auth/setup を呼び出すことができる
    }
  }

  await next();
}
