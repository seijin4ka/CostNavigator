-- マークアップルールテーブル（パートナー別価格調整）
CREATE TABLE IF NOT EXISTS markup_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  tier_id TEXT REFERENCES product_tiers(id) ON DELETE CASCADE,
  markup_type TEXT NOT NULL DEFAULT 'percentage' CHECK (markup_type IN ('percentage', 'fixed')),
  markup_value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(partner_id, product_id, tier_id)
);

CREATE INDEX IF NOT EXISTS idx_markup_rules_partner ON markup_rules(partner_id);
CREATE INDEX IF NOT EXISTS idx_markup_rules_product ON markup_rules(product_id);
