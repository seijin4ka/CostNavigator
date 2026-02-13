// Worker起動時に自動的にマイグレーションを実行するユーティリティ

const MIGRATIONS = [
  {
    version: 1,
    name: "0001_create_users",
    sql: `
-- 管理者ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `.trim(),
  },
  {
    version: 2,
    name: "0002_create_partners",
    sql: `
-- パートナーテーブル
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  primary_color TEXT NOT NULL DEFAULT '#F6821F',
  secondary_color TEXT NOT NULL DEFAULT '#1B1B1B',
  default_markup_type TEXT NOT NULL DEFAULT 'percentage' CHECK (default_markup_type IN ('percentage', 'fixed')),
  default_markup_value REAL NOT NULL DEFAULT 20,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_slug ON partners(slug);
    `.trim(),
  },
  {
    version: 3,
    name: "0003_create_product_categories",
    sql: `
-- 製品カテゴリテーブル
CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
    `.trim(),
  },
  {
    version: 4,
    name: "0004_create_products",
    sql: `
-- 製品テーブル
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'ユニット',
  base_price REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    `.trim(),
  },
  {
    version: 5,
    name: "0005_create_product_tiers",
    sql: `
-- 製品ティアテーブル（段階的価格設定）
CREATE TABLE IF NOT EXISTS product_tiers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER,
  unit_price REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_tiers_product_id ON product_tiers(product_id);
    `.trim(),
  },
  {
    version: 6,
    name: "0006_create_markup_rules",
    sql: `
-- マークアップルールテーブル（パートナー × 製品 × ティア別）
CREATE TABLE IF NOT EXISTS markup_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL,
  product_id TEXT,
  tier_id TEXT,
  markup_type TEXT NOT NULL DEFAULT 'percentage' CHECK (markup_type IN ('percentage', 'fixed')),
  markup_value REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_id) REFERENCES product_tiers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_markup_rules_partner_id ON markup_rules(partner_id);
CREATE INDEX IF NOT EXISTS idx_markup_rules_product_id ON markup_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_markup_rules_tier_id ON markup_rules(tier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_markup_rules_unique ON markup_rules(partner_id, product_id, tier_id);
    `.trim(),
  },
  {
    version: 7,
    name: "0007_create_estimates",
    sql: `
-- 見積もりテーブル
CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL,
  reference_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_company TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  total_amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_estimates_partner_id ON estimates(partner_id);
CREATE INDEX IF NOT EXISTS idx_estimates_reference_code ON estimates(reference_code);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at);
    `.trim(),
  },
  {
    version: 8,
    name: "0008_create_estimate_items",
    sql: `
-- 見積もり明細テーブル
CREATE TABLE IF NOT EXISTS estimate_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  estimate_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  tier_id TEXT,
  tier_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  subtotal REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (tier_id) REFERENCES product_tiers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id);
    `.trim(),
  },
  {
    version: 9,
    name: "0009_seed_data",
    sql: `
-- サンプルカテゴリ
INSERT OR IGNORE INTO product_categories (id, name, description, display_order)
VALUES
  ('cat-security', 'セキュリティサービス', 'Webアプリケーションファイアウォール、DDoS対策など', 1),
  ('cat-performance', 'パフォーマンス最適化', 'CDN、画像最適化など', 2),
  ('cat-reliability', '信頼性・可用性', 'ロードバランシング、フェイルオーバーなど', 3);

-- サンプル製品
INSERT OR IGNORE INTO products (id, category_id, name, description, unit, base_price, display_order)
VALUES
  ('prod-waf', 'cat-security', 'Web Application Firewall', 'Webアプリケーションを保護', 'リクエスト/月', 5.0, 1),
  ('prod-ddos', 'cat-security', 'DDoS Protection', 'DDoS攻撃からの防御', '帯域幅 (Gbps)', 100.0, 2),
  ('prod-cdn', 'cat-performance', 'CDN（コンテンツ配信ネットワーク）', 'グローバルキャッシュ配信', 'GB転送量', 0.085, 3),
  ('prod-img-opt', 'cat-performance', 'Image Optimization', '画像の自動最適化', '画像変換回数/月', 0.5, 4),
  ('prod-lb', 'cat-reliability', 'Load Balancing', '負荷分散', 'リクエスト/月', 10.0, 5);

-- サンプルパートナー
INSERT OR IGNORE INTO partners (id, name, slug, primary_color, secondary_color, default_markup_type, default_markup_value, is_active)
VALUES
  ('partner-demo', 'Demo Partner', 'demo', '#3B82F6', '#1E40AF', 'percentage', 20.0, 1);
    `.trim(),
  },
  {
    version: 10,
    name: "0010_add_customer_phone",
    sql: `
-- 見積もりテーブルに電話番号カラムを追加
ALTER TABLE estimates ADD COLUMN customer_phone TEXT;
    `.trim(),
  },
  {
    version: 11,
    name: "0011_system_settings",
    sql: `
-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  brand_name TEXT NOT NULL DEFAULT 'CostNavigator',
  primary_partner_slug TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#F6821F',
  secondary_color TEXT DEFAULT '#1B1B1B',
  footer_text TEXT DEFAULT 'Powered by CostNavigator',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (primary_partner_slug) REFERENCES partners(slug) ON DELETE SET NULL
);

-- デフォルト設定を挿入
INSERT OR IGNORE INTO system_settings (id, brand_name, footer_text)
VALUES ('default', 'CostNavigator', 'Powered by CostNavigator');
    `.trim(),
  },
  {
    version: 12,
    name: "0012_create_refresh_tokens",
    sql: `
-- リフレッシュトークンテーブル
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    `.trim(),
  },
  {
    version: 13,
    name: "0013_add_jwt_secret_to_system_settings",
    sql: `
-- system_settingsテーブルにJWT_SECRETカラムを追加
ALTER TABLE system_settings ADD COLUMN jwt_secret TEXT;

-- 既存のデフォルト設定にランダムなJWT_SECRETを生成して設定
UPDATE system_settings
SET jwt_secret = lower(hex(randomblob(32)))
WHERE id = 'default' AND jwt_secret IS NULL;
    `.trim(),
  },
  {
    version: 15,
    name: "0015_update_default_markup_to_20",
    sql: `
-- デフォルトマークアップを10%から20%に変更
-- 日本のMSSP市場における標準的なマージンに準拠

-- 既存パートナーで、デフォルト値（10%）のままのパートナーを20%に更新
UPDATE partners
SET default_markup_value = 20,
    updated_at = datetime('now')
WHERE default_markup_type = 'percentage' AND default_markup_value = 10;
    `.trim(),
  },
];

// 現在のスキーマバージョンを取得
async function getCurrentSchemaVersion(db: D1Database): Promise<number> {
  try {
    // schema_migrationsテーブルが存在するか確認
    const tableCheck = await db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
      )
      .first();

    if (!tableCheck) {
      // テーブルが存在しない場合は0を返す（初回マイグレーション）
      return 0;
    }

    // 最新のバージョンを取得
    const result = await db
      .prepare("SELECT MAX(version) as version FROM schema_migrations")
      .first<{ version: number | null }>();

    return result?.version || 0;
  } catch (error) {
    console.error("スキーマバージョン取得エラー:", error);
    return 0;
  }
}

// マイグレーションを実行
async function runMigration(
  db: D1Database,
  migration: { version: number; name: string; sql: string }
): Promise<void> {
  console.log(`マイグレーション実行中: ${migration.name}`);

  try {
    // マイグレーションSQLを実行
    await db.exec(migration.sql);

    // マイグレーション履歴を記録
    await db
      .prepare(
        "INSERT INTO schema_migrations (version, name, executed_at) VALUES (?, ?, datetime('now'))"
      )
      .bind(migration.version, migration.name)
      .run();

    console.log(`✅ ${migration.name} 完了`);
  } catch (error) {
    console.error(`❌ ${migration.name} 失敗:`, error);
    throw error;
  }
}

// すべての未実行マイグレーションを実行
export async function autoMigrate(db: D1Database): Promise<void> {
  console.log("🔄 自動マイグレーション開始");

  try {
    // schema_migrationsテーブルを作成（存在しない場合）
    await db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT NOT NULL
      );
    `);

    const currentVersion = await getCurrentSchemaVersion(db);
    console.log(`現在のスキーマバージョン: ${currentVersion}`);

    // 未実行のマイグレーションを実行
    const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log("✅ すべてのマイグレーションは実行済みです");
      return;
    }

    console.log(`${pendingMigrations.length}個のマイグレーションを実行します`);

    for (const migration of pendingMigrations) {
      await runMigration(db, migration);
    }

    console.log("✅ 自動マイグレーション完了");
  } catch (error) {
    console.error("❌ 自動マイグレーション失敗:", error);
    throw error;
  }
}
