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

  // ユーザーのロック解除
  async unlockAccount(userId: string): Promise<void> {
    await executeD1Query(
      this.db,
      `UPDATE users SET is_locked = 0, failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
      [userId]
    );
  }

  // ユーザー情報の更新
  async update(userId: string, data: Partial<User>): Promise<void> {
    // 可動フィールドの動的SQL生成
    const updates: string[] = [];
    const values: any[] = [];

    if (data.email !== undefined) {
      updates.push("email = ?");
      values.push(data.email);
    }

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.is_locked !== undefined) {
      updates.push("is_locked = ?");
      values.push(data.is_locked ? 1 : 0);
    }

    if (data.failed_login_attempts !== undefined) {
      updates.push("failed_login_attempts = ?");
      values.push(data.failed_login_attempts ?? 0);
    }

    if (data.locked_until !== undefined) {
      updates.push("locked_until = ?");
      values.push(data.locked_until ?? null);
    }

    if (data.password_changed_at !== undefined) {
      updates.push("password_changed_at = datetime('now')");
    }

    if (data.updated_at !== undefined) {
      updates.push("updated_at = datetime('now')");
    }

    if (updates.length > 0 || values.length > 0) {
      await executeD1Query(
        this.db,
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        [userId]
      );
    }
  }
}
