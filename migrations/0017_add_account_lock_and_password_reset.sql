-- アカウントロック・パスワードリセット機能
-- usersテーブルにセキュリティ関連カラムを追加

-- ロック関連
ALTER TABLE users ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT;
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expires TEXT;

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_users_is_locked ON users(is_locked);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

INSERT OR IGNORE INTO schema_migrations VALUES (17, '017_add_account_lock_and_password_reset', datetime('now'));
