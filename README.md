# CostNavigator

Cloudflare MSSPパートナー向けの予算見積もりサービス。パートナー企業が自社ブランドでCloudflareソリューションの見積もりを提供できます。

**提供元**: Cloudflare公認パートナー [アクセリア株式会社（Accelia, Inc.）](https://accelia.net)

CostNavigatorは、MSSPパートナー企業がCloudflareサービスを再販する際に、各社のブランドで顧客向け見積もりを提供できるプラットフォームです。

## 主な機能

### パートナー向け機能
- **カスタムブランディング**: ロゴ、カラー、フッターテキストをカスタマイズ
- **独自ドメイン対応**: パートナー独自のドメインで提供可能
- **マークアップ管理**: 製品・ティア別に柔軟なマークアップ設定（パーセンテージ/固定額）
- **見積もり履歴**: 顧客からの見積もり依頼を一元管理
- **PDF出力**: プロフェッショナルな見積書PDFを自動生成

### エンドユーザー（顧客）向け機能
- **シンプルな見積もりフォーム**: 製品を選択して数量を入力するだけ
- **リアルタイム価格計算**: ティア価格を考慮した自動計算
- **見積書PDF**: その場で見積書をダウンロード
- **参照番号**: 見積もりごとにユニークな参照番号を発行

## デプロイ方法（ワンクリック）

### Deploy to Cloudflare Workers

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/seijin4ka/CostNavigator)

**たった3ステップでデプロイ完了**:

1. 上記ボタンをクリック
2. Cloudflareアカウントでログイン
3. 管理画面にアクセス → 自動セットアップ完了

**Node.jsのインストール不要、コマンド実行不要、環境変数設定不要**

### デプロイ後の初回セットアップ

デプロイ完了後、ブラウザで以下にアクセス:

```
https://your-worker-name.workers.dev/admin/login
```

初回アクセス時に**自動的に**以下が実行されます:
- データベースのセットアップ（全テーブル作成）
- セキュリティキーの自動生成
- 初期管理者アカウントの作成

ログイン画面が表示されたら、セットアップ完了です。

**初期管理者アカウント**:
- Email: `admin@costnavigator.dev`
- Password: `admin1234`

⚠️ **初回ログイン後、必ずパスワードを変更してください**

## 使い方

### 1. システム設定

管理画面 > **システム設定** で、ブランディングをカスタマイズ:
- ブランド名
- ロゴURL
- プライマリカラー / セカンダリカラー
- フッターテキスト
- デフォルトパートナー（トップページに表示するパートナー）

### 2. パートナー情報の登録

管理画面 > **パートナー管理** で、自社パートナー情報を登録:
- パートナー名
- スラッグ（URLに使用、例: `demo`）
- ブランドカラー
- デフォルトマークアップ（全製品に適用される基本マークアップ、推奨値: 20%）

### 3. 製品・カテゴリの設定

管理画面 > **カテゴリ管理** / **製品管理** で:
- 製品カテゴリを作成（例: セキュリティサービス、パフォーマンス最適化）
- 製品を登録（製品名、基本価格、ティア価格）
- サンプルデータが初期登録済みなので、すぐに試せます

### 4. マークアップの調整

管理画面 > **パートナー管理** > パートナーを選択 > **マークアップ設定** で:
- 製品別のマークアップを設定
- ティア別の細かいマークアップも可能
- 設定しない場合は、パートナーのデフォルトマークアップ（推奨値: 20%）が適用されます

### 5. 見積もりページの共有

顧客に以下のURLを共有:
```
https://your-worker-name.workers.dev/estimate/your-partner-slug
```

または、独自ドメインを設定して:
```
https://estimate.yourcompany.com/
```

## カスタムドメインの設定

独自ドメインを使用する場合:

1. Cloudflareダッシュボード > **Workers & Pages** > あなたのWorker
2. **Custom Domains** タブ > **Add Custom Domain**
3. ドメイン名を入力（例: `estimate.yourcompany.com`）
4. DNSレコードが自動的に設定されます

## パートナー独自サイトとしてのデプロイ

### なぜ独自サイトが必要か？

複数のパートナーを同一インスタンスで管理すると、顧客が異なるパートナーのURLにアクセスすることで、**原価（基本価格）を比較できてしまいます**。

パートナーごとに独自のサイトとしてデプロイすることで:
- 原価漏洩を防止
- パートナー独自のブランディング
- セキュリティとプライバシーの向上

### 独自サイトの設定方法

1. **このリポジトリをFork**（または新規デプロイ）
2. **システム設定**で、自社のブランド情報を設定
3. **パートナー管理**で、自社パートナー情報を1件のみ登録
4. **システム設定**で、デフォルトパートナーに自社パートナーを設定
5. トップページ（`/`）が自動的に自社の見積もりページになります

## 技術仕様

### アーキテクチャ

- **フロントエンド**: React 19 + React Router v7 + TailwindCSS v4
- **バックエンド**: Cloudflare Workers + Hono
- **データベース**: Cloudflare D1（SQLite）
- **PDF生成**: @react-pdf/renderer（クライアントサイド）
- **認証**: JWT + リフレッシュトークン（自動ローテーション）

### セキュリティ

- **JWT自動生成**: 暗号学的に安全なランダム値を自動生成
- **リフレッシュトークン**: 7日間有効、自動ローテーション
- **CORS設定**: 管理APIは制限的、公開APIは柔軟
- **CSP/セキュリティヘッダー**: XSS、クリックジャッキング対策
- **参照番号**: 推測不可能なランダム値を使用

### パフォーマンス

- **エッジコンピューティング**: Cloudflare Workers（世界300都市以上）
- **高速レスポンス**: 平均 < 50ms
- **N+1クエリ解消**: 一括取得により93%以上のクエリ削減
- **グローバルキャッシュ**: 静的アセットはCDN配信

## 料金

### Cloudflareの無料プランで使用可能

- **Workers**: 100,000 リクエスト/日（無料）
- **D1 Database**: 5GB ストレージ、500万行読み取り/日（無料）
- **独自ドメイン**: 無制限（無料）

大規模利用の場合はCloudflare有料プランを検討してください。

## サポート

### ドキュメント

- [デプロイガイド](./DEPLOYMENT.md) - 詳細なデプロイ手順
- [開発ガイド](./CLAUDE.md) - 開発者向け技術情報

### トラブルシューティング

#### 初回アクセス時にエラーが発生する

**原因**: D1 Bindingが未設定の可能性があります。

**解決策**:
1. Cloudflareダッシュボード > Workers & Pages > あなたのWorker
2. Settings > Variables > D1 database bindings を確認
3. `DB` binding が `cost-navigator-db` に設定されているか確認
4. 未設定の場合、手動で追加して再デプロイ

通常、2回目以降のデプロイでは自動設定されます。

#### ログインできない

**解決策**:
1. ブラウザのキャッシュと localStorage をクリア
2. `/api/auth/me` に直接アクセスしてエラー内容を確認
3. それでも解決しない場合、`.wrangler/state/` を削除して再デプロイ（ローカル開発の場合）

#### CORS エラー

**原因**: 管理画面に異なるドメインからアクセスしている

**解決策**:
環境変数 `ALLOWED_ORIGINS` を設定:
```bash
wrangler secret put ALLOWED_ORIGINS
# 例: https://admin.example.com,https://estimate.example.com
```

## ライセンス

このプロジェクトはオープンソースです。商用利用も可能です。

## 貢献

バグ報告、機能リクエスト、プルリクエストを歓迎します。

[GitHub Issues](https://github.com/seijin4ka/CostNavigator/issues)

---

## 開発者向け情報

### ローカル開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

開発サーバー起動後、`http://localhost:5173/admin/login` にアクセス。
初回アクセス時に自動セットアップが実行されます。

### プロジェクト構成

```
CostNavigator/
├── worker/                      # Hono API バックエンド
│   ├── index.ts                 # エントリポイント
│   ├── middleware/              # 認証、CORS、自動セットアップ
│   ├── routes/                  # APIルート
│   ├── services/                # ビジネスロジック
│   ├── repositories/            # D1クエリ層
│   └── utils/                   # ヘルパー、自動マイグレーション
├── src/                         # React SPA
│   ├── pages/                   # ページコンポーネント
│   ├── components/              # UIコンポーネント
│   └── api/                     # APIクライアント
├── shared/                      # フロント・バックエンド共有
│   ├── types/                   # 型定義 + Zod スキーマ
│   └── constants/               # 定数
├── migrations/                  # D1マイグレーション（自動実行）
└── scripts/                     # デプロイスクリプト
```

### APIエンドポイント

#### 公開API（認証不要）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/public/:partnerSlug/products` | パートナーの製品一覧（マークアップ適用済み） |
| GET | `/api/public/:partnerSlug/partner-info` | パートナー情報（ブランディング） |
| POST | `/api/public/:partnerSlug/estimates` | 見積もり作成 |
| GET | `/api/public/:partnerSlug/estimates/:ref` | 見積もり詳細取得 |
| GET | `/api/public/system-settings` | システム設定（ブランディング情報） |

#### 認証API

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/refresh` | トークンリフレッシュ |
| GET | `/api/auth/me` | ユーザー情報取得 |
| POST | `/api/auth/setup` | 手動セットアップ（通常は不要） |

#### 管理API（JWT認証必須）

| メソッド | パス | 説明 |
|----------|------|------|
| GET/POST/PUT/DELETE | `/api/admin/categories` | カテゴリ管理 |
| GET/POST/PUT/DELETE | `/api/admin/products` | 製品管理 |
| GET/POST/PUT/DELETE | `/api/admin/partners` | パートナー管理 |
| GET/POST/PUT/DELETE | `/api/admin/partners/:id/markup` | マークアップ管理 |
| GET | `/api/admin/estimates` | 見積もり一覧 |
| GET | `/api/admin/dashboard/stats` | ダッシュボード統計 |
| GET/PUT | `/api/admin/system-settings` | システム設定 |

### 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `JWT_SECRET` | いいえ | JWT署名キー（自動生成される） |
| `ALLOWED_ORIGINS` | 推奨 | CORS許可オリジン（カンマ区切り） |

### データベース

Cloudflare D1（SQLite）を使用。マイグレーションは初回アクセス時に自動実行されます。

**テーブル一覧**:
- `users` - 管理者ユーザー
- `partners` - パートナー情報
- `product_categories` - 製品カテゴリ
- `products` - 製品マスタ
- `product_tiers` - ティア価格
- `markup_rules` - マークアップルール
- `estimates` - 見積もり
- `estimate_items` - 見積もり明細
- `system_settings` - システム設定
- `refresh_tokens` - リフレッシュトークン
- `schema_migrations` - マイグレーション履歴

### コマンド

```bash
# ビルド
npm run build

# ローカルビルド（prepare-deploy.jsをスキップ）
npm run build:local

# デプロイ
npm run deploy

# 開発サーバー
npm run dev

# 手動マイグレーション（通常は不要）
npm run db:migrate:local -- migrations/XXXX.sql   # ローカル
npm run db:migrate:remote -- migrations/XXXX.sql  # 本番
npm run db:migrate:all                             # 全マイグレーション実行
```

### マークアップの仕組み

マークアップは3段階のカスケードで解決されます:

1. **パートナー + 製品 + ティア** の個別マークアップ（最優先）
2. **パートナー + 製品** のマークアップ
3. **パートナーのデフォルトマークアップ**（全製品に適用）

マークアップタイプ:
- `percentage`: パーセンテージ（例: 20% → 1.2倍）
- `fixed`: 固定額（例: ¥1000 → 基本価格 + ¥1000）

### 既知の制限事項

- **複数デバイス非対応**: 1ユーザーにつき1つのリフレッシュトークンのみ有効
- **ユーザー管理機能**: 現在は手動でのユーザー追加のみ（UI未実装）
- **監査ログ**: 変更履歴の記録機能は未実装

---

**Deploy to Cloudflare Workers で、今すぐ始めましょう！**
