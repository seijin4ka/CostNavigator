# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Cloudflare ソリューションの予算見積もりサービス。
単一 Cloudflare Worker 上で Hono API + React SPA を提供する構成。

## 技術スタック

- フロントエンド: React 19 + React Router v7 + TailwindCSS v4（Vite）
- バックエンド: Cloudflare Workers + Hono（TypeScript）
- データベース: Cloudflare D1（SQLite）
- キャッシュ: Cloudflare Workers KV（オプション、製品データキャッシュ）
- PDF: @react-pdf/renderer（クライアントサイド、遅延読み込み）
- バリデーション: Zod（shared/ で型定義を共有）
- デプロイ: @cloudflare/vite-plugin（単一Worker + 静的アセット）

## 開発コマンド

```bash
npm run dev              # 開発サーバー起動（Vite + Wrangler）
npm run build            # プロダクションビルド（+ prepare-deploy.js）
npm run build:local      # ローカルビルド（prepare-deploy.js をスキップ）
npm run deploy           # ビルド + Cloudflare Workers にデプロイ
npm run db:migrate:local -- migrations/XXXX.sql  # ローカルDB マイグレーション（単一ファイル）
npm run db:migrate:remote -- migrations/XXXX.sql # 本番DB マイグレーション（単一ファイル）
npm run db:migrate:all   # 全マイグレーションを本番に一括適用
npm run db:reset:local   # ローカルDB をリセット（.wrangler/state/v3/d1 を削除）
npm run db:backup        # 本番DB のバックアップ（SQL出力）
```

## 初期セットアップ

1. `npm install`
2. `npm run dev` で起動
3. `http://localhost:5173/admin/login` にアクセス（初回は自動セットアップが実行される）
4. `admin@costnavigator.dev` / `admin1234` でログイン

自動セットアップ（`worker/middleware/auto-setup.ts`）が初回リクエスト時にマイグレーション実行 + 管理者作成を行うため、手動でのDB操作は不要。

## アーキテクチャ

### ディレクトリ構成

- `shared/` - フロント・バックエンドで共有する型定義（Zod スキーマ）と定数。業務ロジックは置かない。
- `worker/` - Hono API バックエンド。Repository パターンで D1 を直接操作（ORM不使用）。
- `src/` - React SPA フロントエンド。
- `migrations/` - D1 SQL マイグレーション。番号順に適用。`auto-migrate.ts` が初回リクエスト時に自動実行。

### 設定ファイル

- `wrangler.jsonc` - Cloudflare Workers 設定（JSONC形式）。D1バインディング、静的アセット、SPA フォールバック設定。
- `vite.config.ts` - Vite 設定。`@cloudflare/vite-plugin` で Worker と SPA を統合ビルド。`@shared` エイリアスの定義。
- `tsconfig.json` - プロジェクト参照のみ。`tsconfig.app.json`（フロントエンド）と `tsconfig.worker.json`（バックエンド）に分離。

### TypeScript プロジェクト構成

- `tsconfig.app.json` - フロントエンド（src/ + shared/）。DOM型あり。
- `tsconfig.worker.json` - バックエンド（worker/ + shared/）。`@cloudflare/workers-types` 使用、DOM型なし。
- shared のインポート規約: **src/ は `@shared/types` エイリアス**、**worker/ は `../../shared/types` 相対パス**。

### API ルーティング

- `/api/*` は Worker（Hono）が処理、それ以外は SPA にフォールバック（`wrangler.jsonc` の `not_found_handling: single-page-application`）
- `/api/admin/*` - 管理API。各ルートファイル内で `authMiddleware` を `app.use("*", authMiddleware)` で適用
- `/api/public/*` - 公開API（認証不要）。基本価格（base_price）を返却せず販売価格（selling_price）のみ公開
- `/api/auth/*` - 認証（ログイン / セットアップ / リフレッシュ）
- `/api/health` - ヘルスチェック
- Worker のルーティングは各ルートモジュールを直接インポートして `app.route()` に渡す（文字列ベースルーティングは本番ビルドで変換されないため使用禁止）

### API ルート一覧（worker/index.ts で登録）

```
/api/auth          → worker/routes/auth.ts
/api/admin/categories    → worker/routes/categories.ts
/api/admin/products      → worker/routes/products.ts
/api/admin/product-tiers → worker/routes/tiers.ts
/api/admin/estimates     → worker/routes/estimates.ts
/api/admin/dashboard     → worker/routes/dashboard.ts
/api/admin/system-settings → worker/routes/system-settings.ts
/api/public              → worker/routes/public.ts
```

### SPA ルート（src/App.tsx で定義）

- `/` - トップページ（HomePage）: デフォルト見積もりページまたは管理画面へリダイレクト
- `/result` - 見積もり結果表示（EstimateResultPage）
- `/setup` - 初期セットアップ（SetupPage）
- `/admin/login` - 管理画面ログイン
- `/admin` - ダッシュボード（DashboardPage）
- `/admin/products` - 製品管理
- `/admin/categories` - カテゴリ管理
- `/admin/estimates` - 見積もり一覧
- `/admin/settings` - システム設定

### バックエンド層構造

- Routes（`worker/routes/`）→ Services（`worker/services/`）→ Repositories（`worker/repositories/`）→ D1
- Service はルートハンドラ内で `new EstimateService(c.env.DB)` のようにリクエスト毎にインスタンス化
- バインディング型定義は `worker/env.ts` の `Env` インターフェース
- リクエストバリデーションは `validateBody(c, ZodSchema)` ユーティリティ経由（`worker/utils/validation.ts`）
- レスポンスは `success(c, data)` / `error(c, code, message, status)` ヘルパー経由（`worker/utils/response.ts`）
- エラーハンドリングは `AppError` クラス（`worker/errors/app-error.ts`）+ グローバル `errorHandler`（`worker/index.ts`）

### フロントエンド構造

- 管理画面は `ProtectedRoute` + `AdminLayout` でラップ。認証状態は `AuthContext` で管理
- API通信はシングルトン `apiClient`（`src/api/client.ts`）経由。JWT トークンを自動付与
- 見積もりビルダーロジックは `useEstimateBuilder` フック（`src/hooks/useEstimateBuilder.ts`）に集約

### 価格モデル（重要なビジネスロジック）

製品の価格は `product_tiers` テーブルで管理。各ティアは基本価格（仕入れ値）と販売価格を持つ:

- `base_price` - 基本価格（Cloudflare 定価、管理画面でのみ表示）
- `selling_price` - 販売価格（NULLの場合は base_price にフォールバック）
- `usage_unit_price` / `selling_usage_unit_price` - 従量課金の単価（同様のフォールバック）

`EstimateService.getProducts()` で販売価格を解決:
```typescript
final_price = tier.selling_price ?? tier.base_price
```

公開APIでは `final_price`（販売価格）のみ返却し、`base_price` は返却しない。

### KV キャッシュ（worker/utils/kv-cache.ts）

- Cache-Aside パターンで製品データをキャッシュ（`getOrSet` メソッド）
- KV未設定時（ローカル開発等）は NullCache で動作（キャッシュなし）
- タグベースの一括無効化をサポート

### 認証フロー

- アクセストークン: 15分（短命）、リフレッシュトークン: 7日間（ローテーション方式）
- リフレッシュトークンは SHA-256 でハッシュ化してDB保存
- JWT_SECRET は環境変数または D1 system_settings に自動生成して保存
- フロントエンドの `apiClient` がリアクティブリフレッシュ（401時に自動リトライ）を実行

### マイグレーション管理

- `worker/utils/auto-migrate.ts` に全マイグレーションを TypeScript 配列で管理
- `schema_migrations` テーブルでバージョン追跡、未実行分のみ自動実行
- 初回リクエスト時に `autoSetupMiddleware` から呼び出される
- 新しいマイグレーション追加時: 配列に新しいエントリを追加（version は連番、既存と重複不可）

## コーディング規約

- コメントは日本語で記載する
- 絵文字は使用しない（法人向けサービスのため）
- Zod スキーマは `shared/types/` に定義し、フロント・バックエンドで共用
- API レスポンスは `{ success: true, data: T }` または `{ success: false, error: { code, message } }` の統一フォーマット
- フロントエンドの UI コンポーネントは `src/components/ui/` に配置（Button, Input, Select, Card, Modal, Table）
- DB操作は必ず Repository 層を経由する
- ID は Text UUID（`crypto.randomUUID()`）を使用
- N+1クエリを避ける: `findByIds()` で一括取得し Map に変換して検索

## デザインシステム（公開ページ）

- フォント: Plus Jakarta Sans（見出し・数字） + Noto Sans JP（本文）
- フォントユーティリティ: `font-display`（見出し用）/ `font-body`（本文用）は `src/index.css` の `@theme` で定義
- パートナーカラーは CSS 変数 `--cn-accent` で管理し、ホバーエフェクト等で参照
- 価格表示には `.cn-price` クラス（等幅数字 + Plus Jakarta Sans）を使用
- アニメーション: `animate-cn-fade-up` / `animate-cn-fade-in` / `animate-cn-slide-up`
- カスタムCSS: `.cn-tier-card`（ホバーエフェクト）/ `.cn-product-card`（シャドウ）/ `.cn-scrollbar`
- 管理画面（admin/）は既存の共通UIコンポーネント（Button, Card 等）を使用

## Git ルール

- 機能追加・修正毎に頻繁にコミットする
- コミットメッセージには変更内容と追加した機能を詳細に記載する
- コミットメッセージに Claude の署名（Co-Authored-By）を入れない

## 環境変数

| 変数名 | 説明 | 設定方法 |
|--------|------|----------|
| JWT_SECRET | JWT 署名キー（オプション、未設定時は自動生成されDB保存） | wrangler secret put JWT_SECRET |
| ALLOWED_ORIGINS | CORS許可オリジン（カンマ区切り、本番推奨） | wrangler secret put ALLOWED_ORIGINS |
| DB | D1 データベースバインディング | wrangler.jsonc で設定 |
| ASSETS | 静的アセットバインディング | 自動設定 |

## テスト確認手順

1. `/api/health` でヘルスチェック確認
2. `/admin/login` で管理画面にアクセス（初回アクセス時に自動セットアップ実行）
3. 初期管理者アカウントでログイン（`admin@costnavigator.dev` / `admin1234`）
4. 製品・カテゴリの CRUD 操作、ティアの販売価格設定
5. `/admin/settings` でシステム設定を編集（ブランディング）
6. `/` でトップページ表示（見積もりページまたは管理画面へリダイレクト）
7. 見積もり作成 → 結果表示 → PDF ダウンロード
