import { useState, useEffect, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import type { Partner, MarkupRuleWithNames, MarkupRuleInput, ProductWithTiers } from "@shared/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Table } from "../../components/ui/Table";

export function MarkupPage() {
  const { id: partnerId } = useParams<{ id: string }>();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [rules, setRules] = useState<MarkupRuleWithNames[]>([]);
  const [products, setProducts] = useState<ProductWithTiers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<MarkupRuleInput>({
    product_id: null,
    tier_id: null,
    markup_type: "percentage",
    markup_value: 10,
  });

  const fetchData = async () => {
    if (!partnerId) return;
    try {
      const [partnerRes, rulesRes, productsRes] = await Promise.all([
        apiClient.get<Partner>(`/admin/partners/${partnerId}`),
        apiClient.get<MarkupRuleWithNames[]>(`/admin/partners/${partnerId}/markup-rules`),
        apiClient.get<ProductWithTiers[]>("/admin/products"),
      ]);
      setPartner(partnerRes.data);
      setRules(rulesRes.data);
      setProducts(productsRes.data);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [partnerId]);

  const openModal = (rule?: MarkupRuleWithNames) => {
    if (rule) {
      setEditingRuleId(rule.id);
      setForm({
        product_id: rule.product_id,
        tier_id: rule.tier_id,
        markup_type: rule.markup_type,
        markup_value: rule.markup_value,
      });
    } else {
      setEditingRuleId(null);
      setForm({
        product_id: null,
        tier_id: null,
        markup_type: "percentage",
        markup_value: 10,
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  // 選択中の製品のティア一覧
  const selectedProductTiers = products.find((p) => p.id === form.product_id)?.tiers ?? [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editingRuleId) {
        await apiClient.put(`/admin/partners/${partnerId}/markup-rules/${editingRuleId}`, form);
      } else {
        await apiClient.post(`/admin/partners/${partnerId}/markup-rules`, form);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("このマークアップルールを削除しますか？")) return;
    try {
      await apiClient.delete(`/admin/partners/${partnerId}/markup-rules/${ruleId}`);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  // ルールの優先度を表示
  const getRulePriority = (rule: MarkupRuleWithNames): string => {
    if (rule.product_id && rule.tier_id) return "製品+ティア（最優先）";
    if (rule.product_id) return "製品レベル";
    return "全体";
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/partners">
          <Button variant="ghost" size="sm">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">マークアップルール設定</h1>
          <p className="text-sm text-gray-500">
            {partner?.name} - デフォルト:
            {partner?.default_markup_type === "percentage"
              ? ` ${partner.default_markup_value}%`
              : ` $${partner?.default_markup_value}`}
          </p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => openModal()}>ルール追加</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* 解決ロジック説明 */}
      <Card className="mb-6">
        <div className="text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-2">マークアップ解決の優先順位</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>パートナー + 製品 + ティア（最も具体的なルールが優先）</li>
            <li>パートナー + 製品（ティア指定なし）</li>
            <li>パートナーのデフォルトマークアップ設定</li>
          </ol>
        </div>
      </Card>

      <Card title="マークアップルール一覧">
        <Table
          columns={[
            { header: "対象製品", accessor: (row) => row.product_name ?? "（全製品）" },
            { header: "対象ティア", accessor: (row) => row.tier_name ?? "（全ティア）" },
            { header: "優先度", accessor: (row) => getRulePriority(row) },
            {
              header: "マークアップ",
              accessor: (row) =>
                row.markup_type === "percentage"
                  ? `${row.markup_value}%`
                  : `$${row.markup_value}`,
            },
            {
              header: "操作",
              accessor: (row) => (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openModal(row)}>
                    編集
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(row.id)}>
                    削除
                  </Button>
                </div>
              ),
            },
          ]}
          data={rules}
          keyField="id"
          emptyMessage="マークアップルールが設定されていません。デフォルトのマークアップが適用されます。"
        />
      </Card>

      {/* マークアップルール編集モーダル */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRuleId ? "マークアップルール編集" : "マークアップルール追加"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="対象製品"
            value={form.product_id ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                product_id: e.target.value || null,
                tier_id: null,
              }))
            }
            options={[
              { value: "", label: "（全製品 - デフォルト）" },
              ...products.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />

          {form.product_id && selectedProductTiers.length > 0 && (
            <Select
              label="対象ティア"
              value={form.tier_id ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, tier_id: e.target.value || null }))}
              options={[
                { value: "", label: "（全ティア）" },
                ...selectedProductTiers.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="マークアップ種別"
              value={form.markup_type}
              onChange={(e) => setForm((prev) => ({ ...prev, markup_type: e.target.value as "percentage" | "fixed" }))}
              options={[
                { value: "percentage", label: "パーセンテージ" },
                { value: "fixed", label: "固定額（USD）" },
              ]}
            />
            <Input
              label={form.markup_type === "percentage" ? "マークアップ (%)" : "マークアップ (USD)"}
              type="number"
              step="0.01"
              min="0"
              value={form.markup_value}
              onChange={(e) => setForm((prev) => ({ ...prev, markup_value: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit">{editingRuleId ? "更新" : "作成"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
