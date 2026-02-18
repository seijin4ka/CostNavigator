-- system_settingsテーブルに通貨カラムを追加（デフォルト: JPY）
ALTER TABLE system_settings ADD COLUMN currency TEXT NOT NULL DEFAULT 'JPY';
