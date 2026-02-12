# CostNavigator - Claude Code プロジェクト設定

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

## ディレクトリ構成ルール

- `shared/` - フロント・バックエンドで共有する型定義と定数。ここに業務ロジックは置かない。
- `worker/` - Hono API バックエンド。Repository パターンで D1 を直接操作（ORM不使用）。
- `src/` - React SPA フロントエンド。
- `migrations/` - D1 SQL マイグレーション。番号順に適用。

## アーキテクチャルール

- `/api/*` は Worker が処理、それ以外は SPA にルーティング（wrangler.jsonc の not_found_handling: single-page-application）
- DB操作は必ず Repository 層を経由する（`worker/repositories/`）
- ビジネスロジックは Service 層に集約（`worker/services/`）
- 公開 API ではマークアップ額や基本価格を返却しない（最終価格のみ公開）
- マークアップ解決は3段階カスケード: パートナー+製品+ティア → パートナー+製品 → パートナーデフォルト
- ID は Text UUID（crypto.randomUUID()）を使用

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

## コーディング規約

- コメントは日本語で記載する
- 絵文字は使用しない（法人向けサービスのため）
- Zod スキーマは shared/types/ に定義し、フロント・バックエンドで共用
- API レスポンスは `{ success: true, data: T }` または `{ success: false, error: { code, message } }` の統一フォーマット
- フロントエンドの UI コンポーネントは `src/components/ui/` に配置（Button, Input, Select, Card, Modal, Table）

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
| JWT_SECRET | JWT 署名キー（必須） | wrangler secret put JWT_SECRET |
| ALLOWED_ORIGINS | CORS許可オリジン（カンマ区切り、本番推奨） | wrangler secret put ALLOWED_ORIGINS |
| DB | D1 データベースバインディング | wrangler.jsonc で設定 |
| ASSETS | 静的アセットバインディング | 自動設定 |

## セキュリティ機能

### トークンリフレッシュ
- アクセストークン: 15分（短命、定期的にリフレッシュ）
- リフレッシュトークン: 7日間（長命、ローテーション方式）
- リフレッシュトークンは SHA-256 でハッシュ化してDB保存
- 401 エラー時に自動リフレッシュを試行（フロントエンド）
- ユーザーごとに1つのリフレッシュトークンのみ有効

### CORS 設定
- 公開API (`/api/public/*`): すべてのオリジンを許可
- 管理API (`/api/admin/*`): ALLOWED_ORIGINS で指定されたオリジンのみ
- 認証API (`/api/auth/*`): ALLOWED_ORIGINS で指定されたオリジンのみ
- 開発環境: localhost からのアクセスを自動許可

### localStorage のリスク
- トークンは localStorage に保存（XSS攻撃のリスクあり）
- 対策: CSP設定、短命なアクセストークン、トークンローテーション

## ページネーション
- 見積もり一覧 (`/api/admin/estimates`) はページネーション対応
- デフォルト: 20件/ページ（`PAGINATION.DEFAULT_PER_PAGE`）
- 最大: 100件/ページ（`PAGINATION.MAX_PER_PAGE`）
- クエリパラメータ: `?page=1&limit=20`

## 既知の制限事項

詳細は README.md の「既知の制限事項」セクションを参照。

### 主要な制限
- **N+1クエリ**: 見積もり作成時、各アイテムに対して個別クエリを実行
- **複数デバイス非対応**: ユーザーごとに1つのリフレッシュトークンのみ有効
- **削除制約**: 見積もりで使用中の製品・パートナー・カテゴリは削除不可

## トラブルシューティング

問題が発生した場合は、README.md の「トラブルシューティング」セクションを参照。

### よくある問題
- マイグレーションエラー → `.wrangler/state/` を削除して再試行
- ログイン失敗 → localStorage をクリア、JWT_SECRET を確認
- CORS エラー → ALLOWED_ORIGINS の設定を確認

## テスト確認手順

1. `/api/health` でヘルスチェック確認
2. `/admin/login` で管理画面ログイン
3. 製品・パートナー・マークアップの CRUD 操作
4. `/` でダイレクト見積もりページ表示（マークアップなし）
5. `/estimate/demo` でパートナー経由の見積もりページ表示
6. 見積もり作成 → 結果表示 → PDF ダウンロード
7. トークンリフレッシュの自動動作確認（15分後）
