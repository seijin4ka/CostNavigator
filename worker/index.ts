import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import tierRoutes from "./routes/tiers";
import partnerRoutes from "./routes/partners";
import markupRoutes from "./routes/markup";

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

// 管理API（認証はルート内で適用）
app.route("/api/admin/categories", categoryRoutes);
app.route("/api/admin/products", productRoutes);
app.route("/api/admin/product-tiers", tierRoutes);
app.route("/api/admin/partners", partnerRoutes);
app.route("/api/admin/partners", markupRoutes);

export default app;
