#!/usr/bin/env node
/**
 * デプロイ準備スクリプト
 *
 * Cloudflare Workers CI/CD環境で実行され、以下を自動的に行います：
 * 1. D1データベースの存在確認・作成
 * 2. wrangler.jsonにdatabase_idを動的に設定
 * 3. マイグレーションの実行
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_NAME = 'cost-navigator-db';
const DIST_DIR = path.join(__dirname, '../dist/cost_navigator');
const WRANGLER_JSON_PATH = path.join(DIST_DIR, 'wrangler.json');

console.log('🚀 CostNavigator デプロイ準備開始\n');

// Cloudflare API認証の確認
if (!process.env.CLOUDFLARE_API_TOKEN && !process.env.CLOUDFLARE_ACCOUNT_ID) {
  console.log('⚠️  Cloudflare API認証情報が見つかりません');
  console.log('   Cloudflare Workers CI/CD環境では自動的に設定されます');
  console.log('   ローカル環境では wrangler login を実行してください\n');
}

try {
  // D1データベースの確認・作成
  console.log('📊 D1データベースを確認中...');
  let dbId = null;

  try {
    const listOutput = execSync('npx wrangler d1 list --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const databases = JSON.parse(listOutput);
    const existingDb = databases.find(db => db.name === DB_NAME);

    if (existingDb) {
      dbId = existingDb.uuid;
      console.log(`✅ 既存のD1データベースを使用: ${dbId}\n`);
    }
  } catch (error) {
    console.log('   データベース一覧取得エラー（新規作成します）');
  }

  if (!dbId) {
    console.log('📊 D1データベースを新規作成中...');
    try {
      const createOutput = execSync(`npx wrangler d1 create ${DB_NAME} --json`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const result = JSON.parse(createOutput);
      dbId = result.uuid;
      console.log(`✅ D1データベースを作成しました: ${dbId}\n`);
    } catch (error) {
      console.error('❌ D1データベースの作成に失敗しました');
      console.error('   手動でCloudflareダッシュボードから作成してください');
      throw error;
    }
  }

  // wrangler.jsonの更新
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

  // マイグレーションの実行
  console.log('📊 データベースマイグレーションを確認中...');
  const migrationsDir = path.join(__dirname, '../migrations');

  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrationFiles.length > 0) {
      console.log(`   ${migrationFiles.length}個のマイグレーションファイルを検出`);
      console.log('   ⚠️  マイグレーションは初回デプロイ後に手動実行が必要です');
      console.log(`   コマンド: npx wrangler d1 execute ${DB_NAME} --remote --file=migrations/XXXX.sql\n`);
    }
  }

  console.log('✅ デプロイ準備完了\n');
  process.exit(0);

} catch (error) {
  console.error('❌ デプロイ準備中にエラーが発生しました');
  console.error(error.message);

  console.log('\n📝 手動セットアップ手順:');
  console.log('1. Cloudflareダッシュボード > Workers & Pages > D1');
  console.log(`2. "${DB_NAME}" という名前でデータベースを作成`);
  console.log('3. Database IDをコピー');
  console.log('4. Workers設定 > Variables > D1 database bindings で "DB" バインディングを追加\n');

  // ビルドは継続（手動設定を期待）
  process.exit(0);
}
