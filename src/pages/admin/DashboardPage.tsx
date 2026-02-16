import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { formatCurrency, formatDate } from "../../lib/formatters";

interface DashboardStats {
  products_count: number;
  categories_count: number;
  estimates_count: number;
  total_revenue: number;
  recent_estimates: {
    reference_number: string;
    customer_name: string;
    customer_company: string | null;
    total_monthly: number;
    status: string;
    created_at: string;
    partner_name: string;
  }[];
}

const statusLabels: Record<string, string> = {
  draft: "下書き",
  sent: "送信済み",
  accepted: "承認済み",
  expired: "期限切れ",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-600",
};

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<DashboardStats>("/admin/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch((err) => {
        if (err instanceof Error) {
          setError(err.message || "統計情報の取得に失敗しました");
        } else {
          setError("統計情報の取得に失敗しました");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <div>
            <p className="text-sm text-gray-500">製品数</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.products_count ?? 0}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-gray-500">カテゴリ数</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.categories_count ?? 0}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-gray-500">見積もり数</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.estimates_count ?? 0}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-gray-500">合計売上</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">
              {formatCurrency(stats?.total_revenue ?? 0)}
            </p>
          </div>
        </Card>
      </div>

      {/* 最近の見積もり */}
      <Card title="最近の見積もり" actions={
        <Link to="/admin/estimates" className="text-sm text-orange-500 hover:underline">
          すべて表示
        </Link>
      }>
        {stats?.recent_estimates.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">見積もりはまだありません</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-500 text-xs uppercase">参照番号</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500 text-xs uppercase">お客様</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500 text-xs uppercase">パートナー</th>
                <th className="text-right py-3 px-2 font-medium text-gray-500 text-xs uppercase">金額</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500 text-xs uppercase">状態</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500 text-xs uppercase">日付</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats?.recent_estimates.map((est) => (
                <tr key={est.reference_number} className="hover:bg-gray-50">
                  <td className="py-3 px-2 font-mono text-xs">{est.reference_number}</td>
                  <td className="py-3 px-2">
                    <div>{est.customer_name}</div>
                    {est.customer_company && (
                      <div className="text-xs text-gray-400">{est.customer_company}</div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-gray-600">{est.partner_name}</td>
                  <td className="py-3 px-2 text-right font-medium">{formatCurrency(est.total_monthly)}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[est.status] ?? ""}`}>
                      {statusLabels[est.status] ?? est.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs">{formatDate(est.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
