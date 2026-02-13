#!/usr/bin/env node
/**
 * デプロイ準備スクリプト
 *
 * Cloudflare Workers CI/CD環境で実行され、以下を自動的に行います：
 * 1. D1データベースの存在確認・作成
 * 2. wrangler.jsonにdatabase_idを動的に設定
 * 3. D1データベースのマイグレーション実行
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_NAME = 'cost-navigator-db';

// Cloudflare Vite plugin の出力先を自動検出
const wranglerConfigPath = path.join(__dirname, '../wrangler.jsonc');
const wranglerConfig = JSON.parse(fs.readFileSync(wranglerConfigPath, 'utf-8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
// Cloudflare Vite Pluginの正規化ルール: ハイフン → アンダースコア
const projectName = wranglerConfig.name.replace(/-/g, '_');
const DIST_DIR = path.join(__dirname, '../dist', projectName);
const WRANGLER_JSON_PATH = path.join(DIST_DIR, 'wrangler.json');

console.log('🚀 CostNavigator デプロイ準備開始\n');
console.log(`📁 ビルド出力ディレクトリ: ${DIST_DIR}`);

// CI/CD環境かどうかをチェック
const isCI = process.env.CF_PAGES === '1' || process.env.CI === 'true';
console.log(`🔍 実行環境: ${isCI ? 'CI/CD' : 'ローカル'}\n`);

try {
  // D1データベースの確認・作成
  console.log('📊 D1データベースを確認中...');
  let dbId = null;

  try {
    // JSON形式で出力して確実にパースできるようにする
    const listOutput = execSync('npx wrangler d1 list --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // JSON出力をパース
    const databases = JSON.parse(listOutput);
    const targetDb = databases.find(db => db.name === DB_NAME);

    if (targetDb) {
      dbId = targetDb.uuid;
      console.log(`✅ 既存のD1データベースを使用: ${dbId}\n`);
    }
  } catch (error) {
    console.log('   データベース一覧取得でエラー（新規作成を試みます）');
  }

  if (!dbId) {
    console.log('📊 D1データベースを新規作成中...');
    try {
      const createOutput = execSync(`npx wrangler d1 create ${DB_NAME} --json`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // JSON出力をパース
      const result = JSON.parse(createOutput);
      if (result && result.uuid) {
        dbId = result.uuid;
        console.log(`✅ D1データベースを作成しました: ${dbId}\n`);
      } else if (result && result.database_id) {
        dbId = result.database_id;
        console.log(`✅ D1データベースを作成しました: ${dbId}\n`);
      }
    } catch (error) {
      // データベースが既に存在する場合のエラーを処理
      const errorMessage = error.message || error.toString();
      if (errorMessage.includes('already exists')) {
        console.log('   データベースは既に存在します。再度リストから取得を試みます...');
        // もう一度リストを取得
        try {
          const listOutput = execSync('npx wrangler d1 list --json', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
          });
          const databases = JSON.parse(listOutput);
          const targetDb = databases.find(db => db.name === DB_NAME);
          if (targetDb) {
            dbId = targetDb.uuid;
            console.log(`✅ 既存のD1データベースを使用: ${dbId}\n`);
          }
        } catch (retryError) {
          console.error('   データベースID取得に失敗しました');
        }
      } else {
        console.error('❌ D1データベースの作成に失敗しました');
        throw error;
      }
    }
  }

  // database_idが取得できた場合のみwrangler.jsonを更新
  if (dbId) {
    console.log('📝 デプロイ用設定ファイルを更新中...');
    if (fs.existsSync(WRANGLER_JSON_PATH)) {
      const wranglerConfig = JSON.parse(fs.readFileSync(WRANGLER_JSON_PATH, 'utf-8'));

      // D1バインディングを更新
      if (wranglerConfig.d1_databases && wranglerConfig.d1_databases.length > 0) {
        wranglerConfig.d1_databases[0].database_id = dbId;
        fs.writeFileSync(WRANGLER_JSON_PATH, JSON.stringify(wranglerConfig, null, 2));
        console.log('✅ 設定ファイルを更新しました\n');
      } else {
        console.error('❌ wrangler.jsonにd1_databasesが見つかりません');
      }
    } else {
      console.error(`❌ ${WRANGLER_JSON_PATH} が見つかりません`);
      console.error('   vite build を先に実行してください');
      process.exit(1);
    }

    // マイグレーション実行
    console.log('📊 データベースマイグレーションを実行中...');
    try {
      // マイグレーションSQLファイルを作成
      const migrationSQL = `
-- CostNavigator 初期化スクリプト（自動生成）

-- schema_migrationsテーブル作成
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  executed_at TEXT NOT NULL
);

-- 0001: usersテーブル
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
INSERT OR IGNORE INTO schema_migrations VALUES (1, '0001_create_users', datetime('now'));

-- 0002: partnersテーブル
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
INSERT OR IGNORE INTO schema_migrations VALUES (2, '0002_create_partners', datetime('now'));

-- 0003: product_categoriesテーブル
CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO schema_migrations VALUES (3, '0003_create_product_categories', datetime('now'));

-- 0004: productsテーブル
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
INSERT OR IGNORE INTO schema_migrations VALUES (4, '0004_create_products', datetime('now'));

-- 0005: product_tiersテーブル
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
INSERT OR IGNORE INTO schema_migrations VALUES (5, '0005_create_product_tiers', datetime('now'));

-- 0006: markup_rulesテーブル
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
INSERT OR IGNORE INTO schema_migrations VALUES (6, '0006_create_markup_rules', datetime('now'));

-- 0007: estimatesテーブル
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
INSERT OR IGNORE INTO schema_migrations VALUES (7, '0007_create_estimates', datetime('now'));

-- 0008: estimate_itemsテーブル
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
INSERT OR IGNORE INTO schema_migrations VALUES (8, '0008_create_estimate_items', datetime('now'));

-- 0009: サンプルデータ
INSERT OR IGNORE INTO product_categories (id, name, description, display_order)
VALUES
  ('cat-security', 'セキュリティサービス', 'Webアプリケーションファイアウォール、DDoS対策など', 1),
  ('cat-performance', 'パフォーマンス最適化', 'CDN、画像最適化など', 2),
  ('cat-reliability', '信頼性・可用性', 'ロードバランシング、フェイルオーバーなど', 3);

INSERT OR IGNORE INTO products (id, category_id, name, description, unit, base_price, display_order)
VALUES
  ('prod-waf', 'cat-security', 'Web Application Firewall', 'Webアプリケーションを保護', 'リクエスト/月', 5.0, 1),
  ('prod-ddos', 'cat-security', 'DDoS Protection', 'DDoS攻撃からの防御', '帯域幅 (Gbps)', 100.0, 2),
  ('prod-cdn', 'cat-performance', 'CDN（コンテンツ配信ネットワーク）', 'グローバルキャッシュ配信', 'GB転送量', 0.085, 3),
  ('prod-img-opt', 'cat-performance', 'Image Optimization', '画像の自動最適化', '画像変換回数/月', 0.5, 4),
  ('prod-lb', 'cat-reliability', 'Load Balancing', '負荷分散', 'リクエスト/月', 10.0, 5);

INSERT OR IGNORE INTO partners (id, name, slug, primary_color, secondary_color, default_markup_type, default_markup_value, is_active)
VALUES
  ('partner-demo', 'Demo Partner', 'demo', '#3B82F6', '#1E40AF', 'percentage', 20.0, 1);

INSERT OR IGNORE INTO schema_migrations VALUES (9, '0009_seed_data', datetime('now'));

-- 0010: customer_phoneカラム追加
ALTER TABLE estimates ADD COLUMN customer_phone TEXT;
INSERT OR IGNORE INTO schema_migrations VALUES (10, '0010_add_customer_phone', datetime('now'));

-- 0011: system_settingsテーブル
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
INSERT OR IGNORE INTO system_settings (id, brand_name, footer_text)
VALUES ('default', 'CostNavigator', 'Powered by CostNavigator');
INSERT OR IGNORE INTO schema_migrations VALUES (11, '0011_system_settings', datetime('now'));

-- 0012: refresh_tokensテーブル
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
INSERT OR IGNORE INTO schema_migrations VALUES (12, '0012_create_refresh_tokens', datetime('now'));

-- 0013: JWT_SECRET追加
ALTER TABLE system_settings ADD COLUMN jwt_secret TEXT;
UPDATE system_settings
SET jwt_secret = lower(hex(randomblob(32)))
WHERE id = 'default' AND jwt_secret IS NULL;
INSERT OR IGNORE INTO schema_migrations VALUES (13, '0013_add_jwt_secret_to_system_settings', datetime('now'));

-- 0015: デフォルトマークアップ更新（20%）
UPDATE partners
SET default_markup_value = 20,
    updated_at = datetime('now')
WHERE default_markup_type = 'percentage' AND default_markup_value < 20;
INSERT OR IGNORE INTO schema_migrations VALUES (15, '0015_update_default_markup_to_20', datetime('now'));
`.trim();

      // 一時ファイルに書き出し
      const tempMigrationFile = path.join(__dirname, '../.tmp-migration.sql');
      fs.writeFileSync(tempMigrationFile, migrationSQL);

      // wrangler d1 execute でマイグレーション実行
      execSync(`npx wrangler d1 execute ${DB_NAME} --remote --file="${tempMigrationFile}"`, {
        encoding: 'utf-8',
        stdio: 'inherit' // 出力を表示
      });

      // 一時ファイルを削除
      fs.unlinkSync(tempMigrationFile);

      console.log('✅ データベースマイグレーション完了\n');
    } catch (migrationError) {
      console.error('❌ マイグレーション実行エラー:', migrationError.message);
      console.log('⚠️  マイグレーションは失敗しましたが、デプロイは続行します');
      console.log('   Worker起動時の自動マイグレーションに頼ります\n');
    }
  } else {
    console.warn('⚠️  Database IDを取得できませんでした');
    console.warn('   Cloudflare Workers CI/CDの自動解決機能に頼ります\n');
  }

  console.log('✅ デプロイ準備完了\n');
  process.exit(0);

} catch (error) {
  console.error('❌ デプロイ準備中にエラーが発生しました');
  console.error(error.message);

  console.log('\n📝 トラブルシューティング:');
  console.log('1. wrangler のバージョンを確認: npx wrangler --version');
  console.log('2. Cloudflare認証を確認: npx wrangler whoami');
  console.log('3. 手動でD1データベースを作成: Cloudflare Dashboard > Workers & Pages > D1');
  console.log('4. データベース作成後、再デプロイしてください\n');

  // エラーが発生してもビルドは継続（手動設定を期待）
  // CI/CD環境では、Cloudflare Workers の自動解決機能に頼る
  console.log('⚠️  ビルドは継続しますが、デプロイ時にエラーになる可能性があります\n');
  process.exit(0);
}
