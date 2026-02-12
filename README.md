# CostNavigator

Cloudflare MSSP パートナー向け予算見積もりサービス

## 概要

CostNavigator は、Cloudflare 公式パートナー（MSSP）が再販先に提供する予算見積もりツールです。
AWS Pricing Calculator のように、エンドユーザーが Cloudflare 製品を選択し、パートナーごとのマークアップが適用された見積もりを作成できます。

### 主な機能

- **製品カタログ管理** - Cloudflare 製品・ティア（Free/Pro/Business/Enterprise）のCRUD管理
- **パートナー管理** - 再販パートナーごとのブランディング設定（ロゴ、カラー）
- **マークアップ設定** - パートナー×製品×ティアの3段階カスケード方式マークアップ
- **公開見積もりビルダー** - パートナー専用URLでエンドユーザーが見積もり作成
- **PDF出力** - パートナーブランド入りの見積もりPDFをクライアントサイドで生成
- **管理ダッシュボード** - 統計情報、見積もり一覧・詳細（マークアップ額を管理者のみ表示）

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React 19 + React Router v7 + TailwindCSS v4 |
| バックエンド | Cloudflare Workers + Hono (TypeScript) |
| データベース | Cloudflare D1 (SQLite) |
| PDF生成 | @react-pdf/renderer（クライアントサイド、遅延読み込み） |
| バリデーション | Zod（フロント・バックエンド共用） |
| ビルド | Vite + @cloudflare/vite-plugin |
| デプロイ | 単一 Cloudflare Worker + 静的アセット |

## クイックスタート

### 前提条件

- Node.js 18 以上
- npm
- Wrangler CLI（`npm install -g wrangler`）
- Cloudflare アカウント（デプロイ時）

### ローカル開発

```bash
# 依存関係インストール
npm install

# D1 データベースをローカルに作成・マイグレーション
npm run db:migrate:local -- migrations/0001_create_users.sql
npm run db:migrate:local -- migrations/0002_create_partners.sql
npm run db:migrate:local -- migrations/0003_create_product_categories.sql
npm run db:migrate:local -- migrations/0004_create_products.sql
npm run db:migrate:local -- migrations/0005_create_product_tiers.sql
npm run db:migrate:local -- migrations/0006_create_markup_rules.sql
npm run db:migrate:local -- migrations/0007_create_estimates.sql
npm run db:migrate:local -- migrations/0008_create_estimate_items.sql
npm run db:migrate:local -- migrations/0009_seed_data.sql

# 開発サーバー起動
npm run dev
```

### 初期セットアップ

開発サーバー起動後、管理者ユーザーを作成します。

```bash
curl -X POST http://localhost:5173/api/auth/setup
```

### ログイン

- URL: `http://localhost:5173/admin/login`
- メール: `admin@costnavigator.dev`
- パスワード: `admin1234`

### 見積もりページ

- URL: `http://localhost:5173/estimate/demo`（デモパートナー）

## プロジェクト構成

```
CostNavigator/
├── index.html                    # SPA エントリポイント
├── package.json                  # 依存関係・スクリプト
├── vite.config.ts                # Vite + Cloudflare + TailwindCSS 設定
├── wrangler.jsonc                # Cloudflare Workers 設定（D1バインディング）
├── tsconfig.json                 # TypeScript 設定（app/worker 分割）
├── migrations/                   # D1 SQL マイグレーション（0001〜0009）
├── shared/                       # フロント・バックエンド共有
│   ├── types/                    # 型定義 + Zod スキーマ
│   └── constants/                # 定数（通貨、ページネーション等）
├── worker/                       # Hono API バックエンド
│   ├── index.ts                  # API エントリポイント
│   ├── env.ts                    # Cloudflare Bindings 型
│   ├── middleware/               # JWT認証、CORS、エラーハンドラー
│   ├── routes/                   # APIルート定義
│   ├── services/                 # ビジネスロジック
│   ├── repositories/             # D1 クエリ層（Repository パターン）
│   └── utils/                    # パスワード、レスポンス、バリデーション
└── src/                          # React SPA フロントエンド
    ├── api/                      # API クライアント
    ├── contexts/                 # AuthContext（認証状態管理）
    ├── hooks/                    # useEstimateBuilder 等
    ├── components/               # UI / レイアウト / 共通コンポーネント
    ├── pages/
    │   ├── admin/                # 管理画面ページ
    │   └── public/               # 公開見積もりページ
    └── lib/                      # PDF生成、フォーマッター
```

## API エンドポイント

### 公開API（認証不要）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/health` | ヘルスチェック |
| GET | `/api/public/:slug` | パートナーブランディング情報 |
| GET | `/api/public/:slug/products` | マークアップ適用済み製品カタログ |
| POST | `/api/public/:slug/estimates` | 見積もり作成 |
| GET | `/api/public/estimates/:ref` | 見積もり参照番号で取得 |

### 認証API

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/auth/login` | ログイン（JWT発行） |
| GET | `/api/auth/me` | ユーザー情報取得 |
| POST | `/api/auth/setup` | 初期管理者作成 |

### 管理API（JWT認証必須）

| メソッド | パス | 説明 |
|----------|------|------|
| CRUD | `/api/admin/categories` | カテゴリ管理 |
| CRUD | `/api/admin/products` | 製品管理 |
| CRUD | `/api/admin/product-tiers` | ティア管理 |
| CRUD | `/api/admin/partners` | パートナー管理 |
| CRUD | `/api/admin/partners/:id/markup-rules` | マークアップルール管理 |
| GET/DELETE | `/api/admin/estimates` | 見積もり管理 |
| GET | `/api/admin/dashboard/stats` | ダッシュボード統計 |

## 本番デプロイ

```bash
# D1 データベース作成
wrangler d1 create cost-navigator-db

# wrangler.jsonc の database_id を更新

# マイグレーション適用（本番）
for f in migrations/*.sql; do npm run db:migrate:remote -- "$f"; done

# JWT シークレット設定
wrangler secret put JWT_SECRET

# デプロイ
npm run deploy
```

## ドキュメント

詳細なドキュメントは [GitHub Wiki](../../wiki) を参照してください。

| ドキュメント | 対象者 | 内容 |
|-------------|--------|------|
| [システム仕様書](../../wiki/システム仕様書) | 開発者/管理者 | 技術スタック、DB設計、ビジネスロジック |
| [アーキテクチャ図](../../wiki/アーキテクチャ図) | 開発者/管理者 | システム構成図、シーケンス図 |
| [APIリファレンス](../../wiki/APIリファレンス) | 開発者 | 全HTTPエンドポイントの詳細仕様 |
| [セキュリティ仕様書](../../wiki/セキュリティ仕様書) | 開発者/管理者 | 認証、暗号化、入力検証 |
| [開発者ガイド](../../wiki/開発者ガイド) | 開発者 | ソースコード解説、モジュール責務 |
| [構築・運用マニュアル](../../wiki/構築・運用マニュアル) | 運用担当者 | インストール、設定、デプロイ手順 |
| [保守マニュアル](../../wiki/保守マニュアル) | 運用担当者 | DB管理、バックアップ、監視 |
| [トラブルシューティング](../../wiki/トラブルシューティング) | 運用担当者 | よくある問題と解決方法 |

## ライセンス

Private - All rights reserved.
