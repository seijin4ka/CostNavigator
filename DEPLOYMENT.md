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
| Project name | `costnavigator` または任意の名前 |
| Production branch | `main` |
| Framework preset | None（デフォルト） |
| Build command | `npm run build` |
| Build output directory | `dist/cost_navigator` |

**Deploy site** をクリック

#### ステップ5: 初回デプロイ完了を待つ

- ビルドとデプロイが自動的に実行されます
- 数分で完了します
- D1データベースも自動的に作成されます

#### ステップ6: データベースマイグレーション実行

初回デプロイ後、データベーステーブルを作成する必要があります。

**ローカル環境から実行:**

```bash
# Cloudflareにログイン
npx wrangler login

# マイグレーションを順番に実行（0001から0012まで）
npm run db:migrate:remote -- migrations/0001_create_users.sql
npm run db:migrate:remote -- migrations/0002_create_partners.sql
# ... 以降すべてのマイグレーションファイルを0012まで順番に実行
```

または、一括実行:

```bash
npm run db:migrate:all
```

#### ステップ7: 初期管理者アカウント作成

ブラウザで以下のURLにアクセス:

```
https://your-worker-name.workers.dev/api/auth/setup
```

初期管理者アカウントが作成されます:
- Email: `admin@costnavigator.dev`
- Password: `admin1234`

**⚠️ 必ずログイン後にパスワードを変更してください**

**重要**: JWT_SECRETは初回アクセス時に自動生成され、データベースに安全に保存されます。環境変数での設定は不要です。

#### ステップ8: アプリケーションにアクセス

```
https://your-worker-name.workers.dev/admin/login
```

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
