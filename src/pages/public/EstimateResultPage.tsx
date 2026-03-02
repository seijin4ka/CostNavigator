import { useState, useEffect, type CSSProperties } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import type { SystemSettings } from "@shared/types";
import { formatCurrency, formatDate, setCurrency } from "../../lib/formatters";
import { EstimateHeader } from "../../components/public/EstimateHeader";
import { StepIndicator } from "../../components/public/StepIndicator";
import {
  DownloadIcon,
  DocumentIcon,
  CalendarIcon,
  UserIcon,
  CurrencyIcon,
  PlusIcon,
  CheckCircleIcon,
} from "../../components/public/Icons";

// 見積もり結果型（公開API）
interface EstimateResult {
  reference_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_company: string | null;
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
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    if (!ref) {
      setError("見積もり参照番号が指定されていません");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [settingsRes, estimateRes] = await Promise.all([
          apiClient.get<SystemSettings>("/public/system-settings"),
          apiClient.get<EstimateResult>(`/public/estimates/${ref}`),
        ]);
        setSystemSettings(settingsRes.data);
        setCurrency(settingsRes.data.currency, settingsRes.data.exchange_rate);
        setEstimate(estimateRes.data);
      } catch (err) {
        console.error("見積もり結果の読み込みエラー:", err);
        setError("見積もりの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ref]);

  // PDF生成（遅延読み込み）
  const handleDownloadPdf = async () => {
    if (!estimate || !systemSettings) return;
    setIsDownloading(true);
    setPdfError("");
    try {
      const { generateEstimatePdf } = await import("../../lib/pdf-generator");
      await generateEstimatePdf(estimate, {
        name: systemSettings.brand_name,
        primary_color: systemSettings.primary_color,
      });
    } catch (err) {
      console.error("PDF生成エラー:", err);
      setPdfError("PDF生成に失敗しました。ブラウザを更新して再試行してください。");
    } finally {
      setIsDownloading(false);
    }
  };

  const primaryColor = systemSettings?.primary_color ?? "#F6821F";
  const secondaryColor = systemSettings?.secondary_color ?? "#FFFFFF";
  const brandName = systemSettings?.brand_name ?? "Accelia";
  const logoUrl = systemSettings?.logo_url;

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
  if (error || !estimate || !systemSettings) {
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
      <EstimateHeader
        branding={{ name: brandName, logo_url: logoUrl ?? null }}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      {/* === 完了バナー === */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${secondaryColor}08, ${primaryColor}06, ${secondaryColor}04)` }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ステップインジケーター（全完了） */}
          <div className="mb-6 animate-cn-fade-up opacity-0">
            <StepIndicator currentStep={3} primaryColor={primaryColor} />
          </div>

          <div className="text-center animate-cn-fade-up opacity-0" style={{ animationDelay: "100ms" }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <CheckCircleIcon className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
              お見積もりが完了しました
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              以下の内容でお見積もりを作成しました。PDFでダウンロードして社内検討にご活用ください。
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* === メインコンテンツ === */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* 見積もりヘッダー */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-cn-fade-up opacity-0" style={{ animationDelay: "150ms" }}>
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

        {/* PDFエラー表示 */}
        {pdfError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 animate-cn-fade-up">
            {pdfError}
          </div>
        )}

        {/* 情報カード */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* 顧客情報 */}
          <div
            className="bg-white rounded-xl border border-slate-200 p-5 animate-cn-fade-up opacity-0"
            style={{ animationDelay: "200ms" }}
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
            {estimate.customer_phone && (
              <p className="text-sm text-slate-500 mt-0.5">{estimate.customer_phone}</p>
            )}
          </div>

          {/* 見積もり日 */}
          <div
            className="bg-white rounded-xl border border-slate-200 p-5 animate-cn-fade-up opacity-0"
            style={{ animationDelay: "250ms" }}
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
            <p className="text-sm text-slate-500 mt-0.5">{brandName}</p>
          </div>

          {/* 月額合計 */}
          <div
            className="bg-white rounded-xl border-2 p-5 animate-cn-fade-up opacity-0"
            style={{ borderColor: `${primaryColor}30`, animationDelay: "300ms" }}
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
          style={{ animationDelay: "350ms" }}
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

        {/* ネクストアクション */}
        <div
          className="mt-8 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 animate-cn-fade-up opacity-0"
          style={{ animationDelay: "400ms" }}
        >
          <h3 className="text-base font-bold text-slate-900 font-display mb-4">次のステップ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group disabled:opacity-50"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <DownloadIcon className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 font-display group-hover:text-slate-900">PDFをダウンロード</p>
                <p className="text-xs text-slate-400 mt-0.5">社内検討用にPDFを保存</p>
              </div>
            </button>

            <Link
              to="/"
              className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <PlusIcon className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 font-display group-hover:text-slate-900">別の見積もりを作成</p>
                <p className="text-xs text-slate-400 mt-0.5">異なる構成で再見積もり</p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* === フッター === */}
      <footer className="mt-16 lg:mt-24 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-400 font-display">
              {systemSettings?.footer_text ?? `Powered by ${brandName}`}
            </p>
            <p className="text-xs text-slate-400 font-display">
              Cloudflare 製品のお見積もりツール
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
