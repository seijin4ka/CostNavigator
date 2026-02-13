# CostNavigator

Cloudflare MSSP パートナー向け予算見積もりサービス

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/seijin4ka/CostNavigator)

## 概要

CostNavigator は、Cloudflare 公式パートナー（MSSP）が再販先に提供する予算見積もりツールです。
AWS Pricing Calculator のように、エンドユーザーが Cloudflare 製品を選択し、パートナーごとのマークアップが適用された見積もりを作成できます。

**簡単デプロイ**: GitHubリポジトリを指定するだけで、数分でCloudflare Workersにデプロイできます。
詳細は [デプロイメントガイド](DEPLOYMENT.md) をご覧ください。

### 主な機能

- **製品カタログ管理** - Cloudflare 製品・ティア（Free/Pro/Business/Enterprise）のCRUD管理
- **パートナー管理** - 再販パートナーごとのブランディング設定（ロゴ、カラー）
- **マークアップ設定** - パートナー×製品×ティアの3段階カスケード方式マークアップ
- **システム設定** - サイト全体のブランディング（ブランド名、ロゴ、カラー、フッター）とデフォルトパートナー設定
- **公開見積もりビルダー** - パートナー専用URLでエンドユーザーが見積もり作成
- **PDF出力** - パートナーブランド入りの見積もりPDFをクライアントサイドで生成
- **管理ダッシュボード** - 統計情報、見積もり一覧・詳細（マークアップ額を管理者のみ表示）
- **パートナー独自サイト対応** - 各パートナーが独自ドメインで運用可能、原価漏洩を防止

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

# 開発サーバー起動
npm run dev
```

開発サーバー起動後、ブラウザで以下にアクセス:

```
http://localhost:5173/admin/login
```

**初回アクセス時に自動的に**以下が実行されます:
- データベースマイグレーション（全13個）
- JWT_SECRET自動生成
- 初期管理者アカウント作成

ログイン画面が表示されたら、セットアップ完了です。

### ログイン（開発環境）

- URL: `http://localhost:5173/admin/login`
- Email: `admin@costnavigator.dev`
- Password: `admin1234`

**重要**: 初回ログイン後、必ずパスワードを変更してください。

### 見積もりページ

- URL: `http://localhost:5173/`（システム設定のデフォルトパートナーに基づいて動的にルーティング）
  - デフォルトパートナーが設定されている場合: そのパートナーの見積もりページを表示
  - 未設定の場合: 管理画面ログインページにリダイレクト
- URL: `http://localhost:5173/estimate/demo`（デモパートナー経由で直接アクセス）

**注**: パートナー毎に独自のサイトとしてデプロイすることを推奨します。
詳細は「パートナー独自サイトのデプロイ」セクションを参照してください。

## プロジェクト構成

```
CostNavigator/
├── index.html                    # SPA エントリポイント
├── package.json                  # 依存関係・スクリプト
├── vite.config.ts                # Vite + Cloudflare + TailwindCSS 設定
├── wrangler.jsonc                # Cloudflare Workers 設定（D1バインディング）
├── tsconfig.json                 # TypeScript 設定（app/worker 分割）
├── migrations/                   # D1 SQL マイグレーション（0001〜0013、自動実行）
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
| GET | `/api/public/system-settings` | システム設定取得（ブランディング情報） |
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
| POST | `/api/auth/setup` | 手動セットアップ（通常は不要、初回アクセス時に自動実行される） |

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
| GET/PUT | `/api/admin/system-settings` | システム設定管理（ブランディング、デフォルトパートナー） |

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

### 推奨デプロイ方法: Cloudflare Workers CI/CD（GitHub連携）

最も簡単なデプロイ方法です。**GitHubにpushするだけ**で自動的にデプロイされます。

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

**デプロイ手順の概要**:

1. GitHubリポジトリをCloudflare Workers CI/CDに接続
2. GitHubにpush → 自動ビルド・デプロイ（D1データベースも自動作成）
3. （初回のみ）Cloudflareダッシュボードで D1 Binding を設定
4. 管理画面にアクセス → **自動的にセットアップ完了**

**Node.jsのインストール不要、マイグレーション実行不要、環境変数設定不要**です。

### 手動デプロイ方法（ローカル環境から）

開発者向けの方法です。

```bash
# 1. Cloudflareにログイン
npx wrangler login

# 2. ビルドしてデプロイ
npm run deploy
```

デプロイ後、管理画面にアクセス:
```
https://your-worker-name.workers.dev/admin/login
```

初回アクセス時に自動的に:
- データベースマイグレーション実行
- JWT_SECRET自動生成
- 初期管理者アカウント作成（`admin@costnavigator.dev` / `admin1234`）

が完了します。

### 環境変数（オプション）

#### ALLOWED_ORIGINS（本番環境推奨）

```bash
wrangler secret put ALLOWED_ORIGINS
# 例: https://admin.example.com,https://costnavigator.example.com
```

- 管理API (`/api/admin/*`) と認証API (`/api/auth/*`) は ALLOWED_ORIGINS で指定されたオリジンからのみアクセス可能
- 公開API (`/api/public/*`) はすべてのオリジンからアクセス可能（パートナー向け埋め込み対応）
- 開発環境では ALLOWED_ORIGINS 未設定時に `http://localhost:*` からのアクセスを自動許可

#### JWT_SECRET（オプション）

JWT_SECRETは初回起動時に**自動生成**され、データベースに保存されます。環境変数での設定は不要です。

カスタムのJWT_SECRETを使用したい場合のみ:

```bash
openssl rand -hex 32
wrangler secret put JWT_SECRET
```

**注意**: 環境変数でJWT_SECRETを設定した場合、それがデータベースの値より優先されます。

## パートナー独自サイトのデプロイ

CostNavigatorは、各パートナーが独自のサイトとしてデプロイできるように設計されています。
これにより、原価漏洩を防ぎながら、パートナーが自社ブランドでサービスを提供できます。

### 設定手順

1. **パートナー情報の作成**
   - 管理画面にログイン `/admin/login`
   - パートナー管理 `/admin/partners` でパートナーを作成
   - ブランドカラー、ロゴURL、マークアップ設定を入力

2. **システム設定の変更**
   - システム設定 `/admin/settings` を開く
   - ブランド名を変更（例: "Partner Solutions"）
   - ロゴURL、カラーを設定
   - フッターテキストを変更（例: "Powered by Partner Solutions"）
   - **デフォルトパートナー**を選択（作成したパートナーを指定）
   - 保存

3. **動作確認**
   - トップページ `/` にアクセス
   - 選択したパートナーの見積もりページが表示される
   - 原価は表示されず、マークアップ適用済み価格のみ表示される
   - ブランディングが反映されている

### 複数パートナーでの運用

- 同一インスタンスで複数のパートナーを管理することも可能
- 各パートナーに専用URL `/estimate/:partnerSlug` を提供
- ただし、パートナー間で価格比較が可能になるため、**独自サイトとしてのデプロイを推奨**

### セキュリティチェックリスト

本番デプロイ前に以下を確認してください:

- [ ] JWT_SECRETが自動生成されていることを確認（オプション: カスタム値を環境変数で設定）
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
- 初回アクセス時に自動的にセットアップ（マイグレーション + 初期管理者作成）が実行されます。
- デフォルト管理者パスワード (`admin1234`) は初回ログイン後、**必ず変更してください**。
- JWT_SECRETは自動生成され、データベースに安全に保存されます。

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

## パフォーマンス最適化

### 見積もり作成の最適化（N+1クエリ問題の解決）
見積もり作成処理を最適化し、データベースクエリ数を大幅に削減しました。

**従来の実装**:
- 各アイテムごとに個別クエリを実行（N+1クエリ）
- 10アイテムの見積もり: 30回以上のクエリ

**最適化後の実装**:
- 必要なデータを一括取得（IN句を使用）
- 10アイテムの見積もり: 2回のクエリ
- **改善率**: 93%以上のクエリ削減

**技術詳細**:
- `ProductRepository.findByIds()`: 複数製品を一括取得
- `TierRepository.findByIds()`: 複数ティアを一括取得
- 結果を `Map<string, T>` に変換して高速な検索を実現
- `Promise.all` で並列実行

### トークンリフレッシュの最適化
**プロアクティブなリフレッシュ**: トークン有効期限の2分前に自動リフレッシュを実行することで、ユーザーは401エラーを体験せず、シームレスなセッション維持を実現しています。

## セキュリティ機能

### セキュリティヘッダー
すべてのレスポンスに以下のセキュリティヘッダーを付与しています：

- **Content-Security-Policy (CSP)**: XSS攻撃の防止
- **X-Content-Type-Options: nosniff**: MIMEタイプスニッフィング防止
- **X-Frame-Options: DENY**: クリックジャッキング防止
- **Referrer-Policy: strict-origin-when-cross-origin**: リファラー情報の制御
- **Permissions-Policy**: 不要な機能（位置情報、カメラ、マイク）の無効化

これらのヘッダーにより、OWASP Top 10 の複数の脆弱性を軽減しています。

## 既知の制限事項

### パフォーマンス
- **マークアップ解決のクエリ**: マークアップルール解決時、カスケード方式で複数クエリを実行する可能性があります。ただし、ほとんどのケースで2〜3回のクエリのみです。

### 認証・セッション管理
- **複数デバイス対応**: ユーザーごとに1つのリフレッシュトークンのみ有効です。複数デバイスから同時にログインすると、古いセッションは無効化されます。複数デバイス対応が必要な場合は、refresh_tokens テーブルの設計変更が必要です（デバイスIDカラムの追加など）。

### データ管理
- **削除時の制約**: 製品、パートナー、カテゴリが見積もりで使用されている場合、削除できません。削除が必要な場合は `is_active = false` に設定して非表示化してください。
- **カスケード削除**: パートナーを削除すると、関連する見積もりもすべて削除されます（ON DELETE CASCADE）。削除前に必ずバックアップを取得してください。

## トラブルシューティング

### 初回アクセス時のエラー

**問題**: 管理画面にアクセスしてもログイン画面が表示されない、またはエラーが発生する

**解決策**:
1. D1 Bindingが正しく設定されているか確認（Cloudflareダッシュボード > Workers & Pages > Settings > Variables > D1 database bindings）
2. ブラウザのコンソールログを確認してエラー内容を特定
3. ローカル開発の場合、`.wrangler/state/` ディレクトリを削除して開発サーバーを再起動

### ログインできない

**問題**: 正しい認証情報でログインできない

**解決策**:
1. ブラウザの開発者ツールで localStorage をクリア
2. ブラウザのキャッシュをクリア
3. `/api/auth/me` に直接アクセスして、エラーメッセージを確認
4. カスタムJWT_SECRETを使用している場合、環境変数が正しく設定されているか確認

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
