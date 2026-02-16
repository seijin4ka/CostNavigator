import { z } from "zod";

// ユーザーロール
export const UserRole = z.enum(["super_admin", "admin"]);
export type UserRole = z.infer<typeof UserRole>;

// ユーザー型
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  password_changed_at: string | null;
}

// ログインリクエスト
export const LoginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});
export type LoginRequest = z.infer<typeof LoginSchema>;

// ログインレスポンス
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  passwordChangeRequired: boolean;
}

// リフレッシュトークンレスポンス
export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}
