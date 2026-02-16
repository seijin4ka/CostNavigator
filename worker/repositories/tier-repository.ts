import type { ProductTier } from "../../shared/types";
import { executeD1All, executeD1First, executeD1Query } from "../utils/d1-helper";

// ティアリポジトリ
export class TierRepository {
  constructor(private db: D1Database) {}

  async findByProductId(productId: string): Promise<ProductTier[]> {
    const result = await executeD1All<ProductTier>(
      this.db,
      "SELECT * FROM product_tiers WHERE product_id = ? ORDER BY display_order ASC",
      [productId]
    );
    return result;
  }

  async findById(id: string): Promise<ProductTier | null> {
    return await executeD1First<ProductTier>(
      this.db,
      "SELECT * FROM product_tiers WHERE id = ?",
      [id]
    );
  }

  // 複数のティアを一括取得（IDのリスト）
  async findByIds(ids: string[]): Promise<Map<string, ProductTier>> {
    if (ids.length === 0) return new Map();

    // SQLiteの制限を考慮して、IN句のプレースホルダーを生成
    const placeholders = ids.map(() => "?").join(",");
    const result = await this.db
      .prepare(`SELECT * FROM product_tiers WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all<ProductTier>();

    // IDをキーとしたMapに変換（高速な検索のため）
    const tierMap = new Map<string, ProductTier>();
    for (const tier of result.results) {
      tierMap.set(tier.id, tier);
    }
    return tierMap;
  }

  async create(data: {
    product_id: string;
    name: string;
    slug: string;
    base_price: number;
    usage_unit: string | null;
    usage_unit_price: number | null;
    usage_included: number | null;
    display_order: number;
    is_active: boolean;
  }): Promise<string> {
    const id = crypto.randomUUID();
    await executeD1Query(
      this.db,
      `INSERT INTO product_tiers (id, product_id, name, slug, base_price, usage_unit, usage_unit_price, usage_included, display_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.product_id,
        data.name,
        data.slug,
        data.base_price,
        data.usage_unit,
        data.usage_unit_price,
        data.usage_included,
        data.display_order,
        data.is_active ? 1 : 0
      ],
      "作成",
      "ティア"
    );
    return id;
  }

  async update(
    id: string,
    data: {
      name: string;
      slug: string;
      base_price: number;
      usage_unit: string | null;
      usage_unit_price: number | null;
      usage_included: number | null;
      display_order: number;
      is_active: boolean;
    }
  ): Promise<void> {
    await executeD1Query(
      this.db,
      `UPDATE product_tiers SET name = ?, slug = ?, base_price = ?, usage_unit = ?, usage_unit_price = ?, usage_included = ?, display_order = ?, is_active = ?
         WHERE id = ?`,
      [
        data.name,
        data.slug,
        data.base_price,
        data.usage_unit,
        data.usage_unit_price,
        data.usage_included,
        data.display_order,
        data.is_active ? 1 : 0,
        id
      ],
      "更新",
      "ティア"
    );
  }

  async delete(id: string): Promise<void> {
    await executeD1Query(
      this.db,
      "DELETE FROM product_tiers WHERE id = ?",
      [id],
      "削除",
      "ティア"
    );
  }
}
