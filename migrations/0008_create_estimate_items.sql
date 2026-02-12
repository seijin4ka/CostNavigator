-- 見積もり明細テーブル
CREATE TABLE IF NOT EXISTS estimate_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  tier_id TEXT,
  tier_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  usage_quantity REAL,
  base_price REAL NOT NULL DEFAULT 0,
  markup_amount REAL NOT NULL DEFAULT 0,
  final_price REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate ON estimate_items(estimate_id);
