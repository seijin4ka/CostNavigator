import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context, Next } from "hono";
import type { Env } from "./env";
import { errorHandler } from "./middleware/error-handler";
import { autoSetupMiddleware } from "./middleware/auto-setup";
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import tierRoutes from "./routes/tiers";
import partnerRoutes from "./routes/partners";
import markupRoutes from "./routes/markup";
import publicRoutes from "./routes/public";
import estimateRoutes from "./routes/estimates";
import dashboardRoutes from "./routes/dashboard";
import systemSettingsRoutes from "./routes/system-settings";

const app = new Hono<{ Bindings: Env }>();

// 初回リクエスト時に自動セットアップを実行
app.use("*", autoSetupMiddleware);

// セキュリティヘッダーミドルウェア
app.use("*", async (c, next) => {
  await next();

  // Content Security Policy (XSS対策)
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // React開発モードとViteに必要
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " + // TailwindとGoogle Fontsに必要
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );

  // X-Content-Type-Options (MIMEタイプスニッフィング防止)
  c.header("X-Content-Type-Options", "nosniff");

  // X-Frame-Options (クリックジャッキング防止)
  c.header("X-Frame-Options", "DENY");

  // Referrer-Policy (リファラー情報の制御)
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy (不要な機能の無効化)
  c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
});

// CORS設定: エンドポイントごとに適切なポリシーを適用

// 制限的CORSミドルウェア（管理API・認証API用）
const restrictiveCors = (allowCredentials = true) => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // OPTIONSリクエスト（プリフライト）は即座に応答
    if (c.req.method === "OPTIONS") {
      const origin = c.req.header("Origin") || "";
      const allowedOrigins = (c.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

      // 開発環境のより厳密な検出（localhost/127.0.0.1/[::1] のみ許可）
      const isLocalhostOrigin =
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.startsWith("http://[::1]:");
      const isDevelopment = allowedOrigins.length === 0 && isLocalhostOrigin;

      let allowOrigin: string | undefined;
      if (isDevelopment) {
        allowOrigin = origin;
      } else if (allowedOrigins.includes(origin)) {
        allowOrigin = origin;
      }

      if (allowOrigin) {
        c.header("Access-Control-Allow-Origin", allowOrigin);
        if (allowCredentials) {
          c.header("Access-Control-Allow-Credentials", "true");
        }
        c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        c.header("Access-Control-Max-Age", "86400");
      }

      return c.text("", 204);
    }

    // GET, POST, PUT, DELETEリクエスト
    const origin = c.req.header("Origin") || "";
    const allowedOrigins = (c.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

    // 開発環境のより厳密な検出（localhost/127.0.0.1/[::1] のみ許可）
    const isLocalhostOrigin =
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.startsWith("http://[::1]:");
    const isDevelopment = allowedOrigins.length === 0 && isLocalhostOrigin;

    let allowOrigin: string | undefined;
    if (isDevelopment) {
      // 開発環境: localhost からのアクセスを許可
      allowOrigin = origin;
    } else if (allowedOrigins.includes(origin)) {
      // 本番環境: 環境変数で指定されたオリジンのみ許可
      allowOrigin = origin;
    }

    if (allowOrigin) {
      c.header("Access-Control-Allow-Origin", allowOrigin);
      if (allowCredentials) {
        c.header("Access-Control-Allow-Credentials", "true");
      }
      c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      c.header("Access-Control-Max-Age", "86400");
    }

    await next();
  };
};

// 公開API: すべてのオリジンを許可（パートナー向け埋め込み対応）
app.use("/api/public/*", cors({
  origin: "*",
  credentials: false,
}));

// ヘルスチェック: すべてのオリジンを許可
app.use("/api/health", cors({
  origin: "*",
}));

// 認証API: 制限的（credentials付き）
app.use("/api/auth/*", restrictiveCors(true));

// 管理API: 制限的（特定のオリジンのみ）
app.use("/api/admin/*", restrictiveCors(true));

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
app.route("/api/admin/estimates", estimateRoutes);
app.route("/api/admin/dashboard", dashboardRoutes);
app.route("/api/admin/system-settings", systemSettingsRoutes);

// 公開API（認証不要）
app.route("/api/public", publicRoutes);

// 非APIリクエストは静的アセット（SPA）にフォールバック
app.all("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
