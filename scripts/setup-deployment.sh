#!/bin/bash
set -e

echo "🚀 CostNavigator デプロイメントセットアップ開始"

# D1データベースの存在確認と作成
DB_NAME="cost-navigator-db"
echo "📊 D1データベースを確認中..."

# 既存のD1データベースを検索
DB_ID=$(npx wrangler d1 list --json 2>/dev/null | jq -r ".[] | select(.name==\"$DB_NAME\") | .uuid" || echo "")

if [ -z "$DB_ID" ]; then
  echo "📊 D1データベースが見つかりません。新規作成します..."
  DB_ID=$(npx wrangler d1 create "$DB_NAME" --json | jq -r '.uuid')
  echo "✅ D1データベースを作成しました: $DB_ID"
else
  echo "✅ 既存のD1データベースを使用します: $DB_ID"
fi

# wrangler.jsonを動的に生成（database_idを設定）
echo "📝 デプロイ用設定ファイルを生成中..."
cat > dist/cost_navigator/wrangler.json <<EOF
{
  "name": "cost-navigator",
  "compatibility_date": "2025-01-01",
  "main": "./index.js",
  "assets": {
    "directory": "../client",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "$DB_NAME",
      "database_id": "$DB_ID"
    }
  ]
}
EOF

echo "✅ 設定ファイルを生成しました"

# マイグレーションの実行（初回のみ）
echo "📊 データベースマイグレーションを実行中..."
for migration in migrations/*.sql; do
  if [ -f "$migration" ]; then
    echo "  - $(basename $migration) を適用中..."
    npx wrangler d1 execute "$DB_NAME" --remote --file="$migration" 2>/dev/null || echo "    ⚠️  マイグレーション済みまたはエラー（続行）"
  fi
done

echo "✅ デプロイメントセットアップ完了"
