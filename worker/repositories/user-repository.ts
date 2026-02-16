import type { User } from "../../shared/types";
import { executeD1First, executeD1Query } from "../utils/d1-helper";

// ユーザーリポジトリ（D1直接操作）
export class UserRepository {
  constructor(private db: D1Database) {}

  // メールアドレスでユーザーを検索（パスワードハッシュ付き）
  async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const result = await executeD1First<User & { password_hash: string }>(
      this.db,
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    return result;
  }

  // IDでユーザーを検索
  async findById(id: string): Promise<User | null> {
    const result = await executeD1First<User>(
      this.db,
      "SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?",
      [id]
    );
    return result;
  }

  // ユーザーを作成
  async create(email: string, passwordHash: string, name: string, role: string): Promise<void> {
    await executeD1Query(
      this.db,
      "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
      [email, passwordHash, name, role],
      "作成",
      "ユーザー"
    );
  }

  // ユーザー数を取得
  async count(): Promise<number> {
    const result = await executeD1First<{ count: number }>(
      this.db,
      "SELECT COUNT(*) as count FROM users"
    );
    return result?.count ?? 0;
  }
}
