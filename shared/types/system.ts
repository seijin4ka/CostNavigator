import { z } from "zod";

// システム設定の型定義
export interface SystemSettings {
  id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

// システム設定の内部型（JWT_SECRETを含む）
export interface SystemSettingsInternal extends SystemSettings {
  jwt_secret: string | null;
}

// システム設定更新リクエストスキーマ
export const UpdateSystemSettingsSchema = z.object({
  brand_name: z.string().min(1).max(100).optional(),
  logo_url: z.string().url().nullable().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "有効なカラーコードを入力してください").optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "有効なカラーコードを入力してください").optional(),
  footer_text: z.string().max(500).optional(),
  currency: z.enum(["USD", "JPY"]).optional(),
});

// システム設定更新リクエスト型（スキーマから推論）
export type UpdateSystemSettingsRequest = z.infer<typeof UpdateSystemSettingsSchema>;
