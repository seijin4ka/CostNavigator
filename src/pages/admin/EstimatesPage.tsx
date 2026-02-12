import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import type { Estimate, EstimateWithItems } from "@shared/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Table } from "../../components/ui/Table";
import { formatCurrency, formatDate } from "../../lib/formatters";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  sent: "送信済み",
  accepted: "承認済み",
  expired: "期限切れ",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-600",
};

export function EstimatesPage() {
  const [estimates, setEstimates] = useState<(Estimate & { partner_name: string })[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [error, setError] = useState("");

  const fetchEstimates = async () => {
    try {
      const res = await apiClient.get<(Estimate & { partner_name: string })[]>("/admin/estimates");
      setEstimates(res.data);
    } catch {
      setError("見積もりの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, []);

  // 見積もり詳細を表示
  const showDetail = async (id: string) => {
    try {
      const res = await apiClient.get<EstimateWithItems>(`/admin/estimates/${id}`);
      setSelectedEstimate(res.data);
      setIsDetailModalOpen(true);
    } catch {
      setError("見積もり詳細の取得に失敗しました");
    }
  };

  // ステータス更新
  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient.put(`/admin/estimates/${id}/status`, { status });
      fetchEstimates();
      if (selectedEstimate?.id === id) {
        setSelectedEstimate((prev) => (prev ? { ...prev, status: status as Estimate["status"] } : null));
      }
    } catch {
      setError("ステータスの更新に失敗しました");
    }
  };

  // 見積もり削除
  const handleDelete = async (id: string) => {
    if (!confirm("この見積もりを削除しますか？")) return;
    try {
      await apiClient.delete(`/admin/estimates/${id}`);
      fetchEstimates();
    } catch {
      setError("削除に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">見積もり一覧</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      <Card>
        <Table
          columns={[
            {
              header: "参照番号",
              accessor: (row) => (
                <button
                  onClick={() => showDetail(row.id)}
                  className="font-mono text-xs text-orange-500 hover:underline"
                >
                  {row.reference_number}
                </button>
              ),
            },
            {
              header: "お客様",
              accessor: (row) => (
                <div>
                  <div className="font-medium">{row.customer_name}</div>
                  {row.customer_company && (
                    <div className="text-xs text-gray-400">{row.customer_company}</div>
                  )}
                </div>
              ),
            },
            { header: "パートナー", accessor: "partner_name" },
            {
              header: "月額",
              accessor: (row) => (
                <span className="font-medium">{formatCurrency(row.total_monthly)}</span>
              ),
              className: "text-right",
            },
            {
              header: "状態",
              accessor: (row) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] ?? ""}`}>
                  {STATUS_LABELS[row.status] ?? row.status}
                </span>
              ),
            },
            {
              header: "日付",
              accessor: (row) => (
                <span className="text-gray-500 text-xs">{formatDate(row.created_at)}</span>
              ),
            },
            {
              header: "操作",
              accessor: (row) => (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => showDetail(row.id)}>
                    詳細
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(row.id)}>
                    削除
                  </Button>
                </div>
              ),
            },
          ]}
          data={estimates}
          keyField="id"
          emptyMessage="見積もりはまだありません"
        />
      </Card>

      {/* 見積もり詳細モーダル */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="見積もり詳細"
        size="lg"
      >
        {selectedEstimate && (
          <div className="space-y-4">
            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">参照番号</p>
                <p className="font-mono">{selectedEstimate.reference_number}</p>
              </div>
              <div>
                <p className="text-gray-500">作成日</p>
                <p>{formatDate(selectedEstimate.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">お客様</p>
                <p>{selectedEstimate.customer_name}</p>
                {selectedEstimate.customer_company && (
                  <p className="text-xs text-gray-400">{selectedEstimate.customer_company}</p>
                )}
              </div>
              <div>
                <p className="text-gray-500">メール</p>
                <p>{selectedEstimate.customer_email}</p>
              </div>
              {selectedEstimate.customer_phone && (
                <div>
                  <p className="text-gray-500">電話番号</p>
                  <p>{selectedEstimate.customer_phone}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">パートナー</p>
                <p>{selectedEstimate.partner_name}</p>
              </div>
              <div>
                <p className="text-gray-500">ステータス</p>
                <Select
                  value={selectedEstimate.status}
                  onChange={(e) => updateStatus(selectedEstimate.id, e.target.value)}
                  options={[
                    { value: "draft", label: "下書き" },
                    { value: "sent", label: "送信済み" },
                    { value: "accepted", label: "承認済み" },
                    { value: "expired", label: "期限切れ" },
                  ]}
                />
              </div>
            </div>

            {selectedEstimate.notes && (
              <div className="text-sm">
                <p className="text-gray-500">備考</p>
                <p className="bg-gray-50 rounded p-2 mt-1">{selectedEstimate.notes}</p>
              </div>
            )}

            {/* 明細テーブル（管理者はbase_price, markup_amountも表示） */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">見積もり明細</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="text-left py-2">サービス</th>
                    <th className="text-left py-2">プラン</th>
                    <th className="text-right py-2">数量</th>
                    <th className="text-right py-2">基本価格</th>
                    <th className="text-right py-2">マークアップ</th>
                    <th className="text-right py-2">最終価格</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEstimate.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2">{item.product_name}</td>
                      <td className="py-2 text-gray-600">{item.tier_name ?? "-"}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.base_price)}</td>
                      <td className="py-2 text-right text-green-600">+{formatCurrency(item.markup_amount)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(item.final_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={5} className="py-2 text-right font-bold">月額合計</td>
                    <td className="py-2 text-right font-bold text-orange-500">
                      {formatCurrency(selectedEstimate.total_monthly)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="py-1 text-right text-gray-500">年額合計</td>
                    <td className="py-1 text-right font-medium">
                      {formatCurrency(selectedEstimate.total_yearly)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
