import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use("/api/*", cors());

// ヘルスチェックエンドポイント
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
