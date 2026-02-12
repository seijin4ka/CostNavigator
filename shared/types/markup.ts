import { z } from "zod";

// マークアップ種別
export const MarkupType = z.enum(["percentage", "fixed"]);
export type MarkupType = z.infer<typeof MarkupType>;

// マークアップルール
export interface MarkupRule {
  id: string;
  partner_id: string;
  product_id: string | null;
  tier_id: string | null;
  markup_type: MarkupType;
  markup_value: number;
  created_at: string;
  updated_at: string;
}

// マークアップルール作成・更新スキーマ
export const MarkupRuleSchema = z.object({
  product_id: z.string().nullable().optional(),
  tier_id: z.string().nullable().optional(),
  markup_type: MarkupType,
  markup_value: z
    .number()
    .min(0, "マークアップは0以上で入力してください")
    .max(1000, "マークアップは1000%以下で入力してください"),
});
export type MarkupRuleInput = z.infer<typeof MarkupRuleSchema>;

// マークアップルール（表示用、製品名付き）
export interface MarkupRuleWithNames extends MarkupRule {
  product_name: string | null;
  tier_name: string | null;
}

// マークアップ解決結果
export interface ResolvedMarkup {
  markup_type: MarkupType;
  markup_value: number;
  source: "product_tier" | "product" | "partner_default";
}
