import { sign } from "hono/jwt";
import { UserRepository } from "../repositories/user-repository";
import { hashPassword, verifyPassword } from "../utils/password";
import type { User, LoginResponse } from "../../shared/types";
import { JWT } from "../../shared/constants";

// リフレッシュトークンのレスポンス型
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// 認証サービス
export class AuthService {
  private userRepo: UserRepository;

  constructor(private db: D1Database, private jwtSecret: string) {
    this.userRepo = new UserRepository(db);
  }

  // ログイン処理（アクセストークン + リフレッシュトークンを発行）
  async login(email: string, password: string): Promise<(LoginResponse & { refreshToken: string }) | null> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) return null;

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) return null;

    // 既存のリフレッシュトークンを無効化（ユーザーごとに1つのみ有効）
    await this.revokeAllRefreshTokens(user.id);

    const token = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);
    const { password_hash: _, ...userWithoutPassword } = user;
    return { token, refreshToken, user: userWithoutPassword };
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

  // アクセストークン生成（JWT、短命）
  private async generateAccessToken(user: User & { password_hash: string }): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + JWT.ACCESS_TOKEN_TTL_SECONDS,
    };
    return await sign(payload, this.jwtSecret);
  }

  // リフレッシュトークン生成（ランダム文字列、長命、DB保存）
  private async generateRefreshToken(userId: string): Promise<string> {
    // 暗号学的に安全なランダムトークン生成（32バイト = 256ビット）
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // トークンをハッシュ化してDB保存（平文保存を避ける）
    const tokenHash = await this.hashRefreshToken(token);
    const expiresAt = new Date(Date.now() + JWT.REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();

    await this.db
      .prepare(
        "INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
      )
      .bind(crypto.randomUUID(), userId, tokenHash, expiresAt)
      .run();

    return token;
  }

  // リフレッシュトークン検証とアクセストークン再発行
  async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse | null> {
    const tokenHash = await this.hashRefreshToken(refreshToken);

    // DBからトークン検索
    const row = await this.db
      .prepare(
        "SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token = ?"
      )
      .bind(tokenHash)
      .first<{ id: string; user_id: string; expires_at: string; revoked: number }>();

    if (!row || row.revoked === 1) {
      return null; // トークンが存在しないか無効化済み
    }

    // 有効期限チェック
    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) {
      // 期限切れトークンを削除
      await this.db.prepare("DELETE FROM refresh_tokens WHERE id = ?").bind(row.id).run();
      return null;
    }

    // ユーザー情報取得
    const user = await this.userRepo.findById(row.user_id);
    if (!user) return null;

    // 新しいアクセストークンとリフレッシュトークンを発行（リフレッシュトークンローテーション）
    await this.revokeRefreshToken(row.id);
    const newAccessToken = await this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // リフレッシュトークンのハッシュ化（SHA-256）
  private async hashRefreshToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // リフレッシュトークンの無効化
  private async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.db
      .prepare("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?")
      .bind(tokenId)
      .run();
  }

  // ユーザーのすべてのリフレッシュトークンを無効化
  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.db
      .prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?")
      .bind(userId)
      .run();
  }
}
