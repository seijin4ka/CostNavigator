# GitHub Actions 自動デプロイ設定ガイド

このガイドでは、GitHub Actionsを使用してCostNavigatorを自動的にデプロイする方法を説明します。

## 前提条件

- このリポジトリをforkまたはcloneしていること
- Cloudflareアカウントを持っていること

## セットアップ手順

### ステップ1: Cloudflare API トークンを取得

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログイン
2. 右上のアカウントアイコン > **My Profile** をクリック
3. 左メニューから **API Tokens** を選択
4. **Create Token** をクリック
5. **Edit Cloudflare Workers** テンプレートの **Use template** をクリック
6. 以下のように設定:
   - Token name: `GitHub Actions - CostNavigator`
   - Permissions:
     - Account > Workers Scripts > Edit
     - Account > Workers KV Storage > Edit
     - Account > D1 > Edit
   - Account Resources: 自分のアカウントを選択
   - **Continue to summary** をクリック
7. **Create Token** をクリック
8. 表示されたトークンをコピー（後で使用します）

### ステップ2: Cloudflare Account ID を取得

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)のホーム画面
2. 右側の **Account ID** をコピー

### ステップ3: GitHub Secrets を設定

1. GitHubリポジトリのページを開く
2. **Settings** タブをクリック
3. 左メニューから **Secrets and variables** > **Actions** を選択
4. **New repository secret** をクリック
5. 以下の2つのシークレットを追加:

#### シークレット 1: CLOUDFLARE_API_TOKEN
- Name: `CLOUDFLARE_API_TOKEN`
- Secret: ステップ1でコピーしたAPIトークンを貼り付け
- **Add secret** をクリック

#### シークレット 2: CLOUDFLARE_ACCOUNT_ID
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Secret: ステップ2でコピーしたAccount IDを貼り付け
- **Add secret** をクリック

### ステップ4: 自動デプロイをテスト

1. リポジトリのメインブランチに変更をpush:
   ```bash
   git add .
   git commit -m "test: GitHub Actions setup"
   git push origin main
   ```

2. GitHubリポジトリの **Actions** タブを開く
3. "Deploy to Cloudflare Workers" ワークフローが実行されていることを確認
4. 数分後、デプロイが完了します

### ステップ5: デプロイ後の設定

GitHub Actionsによるデプロイが成功したら、以下の手順を実行してください:

#### JWT_SECRET の設定

```bash
# ローカル環境から実行
npx wrangler login
npx wrangler secret put JWT_SECRET

# 以下のコマンドで生成した値を入力
openssl rand -base64 64
```

#### データベースマイグレーション

```bash
# すべてのマイグレーションを実行
npm run db:migrate:all
```

#### 初期管理者アカウント作成

ブラウザで以下にアクセス:
```
https://your-worker-name.workers.dev/api/auth/setup
```

## トラブルシューティング

### ワークフローが失敗する

**エラー**: `Error: Authentication error`

**原因**: API トークンまたは Account ID が正しくない

**解決方法**:
1. GitHub Secrets の値を再確認
2. API トークンの権限を確認（Workers Scripts: Edit が必要）
3. トークンが有効期限切れでないか確認

### デプロイは成功するが、アプリケーションが動作しない

**原因**: JWT_SECRET が設定されていない、またはマイグレーションが未実行

**解決方法**:
1. 上記「ステップ5: デプロイ後の設定」を実行
2. Cloudflare Workers のログを確認:
   ```bash
   npx wrangler tail
   ```

## 自動デプロイの無効化

GitHub Actionsを使用したくない場合:

1. `.github/workflows/deploy.yml` ファイルを削除
2. 手動デプロイに切り替え:
   ```bash
   npm run deploy
   ```

## さらなる自動化

### プルリクエストでのプレビュー環境

プルリクエストごとにプレビュー環境を作成したい場合は、
[Cloudflare Workers Previews](https://developers.cloudflare.com/workers/platform/preview-deployments/)
を参照してください。
