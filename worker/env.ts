// Cloudflare Workers バインディング型定義
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
}
