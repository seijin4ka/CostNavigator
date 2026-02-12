-- 製品ティア（料金プラン）テーブル
CREATE TABLE IF NOT EXISTS product_tiers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  base_price REAL NOT NULL DEFAULT 0,
  usage_unit TEXT,
  usage_unit_price REAL,
  usage_included REAL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(product_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_tiers_product ON product_tiers(product_id);
