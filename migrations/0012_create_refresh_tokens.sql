-- リフレッシュトークンテーブル
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ユーザーIDでの検索を高速化
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- トークンでの検索を高速化（UNIQUE制約があるため厳密には不要だが明示的に作成）
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- 期限切れトークンの削除を高速化
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
