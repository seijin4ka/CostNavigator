-- product_tiers に販売価格カラムを追加
ALTER TABLE product_tiers ADD COLUMN selling_price REAL;
ALTER TABLE product_tiers ADD COLUMN selling_usage_unit_price REAL;

-- estimates テーブルから partner_id を削除（SQLiteはDROP COLUMN未対応のため再作成）
CREATE TABLE estimates_new (
  id TEXT PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_company TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  total_monthly REAL NOT NULL DEFAULT 0,
  total_yearly REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO estimates_new SELECT id, reference_number, customer_name, customer_email, customer_phone, customer_company, status, notes, total_monthly, total_yearly, created_at, updated_at FROM estimates;
DROP TABLE estimates;
ALTER TABLE estimates_new RENAME TO estimates;

-- system_settings から primary_partner_slug を削除（再作成）
CREATE TABLE system_settings_new (
  id TEXT PRIMARY KEY DEFAULT 'default',
  brand_name TEXT NOT NULL DEFAULT 'CostNavigator',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#F6821F',
  secondary_color TEXT DEFAULT '#1B1B1B',
  footer_text TEXT DEFAULT 'Powered by CostNavigator',
  jwt_secret TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO system_settings_new SELECT id, brand_name, logo_url, primary_color, secondary_color, footer_text, jwt_secret, created_at, updated_at FROM system_settings;
DROP TABLE system_settings;
ALTER TABLE system_settings_new RENAME TO system_settings;

-- 不要テーブル削除
DROP TABLE IF EXISTS markup_rules;
DROP TABLE IF EXISTS partners;

-- インデックス再作成
CREATE INDEX IF NOT EXISTS idx_estimates_reference ON estimates(reference_number);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
