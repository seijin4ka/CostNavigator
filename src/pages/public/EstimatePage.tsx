import { useState, useEffect, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import {
  useEstimateBuilder,
  type PublicProduct,
} from "../../hooks/useEstimateBuilder";
import type { PartnerBranding } from "@shared/types";
import { USAGE_UNIT_LABELS } from "@shared/constants";
import { formatCurrency, formatNumber } from "../../lib/formatters";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";

export function EstimatePage() {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerBranding | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // 顧客情報フォーム
  const [customerForm, setCustomerForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_company: "",
    notes: "",
  });

  const builder = useEstimateBuilder();

  // パートナー情報と製品カタログを取得
  useEffect(() => {
    if (!partnerSlug) return;
    const fetchData = async () => {
      try {
        const [partnerRes, productsRes] = await Promise.all([
          apiClient.get<PartnerBranding>(`/public/${partnerSlug}`),
          apiClient.get<PublicProduct[]>(`/public/${partnerSlug}/products`),
        ]);
        setPartner(partnerRes.data);
        setProducts(productsRes.data);

        // 最初のカテゴリを選択
        const categories = [...new Set(productsRes.data.map((p) => p.category_name))];
        if (categories.length > 0) setSelectedCategory(categories[0]);
      } catch {
        setError("ページの読み込みに失敗しました。URLが正しいか確認してください。");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [partnerSlug]);

  // カテゴリ一覧
  const categories = [...new Set(products.map((p) => p.category_name))];

  // 選択中カテゴリの製品
  const filteredProducts = products.filter((p) => p.category_name === selectedCategory);

  // 見積もり送信
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (builder.items.length === 0) return;

    setIsSubmitting(true);
    setError("");
    try {
      const res = await apiClient.post<{ reference_number: string }>(
        `/public/${partnerSlug}/estimates`,
        {
          ...customerForm,
          customer_company: customerForm.customer_company || null,
          notes: customerForm.notes || null,
          items: builder.items.map((item) => ({
            product_id: item.product_id,
            tier_id: item.tier_id,
            quantity: item.quantity,
            usage_quantity: item.usage_quantity > 0 ? item.usage_quantity : null,
          })),
        }
      );
      navigate(`/estimate/${partnerSlug}/result?ref=${res.data.reference_number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "見積もりの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !partner) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header style={{ backgroundColor: partner?.secondary_color ?? "#1B1B1B" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          {partner?.logo_url && (
            <img src={partner.logo_url} alt={partner.name} className="h-8 object-contain" />
          )}
          <div>
            <h1 className="text-lg font-bold text-white">{partner?.name ?? "CostNavigator"}</h1>
            <p className="text-xs text-gray-300">Cloudflare サービス見積もり</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側: 製品セレクター */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">サービスを選択</h2>

            {/* カテゴリタブ */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  style={
                    selectedCategory === cat
                      ? { backgroundColor: partner?.primary_color ?? "#F6821F" }
                      : undefined
                  }
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* 製品一覧 */}
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <Card key={product.id}>
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {product.tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="border border-gray-200 rounded-lg p-3 hover:border-orange-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{tier.name}</span>
                          <span className="text-sm font-bold" style={{ color: partner?.primary_color ?? "#F6821F" }}>
                            {tier.price === 0 ? "無料" : `${formatCurrency(tier.price)}/月`}
                          </span>
                        </div>
                        {tier.usage_unit && (
                          <p className="text-xs text-gray-500 mb-2">
                            {tier.usage_unit_price != null && (
                              <>
                                従量: {formatCurrency(tier.usage_unit_price)}/{USAGE_UNIT_LABELS[tier.usage_unit] ?? tier.usage_unit}
                              </>
                            )}
                            {tier.usage_included != null && tier.usage_included > 0 && (
                              <> (含有: {formatNumber(tier.usage_included)})</>
                            )}
                          </p>
                        )}
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => builder.addItem(product, tier)}
                          style={{ backgroundColor: partner?.primary_color ?? "#F6821F" }}
                        >
                          追加
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 右側: 見積もりサマリー */}
          <div className="space-y-4">
            <div className="sticky top-6">
              <Card title="見積もりサマリー">
                {builder.items.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    左側のカタログからサービスを選択してください
                  </p>
                ) : (
                  <div className="space-y-3">
                    {builder.items.map((item, index) => (
                      <div key={index} className="border-b border-gray-100 pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.product_name}</p>
                            <p className="text-xs text-gray-500">{item.tier_name}</p>
                          </div>
                          <button
                            onClick={() => builder.removeItem(index)}
                            className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-xs text-gray-500">数量:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => builder.updateQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                        </div>

                        {item.usage_unit && item.usage_unit_price != null && (
                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-xs text-gray-500">
                              {USAGE_UNIT_LABELS[item.usage_unit] ?? item.usage_unit}:
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.usage_quantity}
                              onChange={(e) =>
                                builder.updateUsageQuantity(index, parseFloat(e.target.value) || 0)
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          </div>
                        )}

                        <p className="mt-2 text-sm font-medium text-right">
                          {formatCurrency(builder.calculateItemPrice(item))}/月
                        </p>
                      </div>
                    ))}

                    {/* 合計 */}
                    <div className="pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">月額合計</span>
                        <span className="font-bold text-lg" style={{ color: partner?.primary_color ?? "#F6821F" }}>
                          {formatCurrency(builder.totalMonthly)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">年額合計</span>
                        <span className="font-medium">{formatCurrency(builder.totalYearly)}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={() => setIsSubmitModalOpen(true)}
                      style={{ backgroundColor: partner?.primary_color ?? "#F6821F" }}
                    >
                      見積もりを保存
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 顧客情報入力モーダル */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="お客様情報の入力"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Input
            label="お名前"
            value={customerForm.customer_name}
            onChange={(e) => setCustomerForm((prev) => ({ ...prev, customer_name: e.target.value }))}
            required
          />
          <Input
            label="メールアドレス"
            type="email"
            value={customerForm.customer_email}
            onChange={(e) => setCustomerForm((prev) => ({ ...prev, customer_email: e.target.value }))}
            required
          />
          <Input
            label="会社名（任意）"
            value={customerForm.customer_company}
            onChange={(e) => setCustomerForm((prev) => ({ ...prev, customer_company: e.target.value }))}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">備考（任意）</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
              rows={3}
              value={customerForm.notes}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span>月額合計</span>
              <span className="font-bold">{formatCurrency(builder.totalMonthly)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>年額合計</span>
              <span className="font-medium">{formatCurrency(builder.totalYearly)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsSubmitModalOpen(false)}>
              キャンセル
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              style={{ backgroundColor: partner?.primary_color ?? "#F6821F" }}
            >
              見積もりを確定
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
