import { z } from "zod";

// 料金モデル
export const PricingModel = z.enum(["tier", "usage", "tier_plus_usage", "custom"]);
export type PricingModel = z.infer<typeof PricingModel>;

// 製品カテゴリ
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
}

// カテゴリ作成・更新スキーマ
export const CategorySchema = z.object({
  name: z.string().min(1, "カテゴリ名は必須です"),
  slug: z
    .string()
    .min(1, "スラッグは必須です")
    .regex(/^[a-z0-9-]+$/, "スラッグは英小文字、数字、ハイフンのみ使用可能です"),
  display_order: z.number().int().min(0).default(0),
});
export type CategoryInput = z.infer<typeof CategorySchema>;

// 製品
export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  pricing_model: PricingModel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 製品作成・更新スキーマ
export const ProductSchema = z.object({
  category_id: z.string().min(1, "カテゴリは必須です"),
  name: z.string().min(1, "製品名は必須です"),
  slug: z
    .string()
    .min(1, "スラッグは必須です")
    .regex(/^[a-z0-9-]+$/, "スラッグは英小文字、数字、ハイフンのみ使用可能です"),
  description: z.string().default(""),
  pricing_model: PricingModel.default("tier"),
  is_active: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof ProductSchema>;

// 製品ティア（料金プラン）
export interface ProductTier {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  base_price: number;
  usage_unit: string | null;
  usage_unit_price: number | null;
  usage_included: number | null;
  display_order: number;
  is_active: boolean;
}

// ティア作成・更新スキーマ
export const TierSchema = z.object({
  product_id: z.string().min(1, "製品IDは必須です"),
  name: z.string().min(1, "ティア名は必須です"),
  slug: z
    .string()
    .min(1, "スラッグは必須です")
    .regex(/^[a-z0-9-]+$/, "スラッグは英小文字、数字、ハイフンのみ使用可能です"),
  base_price: z.number().min(0, "基本価格は0以上で入力してください"),
  usage_unit: z.string().nullable().optional(),
  usage_unit_price: z.number().min(0).nullable().optional(),
  usage_included: z.number().min(0).nullable().optional(),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
export type TierInput = z.infer<typeof TierSchema>;

// 製品とティアの複合型（カタログ表示用）
export interface ProductWithTiers extends Product {
  category_name: string;
  tiers: ProductTier[];
}
