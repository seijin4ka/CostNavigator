import { z } from "zod";

// パートナー型
export interface Partner {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  default_markup_type: "percentage" | "fixed";
  default_markup_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// パートナー作成・更新スキーマ
export const PartnerSchema = z.object({
  name: z.string().min(1, "パートナー名は必須です"),
  slug: z
    .string()
    .min(1, "スラッグは必須です")
    .regex(/^[a-z0-9-]+$/, "スラッグは英小文字、数字、ハイフンのみ使用可能です"),
  logo_url: z.string().url("有効なURLを入力してください").nullable().optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "有効なカラーコードを入力してください")
    .default("#F6821F"),
  secondary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "有効なカラーコードを入力してください")
    .default("#1B1B1B"),
  default_markup_type: z.enum(["percentage", "fixed"]).default("percentage"),
  default_markup_value: z
    .number()
    .min(0, "マークアップは0以上で入力してください")
    .max(1000, "マークアップは1000%以下で入力してください")
    .default(20),
  is_active: z.boolean().default(true),
});
export type PartnerInput = z.infer<typeof PartnerSchema>;

// パートナー公開情報（ブランディング用）
export interface PartnerBranding {
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}
