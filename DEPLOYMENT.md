# CostNavigator デプロイメントガイド

このガイドでは、CostNavigatorをCloudflare Workersに簡単にデプロイする方法を説明します。

## 前提条件

- Cloudflareアカウント（無料プランでOK）
- GitHubアカウント
- このリポジトリをforkまたはclone

## デプロイ方法

### 方法1: Cloudflare Workers CI/CD（推奨・最も簡単）

この方法では、GitHubリポジトリを指定するだけで自動的にデプロイされます。

#### ステップ1: GitHubリポジトリの準備

1. このリポジトリを**GitHub上でfork**してください
   - または、自分のGitHubアカウントにpushしてください

#### ステップ2: Cloudflareダッシュボードで設定

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログイン
2. 左メニューから **Workers & Pages** を選択
3. **Create** ボタンをクリック
4. **Workers** タブを選択
5. **Connect to Git** をクリック

#### ステップ3: GitHubを接続

1. **Connect GitHub** をクリック
2. GitHubで認証（初回のみ）
3. デプロイしたいリポジトリを選択
4. **Begin setup** をクリック

#### ステップ4: ビルド設定

以下のように設定してください：

| 項目 | 値 |
|------|-----|
| Project name | `cost-navigator-app` （レポジトリ名と異なる名前を推奨） |
| Production branch | `main` |
| Framework preset | None（デフォルト） |
| Build command | `npm run build` |
| Build output directory | `dist/cost_navigator` |

**重要**: プロジェクト名は、forkしたレポジトリ名（`CostNavigator`）と異なる名前にしてください。同じ名前を使用すると、Cloudflare CI/CDでコンフリクトが発生します。

**Deploy site** をクリック

#### ステップ5: 初回デプロイ完了を待つ

- ビルドとデプロイが自動的に実行されます
- 数分で完了します
- D1データベースも自動的に作成されます
- D1 Bindingも自動的に設定されます（2回目以降のデプロイから）

**注意**: 初回デプロイでは、D1 Bindingの設定が間に合わずエラーになる場合があります。その場合は、Cloudflareダッシュボードで手動設定するか、再デプロイしてください。

#### ステップ6: 管理画面にアクセス（自動セットアップ）

デプロイ完了後、ブラウザで管理画面にアクセス:

```
https://your-worker-name.workers.dev/admin/login
```

**初回アクセス時に自動的に**以下が実行されます:

1. **データベースマイグレーション** - すべてのテーブルを自動作成
2. **JWT_SECRET自動生成** - 暗号学的に安全なランダム値を生成・保存
3. **初期管理者アカウント作成**
   - Email: `admin@costnavigator.dev`
   - Password: `admin1234`

ログイン画面が表示されたら、セットアップ完了です。

**重要**:
- **何も操作する必要はありません** - 自動的にセットアップされます
- **Node.jsのインストールは不要**です
- **手動でのマイグレーション実行は不要**です
- **JWT_SECRET環境変数の設定は不要**です（自動生成されます）

**⚠️ ログイン後、必ずパスワードを変更してください**

管理者アカウントでログインして、設定を開始してください。

---

## 方法2: ローカル環境からデプロイ

開発者向けの方法です。

### 前提条件

- Node.js 18以上
- npm

### 手順

```bash
# 1. リポジトリをclone
git clone https://github.com/your-username/CostNavigator.git
cd CostNavigator

# 2. 依存関係をインストール
npm install

# 3. Cloudflareにログイン
npx wrangler login

# 4. ビルドとデプロイ
npm run deploy

# 5. データベースマイグレーション
npm run db:migrate:all

# 6. 初期管理者作成
curl -X POST https://your-worker-name.workers.dev/api/auth/setup
```

---

## カスタムドメインの設定（オプション）

独自ドメインを使用したい場合:

1. Cloudflareダッシュボード > Workers & Pages > あなたのWorker
2. **Custom Domains** タブを開く
3. **Add Custom Domain** をクリック
4. ドメイン名を入力（例: `costnavigator.example.com`）
5. DNSレコードが自動的に設定されます

---

## トラブルシューティング

### デプロイが失敗する

**症状**: `binding DB of type d1 must have a valid id specified`

**原因**: D1データベースが作成されていない、またはバインディングが設定されていない

**解決方法**:
1. Cloudflareダッシュボード > Workers & Pages > D1 Database
2. `cost-navigator-db` という名前のデータベースがあるか確認
3. ない場合は手動で作成:
   ```bash
   npx wrangler d1 create cost-navigator-db
   ```
4. Database IDをコピー
5. Worker Settings > Variables > D1 database bindings で `DB` バインディングを追加

### ログインできない

**症状**: 管理画面にログインできない

**原因**: JWT_SECRETが設定されていない、またはデータベースが初期化されていない

**解決方法**:
1. マイグレーション0013（JWT_SECRET追加）が実行されているか確認
2. すべてのマイグレーションが実行されているか確認
3. `/api/auth/setup` にアクセスして初期管理者を作成
4. カスタムJWT_SECRETを使用している場合、環境変数が正しく設定されているか確認

### データベースが空

**症状**: 製品やパートナーが表示されない

**原因**: マイグレーションが実行されていない

**解決方法**:
```bash
npm run db:migrate:all
```

---

## 更新方法

GitHubリポジトリに変更をpushすると、自動的に再デプロイされます:

```bash
git add .
git commit -m "機能追加"
git push origin main
```

数分後、変更が本番環境に反映されます。

---

## サポート

問題が発生した場合は、[GitHub Issues](https://github.com/your-username/CostNavigator/issues)で報告してください。
