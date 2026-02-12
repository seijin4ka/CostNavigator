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
