// Cloudflare Workers バインディング型定義
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  ALLOWED_ORIGINS?: string; // カンマ区切りの許可オリジンリスト（本番環境用）
  CLOUDFLARE_ACCESS_AUDIT_ID?: string; // Cloudflare Access（Zero Trust）監査ID
}
