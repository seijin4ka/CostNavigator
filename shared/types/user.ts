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
  is_locked: number | null;
  failed_login_attempts: number | null;
  locked_until: string | null;
  reset_token: string | null;
  reset_token_expires: string | null;
}

// ログインリクエスト
export const LoginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});
export type LoginRequest = z.infer<typeof LoginSchema>;

// パスワード変更リクエスト
export const AdminPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください"),
  confirmPassword: z.string("新しいパスワード確認を入力してください"),
}).export type AdminPasswordChangeRequest = z.infer<typeof AdminPasswordChangeSchema>;

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

// パスワードリセットリクエスト
export const PasswordResetSchema = z.object({
  token: z.string().uuid("リセットトークンが無効です"),
  newPassword: z.string().min(8, "パスワードは8文字以上で入力してください"),
  confirmPassword: z.string("パスワード確認を入力してください"),
});
export type PasswordResetRequest = z.infer<typeof PasswordResetSchema>;

// パスワードリセットリクエスト（メール送信用）
export const EmailPasswordResetSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});
export type EmailPasswordResetRequest = z.infer<typeof EmailPasswordResetSchema>;

// パスワードリセットレスポンス
export interface PasswordResetResponse {
  message: string;
}

// 管理者設定リクエスト
export const AdminSettingsSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください"),
  confirmPassword: z.string("新しいパスワード確認を入力してください"),
});
export type AdminSettingsRequest = z.infer<typeof AdminSettingsSchema>;

// 管理者設定レスポンス
export interface AdminSettingsResponse {
  user: User;
}

// アカウントロック解除リクエスト
export const UnlockAccountSchema = z.object({
  unlockToken: z.string("ロック解除トークンが無効です"),
});
export type UnlockAccountRequest = z.infer<typeof UnlockAccountSchema>;

