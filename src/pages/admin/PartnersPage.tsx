import { useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import type { Partner, PartnerInput } from "@shared/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Table } from "../../components/ui/Table";

export function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<PartnerInput>({
    name: "",
    slug: "",
    logo_url: null,
    primary_color: "#F6821F",
    secondary_color: "#1B1B1B",
    default_markup_type: "percentage",
    default_markup_value: 10,
    is_active: true,
  });

  const fetchPartners = async () => {
    try {
      const res = await apiClient.get<Partner[]>("/admin/partners");
      setPartners(res.data);
    } catch {
      setError("パートナーの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const openModal = (partner?: Partner) => {
    if (partner) {
      setEditingPartner(partner);
      setForm({
        name: partner.name,
        slug: partner.slug,
        logo_url: partner.logo_url,
        primary_color: partner.primary_color,
        secondary_color: partner.secondary_color,
        default_markup_type: partner.default_markup_type,
        default_markup_value: partner.default_markup_value,
        is_active: !!partner.is_active,
      });
    } else {
      setEditingPartner(null);
      setForm({
        name: "",
        slug: "",
        logo_url: null,
        primary_color: "#F6821F",
        secondary_color: "#1B1B1B",
        default_markup_type: "percentage",
        default_markup_value: 10,
        is_active: true,
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: editingPartner ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editingPartner) {
        await apiClient.put(`/admin/partners/${editingPartner.id}`, form);
      } else {
        await apiClient.post("/admin/partners", form);
      }
      setIsModalOpen(false);
      fetchPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このパートナーを削除しますか？関連するマークアップルールも削除されます。")) return;
    try {
      await apiClient.delete(`/admin/partners/${id}`);
      fetchPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">パートナー管理</h1>
        <Button onClick={() => openModal()}>パートナー追加</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      <Card>
        <Table
          columns={[
            { header: "パートナー名", accessor: "name" },
            { header: "スラッグ", accessor: "slug" },
            {
              header: "ブランドカラー",
              accessor: (row) => (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded border border-gray-200" style={{ backgroundColor: row.primary_color }} />
                  <div className="w-6 h-6 rounded border border-gray-200" style={{ backgroundColor: row.secondary_color }} />
                </div>
              ),
            },
            {
              header: "デフォルトマークアップ",
              accessor: (row) =>
                row.default_markup_type === "percentage"
                  ? `${row.default_markup_value}%`
                  : `$${row.default_markup_value}`,
            },
            {
              header: "状態",
              accessor: (row) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {row.is_active ? "有効" : "無効"}
                </span>
              ),
            },
            {
              header: "操作",
              accessor: (row) => (
                <div className="flex gap-2">
                  <Link to={`/admin/partners/${row.id}/markup`}>
                    <Button variant="ghost" size="sm">マークアップ</Button>
                  </Link>
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
          data={partners}
          keyField="id"
          emptyMessage="パートナーがありません"
        />
      </Card>

      {/* パートナー編集モーダル */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPartner ? "パートナー編集" : "パートナー追加"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="パートナー名"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
            <Input
              label="スラッグ"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              required
              pattern="^[a-z0-9-]+$"
            />
          </div>

          <Input
            label="ロゴURL"
            type="url"
            value={form.logo_url ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value || null }))}
            placeholder="https://example.com/logo.png"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="プライマリカラー"
              type="color"
              value={form.primary_color}
              onChange={(e) => setForm((prev) => ({ ...prev, primary_color: e.target.value }))}
            />
            <Input
              label="セカンダリカラー"
              type="color"
              value={form.secondary_color}
              onChange={(e) => setForm((prev) => ({ ...prev, secondary_color: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="デフォルトマークアップ種別"
              value={form.default_markup_type}
              onChange={(e) => setForm((prev) => ({ ...prev, default_markup_type: e.target.value as "percentage" | "fixed" }))}
              options={[
                { value: "percentage", label: "パーセンテージ" },
                { value: "fixed", label: "固定額" },
              ]}
            />
            <Input
              label="デフォルトマークアップ値"
              type="number"
              step="0.01"
              min="0"
              value={form.default_markup_value}
              onChange={(e) => setForm((prev) => ({ ...prev, default_markup_value: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">有効</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit">{editingPartner ? "更新" : "作成"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
