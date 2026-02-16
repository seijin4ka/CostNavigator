# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Cloudflare MSSP パートナー向け予算見積もりサービス。
単一 Cloudflare Worker 上で Hono API + React SPA を提供する構成。

## 技術スタック

- フロントエンド: React 19 + React Router v7 + TailwindCSS v4（Vite）
- バックエンド: Cloudflare Workers + Hono（TypeScript）
- データベース: Cloudflare D1（SQLite）
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
- `/api/public/*` - 公開API（認証不要）。マークアップ額や基本価格を返却せず最終価格のみ公開
- `/api/auth/*` - 認証（ログイン / セットアップ / リフレッシュ）
- `/api/health` - ヘルスチェック
- Worker のルーティングは各ルートモジュールを直接インポートして `app.route()` に渡す（文字列ベースルーティングは本番ビルドで変換されないため使用禁止）

### バックエンド層構造

- Routes（`worker/routes/`）→ Services（`worker/services/`）→ Repositories（`worker/repositories/`）→ D1
- Service はルートハンドラ内で `new EstimateService(c.env.DB)` のようにリクエスト毎にインスタンス化
- バインディング型定義は `worker/env.ts` の `Env` インターフェース
- リクエストバリデーションは `validateBody(c, ZodSchema)` ユーティリティ経由（`worker/utils/validation.ts`）
- レスポンスは `success(c, data)` / `error(c, code, message, status)` ヘルパー経由（`worker/utils/response.ts`）
- エラーハンドリングは `AppError` クラス（`worker/errors/app-error.ts`）+ グローバル `errorHandler`

### フロントエンド構造

- SPA ルーティング: `/` と `/result` がダイレクト見積もり、`/estimate/:partnerSlug` がパートナー経由見積もり、`/admin/*` が管理画面
- 管理画面は `ProtectedRoute` + `AdminLayout` でラップ。認証状態は `AuthContext` で管理
- API通信はシングルトン `apiClient`（`src/api/client.ts`）経由。JWT トークンを自動付与
- 見積もりビルダーロジックは `useEstimateBuilder` フック（`src/hooks/useEstimateBuilder.ts`）に集約

### マークアップ解決（重要なビジネスロジック）

3段階カスケードで適用するマークアップルールを解決する（`worker/repositories/markup-repository.ts` の `resolveMarkup`）:
1. パートナー + 製品 + ティア（最も具体的）
2. パートナー + 製品（ティア指定なし）
3. パートナーのデフォルト設定（フォールバック）

マークアップ種別は `percentage`（パーセント加算）と `fixed`（固定額加算）の2種類。

### 認証フロー

- アクセストークン: 15分（短命）、リフレッシュトークン: 7日間（ローテーション方式）
- リフレッシュトークンは SHA-256 でハッシュ化してDB保存
- フロントエンドの `apiClient` がプロアクティブリフレッシュ（期限2分前）+ リアクティブリフレッシュ（401時）を自動実行

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
4. 製品・パートナー・マークアップの CRUD 操作
5. `/admin/settings` でシステム設定を編集（ブランディング、デフォルトパートナー）
6. `/` でトップページ表示（デフォルトパートナーの見積もりページまたは管理画面へリダイレクト）
7. `/estimate/demo` でパートナー経由の見積もりページ表示
8. 見積もり作成 → 結果表示 → PDF ダウンロード
