-- 再販パートナーテーブル
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#F6821F',
  secondary_color TEXT NOT NULL DEFAULT '#1B1B1B',
  default_markup_type TEXT NOT NULL DEFAULT 'percentage' CHECK (default_markup_type IN ('percentage', 'fixed')),
  default_markup_value REAL NOT NULL DEFAULT 20,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_slug ON partners(slug);
