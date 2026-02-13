-- system_settingsテーブルにJWT_SECRETカラムを追加
ALTER TABLE system_settings ADD COLUMN jwt_secret TEXT;

-- 既存のデフォルト設定にランダムなJWT_SECRETを生成して設定
-- 注: この値は初回マイグレーション時のみ使用され、Worker起動時に再生成される
UPDATE system_settings
SET jwt_secret = lower(hex(randomblob(32)))
WHERE id = 'default' AND jwt_secret IS NULL;
