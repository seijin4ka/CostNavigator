-- users テーブルに password_changed_at カラムを追加
-- パスワード変更日時を追跡するため
ALTER TABLE users ADD COLUMN password_changed_at TEXT;

-- 既存ユーザーのパスワード変更日時を現在時刻に設定
UPDATE users SET password_changed_at = datetime('now') WHERE password_changed_at IS NULL;
