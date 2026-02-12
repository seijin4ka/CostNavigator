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

## Git ルール

- 機能追加・修正毎に頻繁にコミットする
- コミットメッセージには変更内容と追加した機能を詳細に記載する
- コミットメッセージに Claude の署名（Co-Authored-By）を入れない

## 環境変数

| 変数名 | 説明 | 設定方法 |
|--------|------|----------|
| JWT_SECRET | JWT 署名キー | wrangler secret put JWT_SECRET |
| DB | D1 データベースバインディング | wrangler.jsonc で設定 |
| ASSETS | 静的アセットバインディング | 自動設定 |

## テスト確認手順

1. `/api/health` でヘルスチェック確認
2. `/admin/login` で管理画面ログイン
3. 製品・パートナー・マークアップの CRUD 操作
4. `/estimate/demo` でエンドユーザー向け見積もりページ表示
5. 見積もり作成 → 結果表示 → PDF ダウンロード
