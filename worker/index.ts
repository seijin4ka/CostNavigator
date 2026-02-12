import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth";

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use("/api/*", cors());

// グローバルエラーハンドラー
app.onError(errorHandler);

// ヘルスチェックエンドポイント
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 認証ルート
app.route("/api/auth", authRoutes);

export default app;
