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
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_slug ON product_categories(slug);
    `.trim(),
  },
  {
    version: 4,
    name: "0004_create_products",
    sql: `
-- Cloudflare製品テーブル
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category_id TEXT NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  pricing_model TEXT NOT NULL DEFAULT 'tier' CHECK (pricing_model IN ('tier', 'usage', 'tier_plus_usage', 'custom')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    `.trim(),
  },
  {
    version: 5,
    name: "0005_create_product_tiers",
    sql: `
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
    `.trim(),
  },
  {
    version: 6,
    name: "0006_create_markup_rules",
    sql: `
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
    `.trim(),
  },
  {
    version: 7,
    name: "0007_create_estimates",
    sql: `
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
    `.trim(),
  },
  {
    version: 8,
    name: "0008_create_estimate_items",
    sql: `
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
    `.trim(),
  },
  {
    version: 9,
    name: "0009_seed_data",
    sql: `
-- 製品カテゴリ
INSERT OR IGNORE INTO product_categories (id, name, slug, display_order) VALUES
  ('cat-cdn', 'CDN / パフォーマンス', 'cdn-performance', 1),
  ('cat-security', 'セキュリティ', 'security', 2),
  ('cat-zerotrust', 'Zero Trust', 'zero-trust', 3),
  ('cat-devplatform', 'Developer Platform', 'developer-platform', 4),
  ('cat-network', 'ネットワークサービス', 'network-services', 5);

-- 製品
INSERT OR IGNORE INTO products (id, category_id, name, slug, description, pricing_model) VALUES
  ('prod-cdn', 'cat-cdn', 'CDN', 'cdn', 'コンテンツ配信ネットワーク', 'tier'),
  ('prod-dns', 'cat-cdn', 'DNS', 'dns', 'エンタープライズDNS', 'tier'),
  ('prod-images', 'cat-cdn', 'Cloudflare Images', 'images', '画像最適化・配信', 'tier_plus_usage'),
  ('prod-waf', 'cat-security', 'WAF', 'waf', 'Web Application Firewall', 'tier'),
  ('prod-ddos', 'cat-security', 'DDoS Protection', 'ddos', 'DDoS攻撃対策', 'tier'),
  ('prod-bot', 'cat-security', 'Bot Management', 'bot-management', 'ボット管理', 'tier'),
  ('prod-access', 'cat-zerotrust', 'Cloudflare Access', 'access', 'ゼロトラストアクセス', 'tier_plus_usage'),
  ('prod-gateway', 'cat-zerotrust', 'Cloudflare Gateway', 'gateway', 'セキュアWebゲートウェイ', 'tier_plus_usage'),
  ('prod-tunnel', 'cat-zerotrust', 'Cloudflare Tunnel', 'tunnel', 'セキュアトンネル接続', 'tier'),
  ('prod-workers', 'cat-devplatform', 'Workers', 'workers', 'サーバーレスコンピューティング', 'tier_plus_usage'),
  ('prod-pages', 'cat-devplatform', 'Pages', 'pages', '静的サイトホスティング', 'tier'),
  ('prod-r2', 'cat-devplatform', 'R2 Storage', 'r2', 'オブジェクトストレージ', 'usage'),
  ('prod-argo', 'cat-network', 'Argo Smart Routing', 'argo', 'スマートルーティング', 'usage'),
  ('prod-spectrum', 'cat-network', 'Spectrum', 'spectrum', 'TCP/UDPプロキシ', 'tier');

-- 製品ティア
INSERT OR IGNORE INTO product_tiers (id, product_id, name, slug, base_price, usage_unit, usage_unit_price, usage_included, display_order) VALUES
  ('tier-cdn-free', 'prod-cdn', 'Free', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-cdn-pro', 'prod-cdn', 'Pro', 'pro', 20, NULL, NULL, NULL, 2),
  ('tier-cdn-biz', 'prod-cdn', 'Business', 'business', 200, NULL, NULL, NULL, 3),
  ('tier-cdn-ent', 'prod-cdn', 'Enterprise', 'enterprise', 5000, NULL, NULL, NULL, 4),
  ('tier-dns-free', 'prod-dns', 'Free', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-dns-ent', 'prod-dns', 'Enterprise', 'enterprise', 300, 'domains', NULL, NULL, 2),
  ('tier-images-basic', 'prod-images', 'Basic', 'basic', 5, 'images', 0.001, 100000, 1),
  ('tier-waf-pro', 'prod-waf', 'Pro', 'pro', 20, NULL, NULL, NULL, 1),
  ('tier-waf-biz', 'prod-waf', 'Business', 'business', 200, NULL, NULL, NULL, 2),
  ('tier-waf-ent', 'prod-waf', 'Enterprise', 'enterprise', 5000, NULL, NULL, NULL, 3),
  ('tier-ddos-free', 'prod-ddos', 'Free（基本保護）', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-ddos-ent', 'prod-ddos', 'Advanced', 'advanced', 3000, NULL, NULL, NULL, 2),
  ('tier-bot-ent', 'prod-bot', 'Enterprise', 'enterprise', 3000, NULL, NULL, NULL, 1),
  ('tier-access-free', 'prod-access', 'Free', 'free', 0, 'users', NULL, 50, 1),
  ('tier-access-std', 'prod-access', 'Standard', 'standard', 7, 'seats', NULL, NULL, 2),
  ('tier-gw-free', 'prod-gateway', 'Free', 'free', 0, 'users', NULL, 50, 1),
  ('tier-gw-std', 'prod-gateway', 'Standard', 'standard', 7, 'seats', NULL, NULL, 2),
  ('tier-tunnel-free', 'prod-tunnel', 'Free', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-tunnel-ent', 'prod-tunnel', 'Enterprise', 'enterprise', 500, NULL, NULL, NULL, 2),
  ('tier-workers-free', 'prod-workers', 'Free', 'free', 0, 'million_requests', NULL, 0.1, 1),
  ('tier-workers-paid', 'prod-workers', 'Paid', 'paid', 5, 'million_requests', 0.50, 10, 2),
  ('tier-pages-free', 'prod-pages', 'Free', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-pages-pro', 'prod-pages', 'Pro', 'pro', 20, NULL, NULL, NULL, 2),
  ('tier-r2-usage', 'prod-r2', 'Usage', 'usage', 0, 'gb_storage', 0.015, 10, 1),
  ('tier-argo-usage', 'prod-argo', 'Usage', 'usage', 5, 'bandwidth_gb', 0.10, 0, 1),
  ('tier-spectrum-pro', 'prod-spectrum', 'Pro', 'pro', 1, NULL, NULL, NULL, 1),
  ('tier-spectrum-ent', 'prod-spectrum', 'Enterprise', 'enterprise', 5000, NULL, NULL, NULL, 2);

-- デモ用パートナー（デフォルトマークアップ20% - 日本のMSSP市場標準）
INSERT OR IGNORE INTO partners (id, name, slug, primary_color, secondary_color, default_markup_type, default_markup_value) VALUES
  ('partner-demo', 'デモパートナー', 'demo', '#F6821F', '#1B1B1B', 'percentage', 20);
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
-- デフォルトマークアップを20%に統一
-- 日本のMSSP市場における標準的なマージンに準拠

-- 既存パートナーで、20%未満のパートナーを20%に更新
UPDATE partners
SET default_markup_value = 20,
    updated_at = datetime('now')
WHERE default_markup_type = 'percentage' AND default_markup_value < 20;
    `.trim(),
  },
  {
    version: 16,
    name: "0016_add_password_changed_at_to_users",
    sql: `
-- users テーブルに password_changed_at カラムを追加
-- パスワード変更日時を追跡するため
ALTER TABLE users ADD COLUMN password_changed_at TEXT;

-- 既存ユーザーのパスワード変更日時を現在時刻に設定
UPDATE users SET password_changed_at = datetime('now') WHERE password_changed_at IS NULL;
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
    // マイグレーションSQLを複数のステートメントに分割して実行
    const statements = migration.sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // 各ステートメントを個別に実行
    for (const statement of statements) {
      await db.prepare(statement).run();
    }

    // マイグレーション履歴を記録
    await db
      .prepare(
        "INSERT INTO schema_migrations (version, name, executed_at) VALUES (?, ?, datetime('now'))"
      )
      .bind(migration.version, migration.name)
      .run();

    console.log(`マイグレーション完了: ${migration.name}`);
  } catch (error) {
    console.error(`マイグレーション失敗: ${migration.name}:`, error);
    throw error;
  }
}

// すべての未実行マイグレーションを実行
export async function autoMigrate(db: D1Database): Promise<void> {
  console.log("自動マイグレーション開始");

  try {
    // schema_migrationsテーブルを作成（存在しない場合）
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT NOT NULL
      )
    `).run();

    const currentVersion = await getCurrentSchemaVersion(db);
    console.log(`現在のスキーマバージョン: ${currentVersion}`);

    // 未実行のマイグレーションを実行
    const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log("すべてのマイグレーションは実行済みです");
      return;
    }

    console.log(`${pendingMigrations.length}個のマイグレーションを実行します`);

    for (const migration of pendingMigrations) {
      await runMigration(db, migration);
    }

    console.log("自動マイグレーション完了");
  } catch (error) {
    console.error("自動マイグレーション失敗:", error);
    throw error;
  }
}
