import { useState, useCallback, useMemo } from "react";

// 公開API製品型（マークアップ適用済み）
export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_name: string;
  pricing_model: string;
  tiers: PublicTier[];
}

export interface PublicTier {
  id: string;
  name: string;
  slug: string;
  price: number;
  usage_unit: string | null;
  usage_unit_price: number | null;
  usage_included: number | null;
}

// 見積もりアイテム（ビルダー状態管理用）
export interface EstimateBuilderItem {
  product_id: string;
  product_name: string;
  tier_id: string;
  tier_name: string;
  tier_price: number;
  quantity: number;
  usage_quantity: number;
  usage_unit: string | null;
  usage_unit_price: number | null;
  usage_included: number | null;
}

// 見積もりビルダーフック
export function useEstimateBuilder() {
  const [items, setItems] = useState<EstimateBuilderItem[]>([]);

  // アイテム追加
  const addItem = useCallback(
    (product: PublicProduct, tier: PublicTier) => {
      // 同じ製品・ティアの組み合わせが存在する場合は数量を増やす
      const existingIndex = items.findIndex(
        (i) => i.product_id === product.id && i.tier_id === tier.id
      );

      if (existingIndex >= 0) {
        setItems((prev) =>
          prev.map((item, i) =>
            i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
          )
        );
      } else {
        setItems((prev) => [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            tier_id: tier.id,
            tier_name: tier.name,
            tier_price: tier.price,
            quantity: 1,
            usage_quantity: 0,
            usage_unit: tier.usage_unit,
            usage_unit_price: tier.usage_unit_price,
            usage_included: tier.usage_included,
          },
        ]);
      }
    },
    [items]
  );

  // アイテム削除
  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 数量更新
  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
  }, []);

  // 従量数量更新
  const updateUsageQuantity = useCallback((index: number, usageQuantity: number) => {
    if (usageQuantity < 0) return;
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, usage_quantity: usageQuantity } : item))
    );
  }, []);

  // アイテムの月額料金計算
  const calculateItemPrice = useCallback((item: EstimateBuilderItem): number => {
    let price = item.tier_price;

    // 従量料金
    if (item.usage_unit_price != null && item.usage_quantity > 0) {
      const billableUsage = Math.max(0, item.usage_quantity - (item.usage_included ?? 0));
      price += billableUsage * item.usage_unit_price;
    }

    return Math.round(price * item.quantity * 100) / 100;
  }, []);

  // 合計月額
  const totalMonthly = useMemo(
    () => items.reduce((sum, item) => sum + calculateItemPrice(item), 0),
    [items, calculateItemPrice]
  );

  // 合計年額
  const totalYearly = useMemo(() => Math.round(totalMonthly * 12 * 100) / 100, [totalMonthly]);

  // 全アイテムクリア
  const clearItems = useCallback(() => setItems([]), []);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateUsageQuantity,
    calculateItemPrice,
    totalMonthly,
    totalYearly,
    clearItems,
  };
}
