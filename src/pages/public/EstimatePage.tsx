import { useState, useEffect, type FormEvent, type CSSProperties } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import {
  useEstimateBuilder,
  type PublicProduct,
} from "../../hooks/useEstimateBuilder";
import type { PartnerBranding, SystemSettings } from "@shared/types";
import { USAGE_UNIT_LABELS } from "@shared/constants";
import { formatCurrency, formatNumber } from "../../lib/formatters";

import { EstimateHeader } from "../../components/public/EstimateHeader";
import { EstimateHero } from "../../components/public/EstimateHero";
import { EstimateFooter } from "../../components/public/EstimateFooter";
import { EstimateFloatingBar } from "../../components/public/EstimateFloatingBar";
import { CustomerInfoModal } from "../../components/public/CustomerInfoModal";
import { PlusIcon, MinusIcon, TrashIcon, CheckIcon, ClockIcon, LockIcon } from "../../components/public/Icons";

export function EstimatePage() {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const navigate = useNavigate();
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
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
    customer_phone: "",
    customer_company: "",
    notes: "",
  });

  const builder = useEstimateBuilder();

  // partnerSlug がない場合、system_settings から primary_partner_slug を取得
  useEffect(() => {
    if (!partnerSlug) {
      const fetchSettings = async () => {
        try {
          const res = await apiClient.get<SystemSettings>("/public/system-settings");
          setSystemSettings(res.data);
          // primary_partner_slug が未設定の場合は isLoading を false に
          if (!res.data.primary_partner_slug) {
            setIsLoading(false);
          }
        } catch (err) {
          console.error("システム設定の読み込みエラー:", err);
          setIsLoading(false);
        }
      };
      fetchSettings();
    }
  }, [partnerSlug]);

  const slug = partnerSlug || systemSettings?.primary_partner_slug;
  const basePath = partnerSlug ? `/estimate/${partnerSlug}` : "";

  // パートナー情報と製品カタログを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (slug) {
          // slug がある場合: パートナー情報とマークアップ適用済み製品を取得
          const [partnerRes, productsRes] = await Promise.all([
            apiClient.get<PartnerBranding>(`/public/${slug}`),
            apiClient.get<PublicProduct[]>(`/public/${slug}/products`),
          ]);
          setPartner(partnerRes.data);
          setProducts(productsRes.data);
        } else {
          // slug がない場合: マークアップなし製品のみを取得（プレビューモード）
          const productsRes = await apiClient.get<PublicProduct[]>(`/public/products`);
          setProducts(productsRes.data);
          setPartner(null);
        }

        const categories = [...new Set(products.map((p) => p.category_name))];
        if (categories.length > 0 && products.length > 0) {
          setSelectedCategory(categories[0]);
        }
      } catch (err) {
        console.error("見積もりページの読み込みエラー:", err);
        setError("ページの読み込みに失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const categories = [...new Set(products.map((p) => p.category_name))];
  const filteredProducts = products.filter((p) => p.category_name === selectedCategory);

  // 見積もり送信
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (builder.items.length === 0) return;

    setIsSubmitting(true);
    setError("");
    try {
      const res = await apiClient.post<{ reference_number: string }>(
        `/public/${slug}/estimates`,
        {
          ...customerForm,
          customer_phone: customerForm.customer_phone || null,
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
      navigate(`${basePath}/result?ref=${res.data.reference_number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "見積もりの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = partner?.primary_color ?? systemSettings?.primary_color ?? "#F6821F";
  const secondaryColor = partner?.secondary_color ?? systemSettings?.secondary_color ?? "#1B1B1B";

  // 現在のステップ判定
  const currentStep = isSubmitModalOpen ? 2 : 1;

  // --- ローディング ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: `${primaryColor}33`, borderTopColor: primaryColor }}
          />
          <p className="mt-4 text-sm text-slate-400 font-body">読み込み中...</p>
        </div>
      </div>
    );
  }

  // --- エラー ---
  if (error && !partner) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 font-display">ページを表示できません</h2>
          <p className="mt-2 text-sm text-slate-500 font-body">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 font-body"
      style={{ "--cn-accent": primaryColor, "--cn-accent-dark": secondaryColor } as CSSProperties}
    >
      {/* === ヘッダー === */}
      <EstimateHeader partner={partner} primaryColor={primaryColor} secondaryColor={secondaryColor} />

      {/* === ヒーローセクション === */}
      <EstimateHero currentStep={currentStep} primaryColor={primaryColor} secondaryColor={secondaryColor} />

      {/* === メインコンテンツ === */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
          {/* === 左側: 製品セレクター === */}
          <div className="lg:col-span-2 animate-cn-fade-up opacity-0" style={{ animationDelay: "150ms" }}>
            {/* カテゴリタブ */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 cn-scrollbar">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const count = products.filter((p) => p.category_name === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap border transition-all duration-200 ${
                      isActive
                        ? "border-transparent text-white shadow-md"
                        : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300"
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : undefined}
                  >
                    {cat}
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 製品一覧 */}
            <div className="space-y-5">
              {filteredProducts.map((product, pi) => (
                <div
                  key={product.id}
                  className="cn-product-card bg-white rounded-xl border border-slate-200 overflow-hidden animate-cn-fade-up opacity-0"
                  style={{ animationDelay: `${200 + pi * 80}ms` }}
                >
                  {/* 製品ヘッダー */}
                  <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="mt-1 text-sm text-slate-500 leading-relaxed">{product.description}</p>
                        )}
                      </div>
                      <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 whitespace-nowrap ml-4">
                        {product.category_name}
                      </span>
                    </div>
                  </div>

                  {/* ティア選択 */}
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {product.tiers.map((tier, ti) => {
                        const isInEstimate = builder.items.some(
                          (i) => i.product_id === product.id && i.tier_id === tier.id
                        );
                        // 最も高価なティアに「おすすめ」表示
                        const isRecommended = product.tiers.length > 1 && ti === product.tiers.length - 1;
                        return (
                          <div
                            key={tier.id}
                            className={`cn-tier-card relative rounded-lg border p-4 cursor-pointer ${
                              isInEstimate ? "border-2 bg-slate-50" : "border-slate-200"
                            }`}
                            style={
                              isInEstimate
                                ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` }
                                : undefined
                            }
                            onClick={() => builder.addItem(product, tier)}
                          >
                            {/* 追加済みバッジ */}
                            {isInEstimate && (
                              <div
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: primaryColor }}
                              >
                                <CheckIcon className="w-3 h-3 text-white" />
                              </div>
                            )}

                            {/* おすすめバッジ */}
                            {isRecommended && !isInEstimate && (
                              <div
                                className="absolute -top-2.5 left-3 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide"
                                style={{ backgroundColor: primaryColor }}
                              >
                                おすすめ
                              </div>
                            )}

                            <div className="mb-3">
                              <span className="text-sm font-semibold text-slate-800 font-display">{tier.name}</span>
                            </div>

                            <div className="mb-3">
                              <span className="cn-price text-xl font-bold" style={{ color: primaryColor }}>
                                {tier.price === 0 ? "Free" : formatCurrency(tier.price)}
                              </span>
                              {tier.price > 0 && <span className="text-xs text-slate-400 ml-1">/月</span>}
                            </div>

                            {tier.usage_unit && tier.usage_unit_price != null && (
                              <div className="text-xs text-slate-500 mb-3 space-y-0.5">
                                <div>
                                  + 従量料金: {formatCurrency(tier.usage_unit_price)} /{" "}
                                  {USAGE_UNIT_LABELS[tier.usage_unit] ?? tier.usage_unit}
                                </div>
                                {tier.usage_included != null && tier.usage_included > 0 && (
                                  <div className="text-slate-400">
                                    ({formatNumber(tier.usage_included)} まで無料、超過分は従量課金)
                                  </div>
                                )}
                              </div>
                            )}

                            <button
                              className={`cn-tier-btn w-full py-2 rounded-md text-xs font-semibold transition-all duration-200 ${
                                isInEstimate ? "text-white" : "border"
                              }`}
                              style={
                                isInEstimate
                                  ? { backgroundColor: primaryColor }
                                  : { borderColor: `${primaryColor}40`, color: primaryColor }
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                builder.addItem(product, tier);
                              }}
                            >
                              {isInEstimate ? "追加済み (+1)" : "追加する"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* === 右側: 見積もりサマリー === */}
          <div className="lg:col-span-1 animate-cn-slide-up opacity-0" style={{ animationDelay: "250ms" }}>
            <div className="sticky top-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
                {/* サマリーヘッダー */}
                <div className="px-5 py-4" style={{ backgroundColor: secondaryColor }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white font-display tracking-wide">見積もりサマリー</h3>
                    <span className="text-xs text-white/50 font-display">
                      {builder.items.length > 0 ? `${builder.items.length}件` : ""}
                    </span>
                  </div>
                </div>

                {/* サマリーコンテンツ */}
                <div className="p-5">
                  {builder.items.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <PlusIcon className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 font-body">
                        サービスを選択してください
                      </p>
                      <p className="text-xs text-slate-400 font-body mt-1">
                        左のカタログから追加できます
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* アイテムリスト */}
                      <div className="space-y-3 max-h-[400px] overflow-y-auto cn-scrollbar pr-1">
                        {builder.items.map((item, index) => (
                          <div
                            key={index}
                            className="group rounded-lg border border-slate-100 p-3 hover:border-slate-200 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate font-display">
                                  {item.product_name}
                                </p>
                                <p className="text-xs text-slate-400">{item.tier_name}</p>
                              </div>
                              <button
                                onClick={() => builder.removeItem(index)}
                                className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* 数量コントロール + 小計 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <button
                                  onClick={() => item.quantity <= 1 ? builder.removeItem(index) : builder.updateQuantity(index, item.quantity - 1)}
                                  className="w-7 h-7 rounded-l-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                  <MinusIcon className="w-3 h-3" />
                                </button>
                                <div className="w-10 h-7 border-y border-slate-200 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-slate-700 cn-price">{item.quantity}</span>
                                </div>
                                <button
                                  onClick={() => builder.updateQuantity(index, item.quantity + 1)}
                                  className="w-7 h-7 rounded-r-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                  <PlusIcon className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="cn-price text-sm font-bold text-slate-800">
                                {formatCurrency(builder.calculateItemPrice(item))}
                              </span>
                            </div>

                            {/* 従量料金入力 */}
                            {item.usage_unit && item.usage_unit_price != null && (
                              <div className="mt-2 flex items-center gap-2">
                                <label className="text-xs text-slate-400 whitespace-nowrap">
                                  {USAGE_UNIT_LABELS[item.usage_unit] ?? item.usage_unit}:
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.usage_quantity}
                                  onChange={(e) =>
                                    builder.updateUsageQuantity(index, parseFloat(e.target.value) || 0)
                                  }
                                  className="flex-1 px-2 py-1 border border-slate-200 rounded-md text-xs text-center cn-price text-slate-700 focus:outline-none focus:ring-1 focus:border-slate-300 transition-shadow"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 合計セクション */}
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-slate-500">見積もり月額（消費税込）</span>
                          <span
                            className="cn-price text-2xl font-bold font-display"
                            style={{ color: primaryColor }}
                          >
                            {formatCurrency(builder.totalMonthly)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xs text-slate-400">見積もり年額（月額 × 12ヶ月）</span>
                          <span className="cn-price text-sm font-semibold text-slate-600">
                            {formatCurrency(builder.totalYearly)}
                          </span>
                        </div>
                      </div>

                      {/* CTAボタン */}
                      <button
                        onClick={() => {
                          if (!slug) {
                            setError("見積もりを送信するには、パートナー経由のURLからアクセスしてください。管理画面でデフォルトパートナーを設定することもできます。");
                            return;
                          }
                          setIsSubmitModalOpen(true);
                        }}
                        className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg font-display"
                        style={{
                          backgroundColor: primaryColor,
                          boxShadow: `0 4px 14px -3px ${primaryColor}66`,
                        }}
                      >
                        見積もりを依頼する
                      </button>

                      {/* 信頼シグナル */}
                      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <LockIcon className="w-3 h-3" />
                          SSL暗号化通信
                        </span>
                        <span className="w-px h-3 bg-slate-200" />
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          即時発行
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* === モバイル フローティングバー === */}
      {builder.items.length > 0 && (
        <EstimateFloatingBar
          itemCount={builder.items.length}
          totalMonthly={builder.totalMonthly}
          slug={slug ?? null}
          primaryColor={primaryColor}
          onSubmit={() => {
            if (!slug) {
              setError("見積もりを送信するには、パートナー経由のURLからアクセスしてください。管理画面でデフォルトパートナーを設定することもできます。");
              return;
            }
            setIsSubmitModalOpen(true);
          }}
        />
      )}

      {/* === 顧客情報モーダル === */}
      <CustomerInfoModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmit}
        customerForm={customerForm}
        onCustomerFormChange={setCustomerForm}
        itemCount={builder.items.length}
        totalMonthly={builder.totalMonthly}
        totalYearly={builder.totalYearly}
        primaryColor={primaryColor}
        error={error}
        isSubmitting={isSubmitting}
      />

      {/* === フッター === */}
      <EstimateFooter />

      {/* モバイルフローティングバー用の余白 */}
      {builder.items.length > 0 && <div className="h-20 lg:hidden" />}
    </div>
  );
}
