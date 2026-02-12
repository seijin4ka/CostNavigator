import { sign } from "hono/jwt";
import { UserRepository } from "../repositories/user-repository";
import { hashPassword, verifyPassword } from "../utils/password";
import type { User, LoginResponse } from "../../shared/types";

// 認証サービス
export class AuthService {
  private userRepo: UserRepository;

  constructor(private db: D1Database, private jwtSecret: string) {
    this.userRepo = new UserRepository(db);
  }

  // ログイン処理
  async login(email: string, password: string): Promise<LoginResponse | null> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) return null;

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) return null;

    const token = await this.generateToken(user);
    const { password_hash: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  // ユーザー情報取得
  async getUser(id: string): Promise<User | null> {
    return this.userRepo.findById(id);
  }

  // 初期管理者ユーザーの作成（存在しない場合のみ）
  async ensureAdminExists(): Promise<void> {
    const count = await this.userRepo.count();
    if (count === 0) {
      const passwordHash = await hashPassword("admin1234");
      await this.userRepo.create("admin@costnavigator.dev", passwordHash, "管理者", "super_admin");
    }
  }

  // JWTトークン生成
  private async generateToken(user: User & { password_hash: string }): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24時間有効
    };
    return await sign(payload, this.jwtSecret);
  }
}
