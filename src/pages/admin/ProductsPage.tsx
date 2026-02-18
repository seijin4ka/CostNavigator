import { useState, useEffect, type FormEvent } from "react";
import { apiClient } from "../../api/client";
import type { ProductWithTiers, ProductCategory, ProductInput, TierInput } from "@shared/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";

const PRICING_MODELS = [
  { value: "tier", label: "ティア制" },
  { value: "usage", label: "従量制" },
  { value: "tier_plus_usage", label: "ティア＋従量" },
  { value: "custom", label: "カスタム" },
];

export function ProductsPage() {
  const [products, setProducts] = useState<ProductWithTiers[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithTiers | null>(null);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "product" | "tier"; id: string; message: string } | null>(null);

  const [productForm, setProductForm] = useState<ProductInput>({
    category_id: "",
    name: "",
    slug: "",
    description: "",
    pricing_model: "tier",
    is_active: true,
  });

  const [tierForm, setTierForm] = useState<TierInput>({
    product_id: "",
    name: "",
    slug: "",
    base_price: 0,
    selling_price: null,
    usage_unit: null,
    usage_unit_price: null,
    selling_usage_unit_price: null,
    usage_included: null,
    display_order: 0,
    is_active: true,
  });

  // データ取得
  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        apiClient.get<ProductWithTiers[]>("/admin/products"),
        apiClient.get<ProductCategory[]>("/admin/categories"),
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 製品モーダルを開く
  const openProductModal = (product?: ProductWithTiers) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        category_id: product.category_id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        pricing_model: product.pricing_model,
        is_active: !!product.is_active,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        category_id: categories[0]?.id ?? "",
        name: "",
        slug: "",
        description: "",
        pricing_model: "tier",
        is_active: true,
      });
    }
    setError("");
    setIsProductModalOpen(true);
  };

  // ティアモーダルを開く
  const openTierModal = (productId: string, tier?: ProductWithTiers["tiers"][0]) => {
    setSelectedProductId(productId);
    if (tier) {
      setEditingTierId(tier.id);
      setTierForm({
        product_id: productId,
        name: tier.name,
        slug: tier.slug,
        base_price: tier.base_price,
        selling_price: tier.selling_price,
        usage_unit: tier.usage_unit,
        usage_unit_price: tier.usage_unit_price,
        selling_usage_unit_price: tier.selling_usage_unit_price,
        usage_included: tier.usage_included,
        display_order: tier.display_order,
        is_active: !!tier.is_active,
      });
    } else {
      setEditingTierId(null);
      setTierForm({
        product_id: productId,
        name: "",
        slug: "",
        base_price: 0,
        selling_price: null,
        usage_unit: null,
        usage_unit_price: null,
        selling_usage_unit_price: null,
        usage_included: null,
        display_order: 0,
        is_active: true,
      });
    }
    setError("");
    setIsTierModalOpen(true);
  };

  // 名前からスラッグを自動生成
  const handleProductNameChange = (name: string) => {
    setProductForm((prev) => ({
      ...prev,
      name,
      slug: editingProduct ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    }));
  };

  const handleTierNameChange = (name: string) => {
    setTierForm((prev) => ({
      ...prev,
      name,
      slug: editingTierId ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    }));
  };

  // 製品保存
  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editingProduct) {
        await apiClient.put(`/admin/products/${editingProduct.id}`, productForm);
      } else {
        await apiClient.post("/admin/products", productForm);
      }
      setIsProductModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  // ティア保存
  const handleTierSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = { ...tierForm, product_id: selectedProductId };
      if (editingTierId) {
        await apiClient.put(`/admin/product-tiers/${editingTierId}`, data);
      } else {
        await apiClient.post("/admin/product-tiers", data);
      }
      setIsTierModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  // 削除確認モーダルを開く
  const confirmDeleteProduct = (id: string) => {
    setDeleteTarget({ type: "product", id, message: "この製品を削除しますか？関連するティアも削除されます。" });
  };

  const confirmDeleteTier = (id: string) => {
    setDeleteTarget({ type: "tier", id, message: "このティアを削除しますか？" });
  };

  // 削除実行
  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "product") {
        await apiClient.delete(`/admin/products/${deleteTarget.id}`);
      } else {
        await apiClient.delete(`/admin/product-tiers/${deleteTarget.id}`);
      }
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>;
  }

  // カテゴリごとに製品をグループ化
  const groupedProducts = categories.map((cat) => ({
    category: cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">製品管理</h1>
        <Button onClick={() => openProductModal()}>製品追加</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {groupedProducts.map(({ category, products: catProducts }) => (
          <Card key={category.id} title={category.name}>
            {catProducts.length === 0 ? (
              <p className="text-gray-400 text-sm">このカテゴリに製品はありません</p>
            ) : (
              <div className="space-y-4">
                {catProducts.map((product) => (
                  <div key={product.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        <p className="text-xs text-gray-500">
                          {product.slug} / {PRICING_MODELS.find((m) => m.value === product.pricing_model)?.label}
                          {!product.is_active && <span className="ml-2 text-red-500">無効</span>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openTierModal(product.id)}>
                          ティア追加
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openProductModal(product)}>
                          編集
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => confirmDeleteProduct(product.id)}>
                          削除
                        </Button>
                      </div>
                    </div>

                    {/* ティア一覧 */}
                    {product.tiers.length > 0 && (
                      <div className="mt-2 bg-gray-50 rounded-lg p-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500">
                              <th className="pb-2">ティア名</th>
                              <th className="pb-2">基本価格</th>
                              <th className="pb-2">販売価格</th>
                              <th className="pb-2">従量単位</th>
                              <th className="pb-2">単価</th>
                              <th className="pb-2">含有量</th>
                              <th className="pb-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {product.tiers.map((tier) => (
                              <tr key={tier.id}>
                                <td className="py-2">{tier.name}</td>
                                <td className="py-2">${tier.base_price}/月</td>
                                <td className="py-2">{tier.selling_price != null ? <span className="text-orange-600 font-medium">${tier.selling_price}/月</span> : <span className="text-gray-400">-</span>}</td>
                                <td className="py-2">{tier.usage_unit || "-"}</td>
                                <td className="py-2">{tier.usage_unit_price != null ? `$${tier.usage_unit_price}` : "-"}</td>
                                <td className="py-2">{tier.usage_included != null ? tier.usage_included.toLocaleString() : "-"}</td>
                                <td className="py-2 text-right">
                                  <Button variant="ghost" size="sm" onClick={() => openTierModal(product.id, tier)}>
                                    編集
                                  </Button>
                                  <Button variant="danger" size="sm" onClick={() => confirmDeleteTier(tier.id)}>
                                    削除
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* 製品編集モーダル */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? "製品編集" : "製品追加"}
      >
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <Select
            label="カテゴリ"
            value={productForm.category_id}
            onChange={(e) => setProductForm((prev) => ({ ...prev, category_id: e.target.value }))}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            label="製品名"
            value={productForm.name}
            onChange={(e) => handleProductNameChange(e.target.value)}
            required
          />
          <Input
            label="スラッグ"
            value={productForm.slug}
            onChange={(e) => setProductForm((prev) => ({ ...prev, slug: e.target.value }))}
            required
            pattern="^[a-z0-9-]+$"
          />
          <Input
            label="説明"
            value={productForm.description}
            onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <Select
            label="料金モデル"
            value={productForm.pricing_model}
            onChange={(e) => setProductForm((prev) => ({ ...prev, pricing_model: e.target.value as ProductInput["pricing_model"] }))}
            options={PRICING_MODELS}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={productForm.is_active}
              onChange={(e) => setProductForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">有効</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsProductModalOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit">{editingProduct ? "更新" : "作成"}</Button>
          </div>
        </form>
      </Modal>

      {/* ティア編集モーダル */}
      <Modal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        title={editingTierId ? "ティア編集" : "ティア追加"}
        size="lg"
      >
        <form onSubmit={handleTierSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ティア名"
              value={tierForm.name}
              onChange={(e) => handleTierNameChange(e.target.value)}
              required
            />
            <Input
              label="スラッグ"
              value={tierForm.slug}
              onChange={(e) => setTierForm((prev) => ({ ...prev, slug: e.target.value }))}
              required
              pattern="^[a-z0-9-]+$"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="基本価格（月額USD）"
              type="number"
              step="0.01"
              min="0"
              value={tierForm.base_price}
              onChange={(e) => setTierForm((prev) => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
              required
            />
            <Input
              label="販売価格（月額USD）"
              type="number"
              step="0.01"
              min="0"
              value={tierForm.selling_price ?? ""}
              onChange={(e) => setTierForm((prev) => ({ ...prev, selling_price: e.target.value ? parseFloat(e.target.value) : null }))}
              placeholder="未設定時は基本価格を使用"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="従量単位"
              value={tierForm.usage_unit ?? ""}
              onChange={(e) => setTierForm((prev) => ({ ...prev, usage_unit: e.target.value || null }))}
              placeholder="例: requests"
            />
            <Input
              label="含有量"
              type="number"
              min="0"
              value={tierForm.usage_included ?? ""}
              onChange={(e) => setTierForm((prev) => ({ ...prev, usage_included: e.target.value ? parseFloat(e.target.value) : null }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="従量単価（USD）"
              type="number"
              step="0.001"
              min="0"
              value={tierForm.usage_unit_price ?? ""}
              onChange={(e) => setTierForm((prev) => ({ ...prev, usage_unit_price: e.target.value ? parseFloat(e.target.value) : null }))}
            />
            <Input
              label="販売従量単価（USD）"
              type="number"
              step="0.001"
              min="0"
              value={tierForm.selling_usage_unit_price ?? ""}
              onChange={(e) => setTierForm((prev) => ({ ...prev, selling_usage_unit_price: e.target.value ? parseFloat(e.target.value) : null }))}
              placeholder="未設定時は従量単価を使用"
            />
          </div>
          <Input
            label="表示順"
            type="number"
            value={tierForm.display_order}
            onChange={(e) => setTierForm((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tierForm.is_active}
              onChange={(e) => setTierForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">有効</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsTierModalOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit">{editingTierId ? "更新" : "作成"}</Button>
          </div>
        </form>
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="削除確認"
        size="sm"
      >
        <p className="text-sm text-gray-700 mb-6">{deleteTarget?.message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
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
