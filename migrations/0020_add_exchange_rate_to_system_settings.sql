-- system_settingsテーブルに為替レートカラムを追加（USD→JPY、デフォルト: 150.0）
ALTER TABLE system_settings ADD COLUMN exchange_rate REAL NOT NULL DEFAULT 150.0;
