-- 見積もりテーブル
CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_company TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired')),
  notes TEXT,
  total_monthly REAL NOT NULL DEFAULT 0,
  total_yearly REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_estimates_partner ON estimates(partner_id);
CREATE INDEX IF NOT EXISTS idx_estimates_reference ON estimates(reference_number);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
