import type { Context } from "hono";

// グローバルエラーハンドラー
export function errorHandler(err: Error, c: Context) {
  console.error("サーバーエラー:", err.message, err.stack);
  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "サーバー内部エラーが発生しました",
      },
    },
    500
  );
}
