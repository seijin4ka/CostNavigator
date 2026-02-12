import { useState, useEffect, type CSSProperties } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import type { PartnerBranding } from "@shared/types";
import { formatCurrency, formatDate } from "../../lib/formatters";

// --- SVGアイコン ---

function ShieldIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function DownloadIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function DocumentIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function CalendarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function CurrencyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlusIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

// 見積もり結果型（公開API）
interface EstimateResult {
  reference_number: string;
  customer_name: string;
  customer_company: string | null;
  partner_name: string;
  status: string;
  total_monthly: number;
  total_yearly: number;
  created_at: string;
  items: {
    product_name: string;
    tier_name: string | null;
    quantity: number;
    usage_quantity: number | null;
    final_price: number;
  }[];
}

// ステータス表示設定
const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "作成済み", className: "bg-slate-100 text-slate-600" },
  sent: { label: "送信済み", className: "bg-blue-50 text-blue-600" },
  accepted: { label: "承認済み", className: "bg-emerald-50 text-emerald-600" },
  expired: { label: "期限切れ", className: "bg-amber-50 text-amber-600" },
};

export function EstimateResultPage() {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  const [partner, setPartner] = useState<PartnerBranding | null>(null);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!partnerSlug || !ref) return;
    const fetchData = async () => {
      try {
        const [partnerRes, estimateRes] = await Promise.all([
          apiClient.get<PartnerBranding>(`/public/${partnerSlug}`),
          apiClient.get<EstimateResult>(`/public/estimates/${ref}`),
        ]);
        setPartner(partnerRes.data);
        setEstimate(estimateRes.data);
      } catch {
        setError("見積もりの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [partnerSlug, ref]);

  // PDF生成（遅延読み込み）
  const handleDownloadPdf = async () => {
    if (!estimate || !partner) return;
    setIsDownloading(true);
    try {
      const { generateEstimatePdf } = await import("../../lib/pdf-generator");
      await generateEstimatePdf(estimate, partner);
    } catch {
      alert("PDF生成に失敗しました。ブラウザを更新して再試行してください。");
    } finally {
      setIsDownloading(false);
    }
  };

  const primaryColor = partner?.primary_color ?? "#F6821F";
  const secondaryColor = partner?.secondary_color ?? "#1B1B1B";

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
  if (error || !estimate || !partner) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 font-display">見積もりを表示できません</h2>
          <p className="mt-2 text-sm text-slate-500 font-body">{error || "見積もりが見つかりません"}</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[estimate.status] ?? {
    label: estimate.status,
    className: "bg-slate-100 text-slate-600",
  };

  return (
    <div
      className="min-h-screen bg-slate-50 font-body"
      style={{ "--cn-accent": primaryColor, "--cn-accent-dark": secondaryColor } as CSSProperties}
    >
      {/* === ヘッダー === */}
      <header className="relative overflow-hidden" style={{ backgroundColor: secondaryColor }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[72px]">
            <div className="flex items-center gap-3 sm:gap-4">
              {partner.logo_url && (
                <img src={partner.logo_url} alt={partner.name} className="h-7 sm:h-8 object-contain" />
              )}
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-display">
                  {partner.name}
                </h1>
                <p className="text-[11px] sm:text-xs text-white/50 tracking-wide">
                  Cloudflare サービス見積もり
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-white/60 text-xs">
              <ShieldIcon className="w-4 h-4" />
              <span className="font-display">Cloudflare 認定パートナー</span>
            </div>
          </div>
        </div>
        <div
          className="h-[3px]"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}88, transparent)` }}
        />
      </header>

      {/* === メインコンテンツ === */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* 見積もりヘッダー */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-cn-fade-up opacity-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
                見積書
              </h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <DocumentIcon className="w-4 h-4" />
              <span className="cn-price font-semibold text-slate-600">{estimate.reference_number}</span>
            </div>
          </div>
          {/* PDFダウンロード */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-display"
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 4px 14px -3px ${primaryColor}66`,
            }}
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <DownloadIcon className="w-4 h-4" />
                PDFダウンロード
              </>
            )}
          </button>
        </div>

        {/* 情報カード */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* 顧客情報 */}
          <div
            className="bg-white rounded-xl border border-slate-200 p-5 animate-cn-fade-up opacity-0"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <UserIcon className="w-4 h-4" style={{ color: primaryColor }} />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-display">
                お客様
              </span>
            </div>
            <p className="font-semibold text-slate-800 font-display">{estimate.customer_name}</p>
            {estimate.customer_company && (
              <p className="text-sm text-slate-500 mt-0.5">{estimate.customer_company}</p>
            )}
          </div>

          {/* 見積もり日 */}
          <div
            className="bg-white rounded-xl border border-slate-200 p-5 animate-cn-fade-up opacity-0"
            style={{ animationDelay: "150ms" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <CalendarIcon className="w-4 h-4" style={{ color: primaryColor }} />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-display">
                見積もり日
              </span>
            </div>
            <p className="font-semibold text-slate-800 cn-price">{formatDate(estimate.created_at)}</p>
            <p className="text-sm text-slate-500 mt-0.5">{partner.name}</p>
          </div>

          {/* 月額合計 */}
          <div
            className="bg-white rounded-xl border-2 p-5 animate-cn-fade-up opacity-0"
            style={{ borderColor: `${primaryColor}30`, animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <CurrencyIcon className="w-4 h-4" style={{ color: primaryColor }} />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-display">
                月額合計
              </span>
            </div>
            <p className="cn-price text-2xl font-bold font-display" style={{ color: primaryColor }}>
              {formatCurrency(estimate.total_monthly)}
            </p>
            <p className="cn-price text-sm text-slate-500 mt-0.5">
              年額: {formatCurrency(estimate.total_yearly)}
            </p>
          </div>
        </div>

        {/* 見積もり明細テーブル */}
        <div
          className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-cn-fade-up opacity-0"
          style={{ animationDelay: "250ms" }}
        >
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 font-display">見積もり明細</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-display">
                    サービス
                  </th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-display">
                    プラン
                  </th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-display">
                    数量
                  </th>
                  <th className="text-right py-3 px-6 text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-display">
                    月額
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {estimate.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-slate-800 font-display">{item.product_name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-500">{item.tier_name ?? "-"}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="cn-price text-sm text-slate-600">{item.quantity}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="cn-price text-sm font-semibold text-slate-800">
                        {formatCurrency(item.final_price)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={3} className="py-4 px-6 text-right">
                    <span className="text-sm font-bold text-slate-700 font-display">月額合計</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="cn-price text-xl font-bold font-display" style={{ color: primaryColor }}>
                      {formatCurrency(estimate.total_monthly)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 px-6 text-right">
                    <span className="text-sm text-slate-500">年額合計</span>
                  </td>
                  <td className="py-2 px-6 text-right">
                    <span className="cn-price text-sm font-semibold text-slate-600">
                      {formatCurrency(estimate.total_yearly)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 新規見積もりリンク */}
        <div
          className="mt-8 text-center animate-cn-fade-up opacity-0"
          style={{ animationDelay: "300ms" }}
        >
          <Link
            to={`/estimate/${partnerSlug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80 font-display"
            style={{ color: primaryColor }}
          >
            <PlusIcon className="w-4 h-4" />
            新しい見積もりを作成
          </Link>
        </div>
      </main>

      {/* === フッター === */}
      <footer className="mt-16 lg:mt-24 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-400 font-display">
              Powered by <span className="font-semibold text-slate-500">CostNavigator</span>
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldIcon className="w-3.5 h-3.5" />
              <span>安全な見積もりシステム</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
