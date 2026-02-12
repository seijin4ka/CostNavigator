import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import type { PartnerBranding } from "@shared/types";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

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

export function EstimateResultPage() {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  const [partner, setPartner] = useState<PartnerBranding | null>(null);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
    try {
      const { generateEstimatePdf } = await import("../../lib/pdf-generator");
      await generateEstimatePdf(estimate, partner);
    } catch {
      alert("PDF生成に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !estimate || !partner) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-red-500">{error || "見積もりが見つかりません"}</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    draft: "下書き",
    sent: "送信済み",
    accepted: "承認済み",
    expired: "期限切れ",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header style={{ backgroundColor: partner.secondary_color }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          {partner.logo_url && (
            <img src={partner.logo_url} alt={partner.name} className="h-8 object-contain" />
          )}
          <div>
            <h1 className="text-lg font-bold text-white">{partner.name}</h1>
            <p className="text-xs text-gray-300">Cloudflare サービス見積もり</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 見積もり概要 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">見積もり結果</h2>
            <p className="text-sm text-gray-500 mt-1">参照番号: {estimate.reference_number}</p>
          </div>
          <Button onClick={handleDownloadPdf}>PDFダウンロード</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div>
              <p className="text-xs text-gray-500">お客様名</p>
              <p className="font-medium">{estimate.customer_name}</p>
              {estimate.customer_company && (
                <p className="text-sm text-gray-600">{estimate.customer_company}</p>
              )}
            </div>
          </Card>
          <Card>
            <div>
              <p className="text-xs text-gray-500">見積もり日</p>
              <p className="font-medium">{formatDate(estimate.created_at)}</p>
              <p className="text-sm text-gray-600">{statusLabels[estimate.status] ?? estimate.status}</p>
            </div>
          </Card>
          <Card>
            <div>
              <p className="text-xs text-gray-500">月額合計</p>
              <p className="text-2xl font-bold" style={{ color: partner.primary_color }}>
                {formatCurrency(estimate.total_monthly)}
              </p>
              <p className="text-sm text-gray-600">年額: {formatCurrency(estimate.total_yearly)}</p>
            </div>
          </Card>
        </div>

        {/* 明細テーブル */}
        <Card title="見積もり明細">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">サービス</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">プラン</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">数量</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">月額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {estimate.items.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3 px-4">{item.product_name}</td>
                  <td className="py-3 px-4 text-gray-600">{item.tier_name ?? "-"}</td>
                  <td className="py-3 px-4 text-right">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.final_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={3} className="py-3 px-4 text-right font-bold">月額合計</td>
                <td className="py-3 px-4 text-right font-bold text-lg" style={{ color: partner.primary_color }}>
                  {formatCurrency(estimate.total_monthly)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-2 px-4 text-right text-gray-600">年額合計</td>
                <td className="py-2 px-4 text-right font-medium">{formatCurrency(estimate.total_yearly)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <div className="text-center mt-8">
          <a
            href={`/estimate/${partnerSlug}`}
            className="text-sm hover:underline"
            style={{ color: partner.primary_color }}
          >
            新しい見積もりを作成
          </a>
        </div>
      </div>
    </div>
  );
}
