import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import type { Estimate, EstimateWithItems } from "@shared/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Table } from "../../components/ui/Table";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { DEFAULT_PAGE_LIMIT } from "@shared/constants";

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
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEstimates = async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<{
        data: Estimate[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/admin/estimates?page=${page}&limit=${DEFAULT_PAGE_LIMIT}`);
      setEstimates(res.data.data);
      setCurrentPage(res.data.page);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "見積もりの取得に失敗しました");
      } else {
        setError("見積もりの取得に失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimates(1);
  }, []);

  // 見積もり詳細を表示
  const showDetail = async (id: string) => {
    try {
      const res = await apiClient.get<EstimateWithItems>(`/admin/estimates/${id}`);
      setSelectedEstimate(res.data);
      setIsDetailModalOpen(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "見積もり詳細の取得に失敗しました");
      } else {
        setError("見積もり詳細の取得に失敗しました");
      }
    }
  };

  // ステータス更新
  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient.put(`/admin/estimates/${id}/status`, { status });
      fetchEstimates(currentPage);
      if (selectedEstimate?.id === id) {
        setSelectedEstimate((prev) => (prev ? { ...prev, status: status as Estimate["status"] } : null));
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "ステータスの更新に失敗しました");
      } else {
        setError("ステータスの更新に失敗しました");
      }
    }
  };

  // 見積もり削除
  const executeDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await apiClient.delete(`/admin/estimates/${deleteTargetId}`);
      // 削除後、現在のページが空になった場合は前のページへ
      const newTotal = total - 1;
      const newTotalPages = Math.ceil(newTotal / DEFAULT_PAGE_LIMIT);
      const targetPage = currentPage > newTotalPages ? Math.max(1, newTotalPages) : currentPage;
      fetchEstimates(targetPage);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "削除に失敗しました");
      } else {
        setError("削除に失敗しました");
      }
    } finally {
      setDeleteTargetId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // CSVエクスポート
  const handleExportCsv = async () => {
    try {
      const token = apiClient.getToken();
      const res = await fetch("/api/admin/estimates/csv", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) throw new Error("CSVエクスポートに失敗しました");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `estimates-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSVエクスポートに失敗しました");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">見積もり一覧</h1>
        <Button variant="secondary" size="sm" onClick={handleExportCsv}>
          CSVエクスポート
        </Button>
      </div>

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
                  <Button variant="danger" size="sm" onClick={() => setDeleteTargetId(row.id)}>
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

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 mt-4">
            <div className="text-sm text-gray-500">
              {total} 件中 {(currentPage - 1) * DEFAULT_PAGE_LIMIT + 1} - {Math.min(currentPage * DEFAULT_PAGE_LIMIT, total)} 件を表示
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchEstimates(currentPage - 1)}
                disabled={currentPage === 1}
              >
                前へ
              </Button>
              <span className="text-sm text-gray-600">
                ページ {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchEstimates(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                次へ
              </Button>
            </div>
          </div>
        )}
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

            {/* 明細テーブル */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">見積もり明細</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="text-left py-2">サービス</th>
                    <th className="text-left py-2">プラン</th>
                    <th className="text-right py-2">数量</th>
                    <th className="text-right py-2">基本価格</th>
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
                      <td className="py-2 text-right font-medium">{formatCurrency(item.final_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={4} className="py-2 text-right font-bold">月額合計</td>
                    <td className="py-2 text-right font-bold text-orange-500">
                      {formatCurrency(selectedEstimate.total_monthly)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-1 text-right text-gray-500">年額合計</td>
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

      {/* 削除確認モーダル */}
      <Modal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="削除確認"
        size="sm"
      >
        <p className="text-sm text-gray-700 mb-6">この見積もりを削除しますか？</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTargetId(null)}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={executeDelete}>
            削除
          </Button>
        </div>
      </Modal>
    </div>
  );
}
