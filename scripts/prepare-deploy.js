#!/usr/bin/env node
/**
 * デプロイ準備スクリプト
 *
 * Cloudflare Workers CI/CD環境で実行され、以下を自動的に行います：
 * 1. D1データベースの存在確認・作成
 * 2. wrangler.jsonにdatabase_idを動的に設定
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
