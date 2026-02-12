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
| フロントエンド | React 19 + React Router v7 + TailwindCSS v4 + Plus Jakarta Sans / Noto Sans JP |
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
npm run db:migrate:local -- migrations/0010_system_direct_partner.sql
npm run db:migrate:local -- migrations/0011_add_customer_phone.sql
npm run db:migrate:local -- migrations/0012_create_refresh_tokens.sql

# 開発サーバー起動
npm run dev
```

### 初期セットアップ

開発サーバー起動後、管理者ユーザーを作成します。

```bash
curl -X POST http://localhost:5173/api/auth/setup
```

### ログイン（開発環境のみ）

- URL: `http://localhost:5173/admin/login`
- メール: `admin@costnavigator.dev`
- パスワード: `admin1234`

**警告**: デフォルト認証情報は開発環境専用です。本番環境では必ず以下を実施してください:
- 初回ログイン後、すぐにパスワードを変更（ユーザー管理機能で変更）
- `/api/auth/setup`エンドポイントへのアクセスを制限
- 強力なパスワードポリシーを適用

### 見積もりページ

- URL: `http://localhost:5173/`（ダイレクト見積もり / マークアップなし）
- URL: `http://localhost:5173/estimate/demo`（デモパートナー経由）

## プロジェクト構成

```
CostNavigator/
├── index.html                    # SPA エントリポイント
├── package.json                  # 依存関係・スクリプト
├── vite.config.ts                # Vite + Cloudflare + TailwindCSS 設定
├── wrangler.jsonc                # Cloudflare Workers 設定（D1バインディング）
├── tsconfig.json                 # TypeScript 設定（app/worker 分割）
├── migrations/                   # D1 SQL マイグレーション（0001〜0011）
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
| POST | `/api/auth/login` | ログイン（アクセストークン + リフレッシュトークン発行） |
| POST | `/api/auth/refresh` | トークンリフレッシュ（リフレッシュトークンを使って新しいアクセストークンを取得） |
| GET | `/api/auth/me` | ユーザー情報取得（認証必須） |
| POST | `/api/auth/setup` | 初期管理者作成（初回のみ） |

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

### エラーコード一覧

APIは以下のエラーコードを返却します。

| コード | 説明 | HTTPステータス |
|--------|------|---------------|
| `VALIDATION_ERROR` | リクエストボディのバリデーションエラー | 400 |
| `INVALID_JSON` | JSONパースエラー | 400 |
| `INVALID_STATUS` | 無効な見積もりステータス | 400 |
| `PRODUCT_IN_USE` | 製品が見積もりで使用中のため削除不可 | 400 |
| `PARTNER_IN_USE` | パートナーが見積もりで使用中のため削除不可 | 400 |
| `CATEGORY_IN_USE` | カテゴリが製品で使用中のため削除不可 | 400 |
| `SYSTEM_PARTNER_DELETION` | システムパートナー（direct）は削除不可 | 400 |
| `UNAUTHORIZED` | 認証エラー（トークン未提供または無効） | 401 |
| `INVALID_TOKEN` | JWT検証失敗 | 401 |
| `INVALID_CREDENTIALS` | メールアドレスまたはパスワードが正しくない | 401 |
| `INVALID_REFRESH_TOKEN` | リフレッシュトークンが無効または期限切れ | 401 |
| `SESSION_EXPIRED` | セッション期限切れ（再ログインが必要） | 401 |
| `SETUP_ALREADY_COMPLETED` | セットアップ済み（複数回実行不可） | 403 |
| `NOT_FOUND` | リソースが見つからない | 404 |
| `USER_NOT_FOUND` | ユーザーが見つからない | 404 |

### 認証

- 管理APIは`Authorization: Bearer <JWT>`ヘッダーが必須
- アクセストークン有効期限: 15分（短命、定期的にリフレッシュ）
- リフレッシュトークン有効期限: 7日間
- トークンリフレッシュ機能: 実装済み
  - アクセストークンの有効期限が切れると、自動的にリフレッシュトークンを使って新しいアクセストークンを取得
  - リフレッシュトークンも同時にローテーション（セキュリティ向上）
  - リフレッシュ失敗時は自動的にログアウト

## 本番デプロイ

### 1. 環境変数の準備

**JWT_SECRET の生成**（必須）:
```bash
# 暗号学的に安全なランダム文字列を生成（最低32バイト推奨）
openssl rand -hex 32

# 生成された文字列をシークレットとして設定
wrangler secret put JWT_SECRET
# プロンプトが表示されたら、生成した文字列を貼り付け
```

**重要**: JWT_SECRETは絶対にコードにコミットしないでください。

**ALLOWED_ORIGINS の設定**（本番環境推奨）:
```bash
# 管理画面・認証APIへのアクセスを許可するオリジンをカンマ区切りで設定
wrangler secret put ALLOWED_ORIGINS
# 例: https://admin.example.com,https://costnavigator.example.com

# 未設定の場合: 開発モード（localhostからのアクセスを許可）
# 公開API (/api/public/*) は常にすべてのオリジンを許可（パートナー埋め込み対応）
```

**注意**:
- 管理API (`/api/admin/*`) と認証API (`/api/auth/*`) は ALLOWED_ORIGINS で指定されたオリジンからのみアクセス可能
- 公開API (`/api/public/*`) はすべてのオリジンからアクセス可能（パートナー向け埋め込み対応）
- 開発環境では ALLOWED_ORIGINS 未設定時に `http://localhost:*` からのアクセスを自動許可

### 2. データベースのセットアップ

```bash
# D1 データベース作成
wrangler d1 create cost-navigator-db

# 出力されたdatabase_idをwrangler.jsonc に設定
# wrangler.jsonc の "database_id": "placeholder-..." を実際のIDに置き換え

# マイグレーション適用（本番）
for f in migrations/*.sql; do npm run db:migrate:remote -- "$f"; done
```

### 3. デプロイ

```bash
# プロジェクトをビルドしてデプロイ
npm run deploy
```

### 4. 初期管理者の作成と設定

```bash
# デプロイ後、初回のみセットアップエンドポイントを実行
curl -X POST https://your-worker.workers.dev/api/auth/setup

# すぐに管理画面にログイン
# デフォルト認証情報: admin@costnavigator.dev / admin1234

# ログイン後、必ず以下を実施:
# 1. パスワードを強力なものに変更
# 2. 必要に応じて追加の管理者ユーザーを作成
# 3. /api/auth/setup エンドポイントへのアクセスを制限
```

### セキュリティチェックリスト

本番デプロイ前に以下を確認してください:

- [ ] JWT_SECRETを安全に生成・設定（wrangler secretで設定）
- [ ] ALLOWED_ORIGINSを設定（本番ドメインをカンマ区切りで指定）
- [ ] デフォルト管理者パスワードを変更
- [ ] 本番ドメインでHTTPS接続を確認
- [ ] データベースバックアップ戦略を策定

## アーキテクチャ設計の重要な判断

### マークアップ解決の3段階カスケード

パートナーごとのマークアップは以下の優先順位で解決されます。

1. **製品+ティア固有マークアップ** - 最も詳細なルール
2. **製品固有マークアップ** - ティア共通のルール
3. **パートナーデフォルトマークアップ** - フォールバック

詳細は `worker/repositories/markup-repository.ts` の `resolveMarkup()` を参照。

### 見積もり明細のデータ非正規化と外部キー制約

見積もり明細 (estimate_items) は製品名・ティア名を文字列として保存します（product_id/tier_idの外部キー参照のみではない）。これは履歴データの保全のための設計判断です。製品名が変更されても、過去の見積もりは作成時点の名称で表示されます。

**外部キー制約について**:
- `estimate_items`テーブルの`product_id`と`tier_id`には外部キー制約がありません
- これは意図的な設計で、製品やティアが削除されても過去の見積もりデータを保持します
- ただし、製品・ティア・パートナー・カテゴリの削除時には、見積もりでの使用状況をチェックし、使用中の場合は削除をブロックします
- 削除が必要な場合は`is_active = false`に設定して非表示化してください

### 参照番号の生成

見積もり参照番号は `CN-{timestamp}-{random}` 形式で、推測不可能な値を使用します。`crypto.getRandomValues()` により暗号学的に安全なランダム値を生成しています。

### セキュリティ上の注意事項

#### 認証・トークン管理
- `/api/auth/setup` エンドポイントは初回セットアップ専用です。ユーザーが存在する場合は実行できません。
- 本番環境では初期セットアップ後、このエンドポイントへのアクセスを制限することを推奨します。
- デフォルト管理者パスワード (`admin1234`) は初回ログイン後、必ず変更してください。

#### トークンストレージ
- アクセストークンとリフレッシュトークンは localStorage に保存されます
- **XSS 攻撃のリスク**: localStorage はJavaScriptからアクセス可能なため、XSS攻撃でトークンが盗まれる可能性があります
- **対策**:
  - Content Security Policy (CSP) を適切に設定
  - 信頼できないコンテンツの埋め込みを避ける
  - 定期的なセキュリティ監査を実施
  - アクセストークンの有効期限を短く設定（現在15分）
  - リフレッシュトークンローテーションで被害を最小化

#### トークンリフレッシュのセキュリティ
- リフレッシュトークンは SHA-256 でハッシュ化してDBに保存（平文保存を避ける）
- リフレッシュ時に両方のトークンを更新（トークンローテーション）
- ユーザーごとに1つのリフレッシュトークンのみ有効（複数デバイス対応が必要な場合は設計変更が必要）
- 期限切れトークンは自動削除

## 既知の制限事項

### パフォーマンス
- **見積もり作成時のN+1クエリ**: 見積もり作成時、各アイテムに対して個別にデータベースクエリを実行します（製品、ティア、マークアップルール）。アイテム数が多い場合、パフォーマンスに影響する可能性がありますが、D1はローカルデータベースのためネットワークレイテンシはありません。

### 認証・セッション管理
- **複数デバイス対応**: ユーザーごとに1つのリフレッシュトークンのみ有効です。複数デバイスから同時にログインすると、古いセッションは無効化されます。複数デバイス対応が必要な場合は、refresh_tokens テーブルの設計変更が必要です。
- **トークンリフレッシュのタイミング**: 現在は401エラー後にリフレッシュを試行します。理想的には有効期限の数分前にプロアクティブにリフレッシュすべきですが、15分の有効期限で実用上は問題ありません。

### データ管理
- **削除時の制約**: 製品、パートナー、カテゴリが見積もりで使用されている場合、削除できません。削除が必要な場合は `is_active = false` に設定して非表示化してください。
- **カスケード削除**: パートナーを削除すると、関連する見積もりもすべて削除されます（ON DELETE CASCADE）。削除前に必ずバックアップを取得してください。

## トラブルシューティング

### マイグレーションエラー

**問題**: `npm run db:migrate:local` でエラーが発生する

**解決策**:
```bash
# .wrangler/state/ ディレクトリを削除して再試行
rm -rf .wrangler/state/
npm run db:migrate:local -- migrations/0001_create_users.sql
# 以降のマイグレーションを順番に実行
```

### ログインできない

**問題**: 正しい認証情報でログインできない

**解決策**:
1. ブラウザの開発者ツールで localStorage をクリア
2. ブラウザのキャッシュをクリア
3. `/api/auth/me` に直接アクセスして、エラーメッセージを確認
4. JWT_SECRET が正しく設定されているか確認（`.dev.vars` または `wrangler secret`）

### トークンが自動更新されない

**問題**: 15分後にセッションが切れる

**解決策**:
1. ブラウザの開発者ツールのネットワークタブで `/api/auth/refresh` のリクエストを確認
2. リフレッシュトークンが localStorage に保存されているか確認（`cn_refresh_token`）
3. エラーログを確認して、リフレッシュトークンの検証エラーがないか確認

### CORS エラー

**問題**: 管理画面で CORS エラーが発生する

**解決策**:
1. 開発環境: `http://localhost:5173` からアクセスしていることを確認
2. 本番環境: `ALLOWED_ORIGINS` 環境変数に正しいオリジンが設定されているか確認
   ```bash
   wrangler secret put ALLOWED_ORIGINS
   # 例: https://admin.example.com,https://costnavigator.example.com
   ```

### ページネーションが動作しない

**問題**: 見積もり一覧で2ページ目以降が表示されない

**解決策**:
1. ブラウザの開発者ツールのネットワークタブで API レスポンスを確認
2. `totalPages` が正しく返されているか確認
3. データベースに十分なレコードがあるか確認（20件以上）

### PDF生成が失敗する

**問題**: 見積もり結果ページで PDF ダウンロードボタンをクリックしてもエラーになる

**解決策**:
1. ブラウザの開発者ツールのコンソールでエラーメッセージを確認
2. `@react-pdf/renderer` が正しくインストールされているか確認
   ```bash
   npm install @react-pdf/renderer
   ```
3. ブラウザのポップアップブロッカーが有効になっていないか確認

## FAQ

### Q: 見積もり参照番号の形式を変更できますか？

A: はい。`shared/constants/index.ts` の `ESTIMATE_REF_PREFIX` と、`worker/services/estimate-service.ts` の `generateReferenceNumber()` メソッドを変更してください。ただし、既存の見積もりには影響しません。

### Q: 通貨を USD から JPY に変更できますか？

A: はい。`shared/constants/index.ts` の `CURRENCY` オブジェクトを変更してください。ただし、データベースの価格データは変更されないため、すべての価格を再入力する必要があります。

### Q: カスタムドメインを設定するには？

A: Cloudflare Workers のカスタムドメイン機能を使用してください。詳細は [Cloudflare のドキュメント](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) を参照してください。

### Q: バックアップを取得するには？

A: D1 データベースのバックアップは以下のコマンドで取得できます：
```bash
wrangler d1 export cost-navigator-db --output backup.sql
```

### Q: 複数の管理者ユーザーを作成するには？

A: 現在、UI からの管理者ユーザー作成機能は実装されていません。以下のSQL を直接実行してください：
```sql
INSERT INTO users (id, email, password_hash, name, role)
VALUES (
  lower(hex(randomblob(16))),
  'admin2@example.com',
  '生成されたパスワードハッシュ',
  '管理者2',
  'admin'
);
```
パスワードハッシュは、既存のユーザーの `password_hash` を参考にするか、`worker/utils/password.ts` の `hashPassword()` を使用して生成してください。

## ライセンス

Private - All rights reserved.
