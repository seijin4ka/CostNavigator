// 通貨フォーマット設定
export const CURRENCY = {
  code: "USD",
  symbol: "$",
  locale: "en-US",
} as const;

// ページネーションデフォルト値
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

// 後方互換性のためのエイリアス
export const DEFAULT_PAGE_LIMIT = PAGINATION.DEFAULT_PER_PAGE;

// 見積もり参照番号プレフィックス
export const ESTIMATE_REF_PREFIX = "CN";

// 価格単位ラベル（従量課金の表示用）
export const USAGE_UNIT_LABELS: Record<string, string> = {
  requests: "リクエスト",
  bandwidth_gb: "帯域幅 (GB)",
  domains: "ドメイン",
  users: "ユーザー",
  seats: "シート",
  queries: "クエリ",
  images: "画像",
  minutes: "分",
  gb_storage: "ストレージ (GB)",
  million_requests: "百万リクエスト",
} as const;

// リトライ設定
export const RETRY = {
  MAX_ATTEMPTS: 3, // 最大リトライ回数
  DELAY_MS: 10, // リトライ間隔（ミリ秒）
} as const;

// ローカルストレージキー（認証）
export const STORAGE_KEYS = {
  AUTH_TOKEN: "cn_auth_token",
  REFRESH_TOKEN: "cn_refresh_token",
} as const;

// セキュリティ定数のre-export
export { PASSWORD_HASH, JWT } from "./security";
