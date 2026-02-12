import { z } from "zod";

// 見積もりステータス
export const EstimateStatus = z.enum(["draft", "sent", "accepted", "expired"]);
export type EstimateStatus = z.infer<typeof EstimateStatus>;

// 見積もり
export interface Estimate {
  id: string;
  partner_id: string;
  reference_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_company: string | null;
  status: EstimateStatus;
  notes: string | null;
  total_monthly: number;
  total_yearly: number;
  created_at: string;
  updated_at: string;
}

// 見積もり明細
export interface EstimateItem {
  id: string;
  estimate_id: string;
  product_id: string;
  product_name: string;
  tier_id: string | null;
  tier_name: string | null;
  quantity: number;
  usage_quantity: number | null;
  base_price: number;
  markup_amount: number;
  final_price: number;
}

// 見積もり作成リクエスト（公開API用）
export const CreateEstimateSchema = z.object({
  customer_name: z.string().min(1, "お名前は必須です"),
  customer_email: z.string().email("有効なメールアドレスを入力してください"),
  customer_phone: z.string().nullable().optional(),
  customer_company: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        tier_id: z.string().nullable().optional(),
        quantity: z.number().int().min(1).default(1),
        usage_quantity: z.number().min(0).nullable().optional(),
      })
    )
    .min(1, "1つ以上の製品を選択してください"),
});
export type CreateEstimateRequest = z.infer<typeof CreateEstimateSchema>;

// 見積もり詳細（明細付き）
export interface EstimateWithItems extends Estimate {
  partner_name: string;
  items: EstimateItem[];
}
