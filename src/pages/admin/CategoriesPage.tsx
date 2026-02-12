import { useState, useEffect, type FormEvent } from "react";
import { apiClient } from "../../api/client";
import type { ProductCategory, CategoryInput } from "@shared/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Table } from "../../components/ui/Table";

export function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState<CategoryInput>({ name: "", slug: "", display_order: 0 });
  const [error, setError] = useState("");

  // カテゴリ一覧を取得
  const fetchCategories = async () => {
    try {
      const res = await apiClient.get<ProductCategory[]>("/admin/categories");
      setCategories(res.data);
    } catch {
      setError("カテゴリの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // モーダルを開く（新規 or 編集）
  const openModal = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category);
      setForm({ name: category.name, slug: category.slug, display_order: category.display_order });
    } else {
      setEditingCategory(null);
      setForm({ name: "", slug: "", display_order: 0 });
    }
    setError("");
    setIsModalOpen(true);
  };

  // 名前からスラッグを自動生成
  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: editingCategory ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    }));
  };

  // カテゴリ保存
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editingCategory) {
        await apiClient.put(`/admin/categories/${editingCategory.id}`, form);
      } else {
        await apiClient.post("/admin/categories", form);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  // カテゴリ削除
  const handleDelete = async (id: string) => {
    if (!confirm("このカテゴリを削除しますか？関連する製品も削除されます。")) return;
    try {
      await apiClient.delete(`/admin/categories/${id}`);
      fetchCategories();
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
        <h1 className="text-2xl font-bold text-gray-900">カテゴリ管理</h1>
        <Button onClick={() => openModal()}>カテゴリ追加</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      <Card>
        <Table
          columns={[
            { header: "カテゴリ名", accessor: "name" },
            { header: "スラッグ", accessor: "slug" },
            { header: "表示順", accessor: "display_order" },
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
          data={categories}
          keyField="id"
          emptyMessage="カテゴリがありません"
        />
      </Card>

      {/* カテゴリ編集モーダル */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? "カテゴリ編集" : "カテゴリ追加"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="カテゴリ名"
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
          <Input
            label="表示順"
            type="number"
            value={form.display_order}
            onChange={(e) => setForm((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit">
              {editingCategory ? "更新" : "作成"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
