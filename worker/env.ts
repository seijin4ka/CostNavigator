// Cloudflare Workers バインディング型定義
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  CACHE: KVNamespace; // キャッシュ用 KV ストア
  JWT_SECRET: string;
  ALLOWED_ORIGINS?: string; // カンマ区切りの許可オリジンリスト（本番環境用）
}
