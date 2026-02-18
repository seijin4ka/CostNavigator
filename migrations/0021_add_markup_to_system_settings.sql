-- グローバルマークアップ設定を追加（デフォルト: 有効、20%）
ALTER TABLE system_settings ADD COLUMN markup_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE system_settings ADD COLUMN default_markup_percentage REAL NOT NULL DEFAULT 20.0;
