import { Context, Next } from "hono";
import type { Env } from "../env";
import { autoMigrate } from "../utils/auto-migrate";

// マイグレーション済みフラグ（Worker起動中は保持される）
let isMigrated = false;

// 初回リクエスト時にデータベースマイグレーションを自動実行するミドルウェア
// 管理者アカウントの作成はユーザーが /setup ページから行う
export async function autoSetupMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  if (isMigrated) {
    await next();
    return;
  }

  try {
    if (!c.env.DB) {
      throw new Error("D1データベースバインディングが見つかりません");
    }

    // マイグレーション実行（未実行分のみ自動適用）
    await autoMigrate(c.env.DB);
    isMigrated = true;
  } catch (error) {
    console.error("自動マイグレーションエラー:", error);
    if (error instanceof Error) {
      console.error("エラーメッセージ:", error.message);
    }
    // 失敗時は次のリクエストで再試行
  }

  await next();
}
