// 公開API向け見積もり結果型
// EstimateResultPage と pdf-generator で共用
export interface PublicEstimateResult {
  reference_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_company: string | null;
  status: string;
  total_monthly: number;
  total_yearly: number;
  created_at: string;
  items: PublicEstimateItem[];
}

export interface PublicEstimateItem {
  product_name: string;
  tier_name: string | null;
  quantity: number;
  usage_quantity: number | null;
  final_price: number;
}
