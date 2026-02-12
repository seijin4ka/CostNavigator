import type { User } from "../../shared/types";

// ユーザーリポジトリ（D1直接操作）
export class UserRepository {
  constructor(private db: D1Database) {}

  // メールアドレスでユーザーを検索（パスワードハッシュ付き）
  async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const result = await this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first<User & { password_hash: string }>();
    return result;
  }

  // IDでユーザーを検索
  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare("SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?")
      .bind(id)
      .first<User>();
    return result;
  }

  // ユーザーを作成
  async create(email: string, passwordHash: string, name: string, role: string): Promise<void> {
    await this.db
      .prepare("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)")
      .bind(email, passwordHash, name, role)
      .run();
  }

  // ユーザー数を取得
  async count(): Promise<number> {
    const result = await this.db
      .prepare("SELECT COUNT(*) as count FROM users")
      .first<{ count: number }>();
    return result?.count ?? 0;
  }
}
