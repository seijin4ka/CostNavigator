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
npm run build            # プロダクションビルド
npm run deploy           # Cloudflare Workers にデプロイ
npm run db:migrate:local -- migrations/XXXX.sql  # ローカルDB マイグレーション
npm run db:migrate:remote -- migrations/XXXX.sql # 本番DB マイグレーション
```

## 初期セットアップ

1. `npm install`
2. migrations/ 配下の SQL を番号順に `db:migrate:local` で適用
3. `npm run dev` で起動
4. `curl -X POST http://localhost:5173/api/auth/setup` で管理者作成
5. admin@costnavigator.dev / admin1234 でログイン

## アーキテクチャ

### ディレクトリ構成

- `shared/` - フロント・バックエンドで共有する型定義（Zod スキーマ）と定数。業務ロジックは置かない。
- `worker/` - Hono API バックエンド。Repository パターンで D1 を直接操作（ORM不使用）。
- `src/` - React SPA フロントエンド。
- `migrations/` - D1 SQL マイグレーション。番号順に適用。

### TypeScript プロジェクト構成

- `tsconfig.app.json` - フロントエンド（src/ + shared/）。DOM型あり、`@shared/*` パスエイリアス。
- `tsconfig.worker.json` - バックエンド（worker/ + shared/）。`@cloudflare/workers-types` 使用、DOM型なし。
- インポートは `@shared/types` や `../../shared/types` の両方が使われている（worker は相対パス、src は `@shared` エイリアス）。

### API ルーティング

- `/api/*` は Worker（Hono）が処理、それ以外は SPA にフォールバック（wrangler.jsonc の `not_found_handling: single-page-application`）
- `/api/admin/*` - 管理API。各ルートファイル内で `authMiddleware` を `app.use("*", authMiddleware)` で適用
- `/api/public/*` - 公開API（認証不要）。マークアップ額や基本価格を返却せず最終価格のみ公開
- `/api/auth/*` - 認証（ログイン / セットアップ）
- `/api/health` - ヘルスチェック

### バックエンド層構造

- Routes（`worker/routes/`）→ Services（`worker/services/`）→ Repositories（`worker/repositories/`）→ D1
- Service はルートハンドラ内で `new EstimateService(c.env.DB)` のようにリクエスト毎にインスタンス化
- リクエストバリデーションは `validateBody(c, ZodSchema)` ユーティリティ経由（`worker/utils/validation.ts`）
- レスポンスは `success(c, data)` / `error(c, code, message, status)` ヘルパー経由（`worker/utils/response.ts`）

### フロントエンド構造

- SPA ルーティング: `/` と `/result` がダイレクト見積もり、`/estimate/:partnerSlug` がパートナー経由見積もり、`/admin/*` が管理画面
- 管理画面は `ProtectedRoute` + `AdminLayout` でラップ。認証状態は `AuthContext` で管理
- API通信はシングルトン `apiClient`（`src/api/client.ts`）経由。JWT トークンを自動付与
- 見積もりビルダーロジックは `useEstimateBuilder` フック（`src/hooks/useEstimateBuilder.ts`）に集約

### マークアップ解決（重要なビジネスロジック）

3段階カスケードで適用するマークアップルールを解決する（`MarkupRepository.resolveMarkup`）:
1. パートナー + 製品 + ティア（最も具体的）
2. パートナー + 製品（ティア指定なし）
3. パートナーのデフォルト設定（フォールバック）

マークアップ種別は `percentage`（パーセント加算）と固定額加算の2種類。

## コーディング規約

- コメントは日本語で記載する
- 絵文字は使用しない（法人向けサービスのため）
- Zod スキーマは shared/types/ に定義し、フロント・バックエンドで共用
- API レスポンスは `{ success: true, data: T }` または `{ success: false, error: { code, message } }` の統一フォーマット
- フロントエンドの UI コンポーネントは `src/components/ui/` に配置（Button, Input, Select, Card, Modal, Table）
- DB操作は必ず Repository 層を経由する
- ID は Text UUID（`crypto.randomUUID()`）を使用

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
| JWT_SECRET | JWT 署名キー（オプション、自動生成される） | wrangler secret put JWT_SECRET |
| ALLOWED_ORIGINS | CORS許可オリジン（カンマ区切り、本番推奨） | wrangler secret put ALLOWED_ORIGINS |
| DB | D1 データベースバインディング（初回デプロイ時は手動設定が必要） | Cloudflareダッシュボードで設定 |
| ASSETS | 静的アセットバインディング | 自動設定 |

## パフォーマンス最適化

### N+1クエリの解決
- 見積もり作成: 一括取得により93%以上のクエリ削減
- `ProductRepository.findByIds()` と `TierRepository.findByIds()` を使用
- 結果を Map に変換して高速検索

## セキュリティ機能

### トークンリフレッシュ
- アクセストークン: 15分（短命、定期的にリフレッシュ）
- リフレッシュトークン: 7日間（長命、ローテーション方式）
- リフレッシュトークンは SHA-256 でハッシュ化してDB保存
- **プロアクティブリフレッシュ**: 有効期限の2分前に自動リフレッシュ
- **リアクティブリフレッシュ**: 401 エラー時にも自動リフレッシュを試行
- ユーザーごとに1つのリフレッシュトークンのみ有効

### セキュリティヘッダー
- Content Security Policy (CSP): XSS防止
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY（クリックジャッキング防止）
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: 不要な機能を無効化

### CORS 設定
- 公開API (`/api/public/*`): すべてのオリジンを許可
- 管理API (`/api/admin/*`): ALLOWED_ORIGINS で指定されたオリジンのみ
- 認証API (`/api/auth/*`): ALLOWED_ORIGINS で指定されたオリジンのみ
- 開発環境: localhost からのアクセスを自動許可

### localStorage のリスク
- トークンは localStorage に保存（XSS攻撃のリスクあり）
- 対策: CSP設定、短命なアクセストークン、トークンローテーション、プロアクティブリフレッシュ

## ページネーション
- 見積もり一覧 (`/api/admin/estimates`) はページネーション対応
- デフォルト: 20件/ページ（`PAGINATION.DEFAULT_PER_PAGE`）
- 最大: 100件/ページ（`PAGINATION.MAX_PER_PAGE`）
- クエリパラメータ: `?page=1&limit=20`

## 既知の制限事項

詳細は README.md の「既知の制限事項」セクションを参照。

### 主要な制限
- **複数デバイス非対応**: ユーザーごとに1つのリフレッシュトークンのみ有効
- **削除制約**: 見積もりで使用中の製品・パートナー・カテゴリは削除不可
- **マークアップ解決のクエリ**: カスケード方式で2〜3回のクエリを実行

## トラブルシューティング

問題が発生した場合は、README.md の「トラブルシューティング」セクションを参照。

### よくある問題
- **初回アクセス時のエラー** → D1 Bindingが正しく設定されているか確認
- **ログイン失敗** → localStorage をクリア、ブラウザキャッシュをクリア
- **CORS エラー** → ALLOWED_ORIGINS の設定を確認

## テスト確認手順

1. `/api/health` でヘルスチェック確認
2. `/admin/login` で管理画面にアクセス（初回アクセス時に自動セットアップ実行）
3. 初期管理者アカウントでログイン（`admin@costnavigator.dev` / `admin1234`）
4. 製品・パートナー・マークアップの CRUD 操作
5. `/admin/settings` でシステム設定を編集（ブランディング、デフォルトパートナー）
6. `/` でトップページ表示（デフォルトパートナーの見積もりページまたは管理画面へリダイレクト）
7. `/estimate/demo` でパートナー経由の見積もりページ表示
8. 見積もり作成 → 結果表示 → PDF ダウンロード
9. トークンリフレッシュの自動動作確認（15分後）
