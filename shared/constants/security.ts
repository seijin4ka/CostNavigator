// セキュリティ関連の定数

// パスワードハッシュ設定（PBKDF2）
export const PASSWORD_HASH = {
  ITERATIONS: 100000, // OWASP 2024推奨最小値
  KEY_LENGTH_BITS: 256, // SHA-256ハッシュ長
  SALT_LENGTH_BYTES: 16, // 128ビット（16バイト）ソルト
  ALGORITHM: "PBKDF2" as const,
  HASH: "SHA-256" as const,
} as const;

// JWT設定
export const JWT = {
  TTL_SECONDS: 24 * 60 * 60, // 24時間
} as const;
