import type { Product, ProductWithTiers, ProductTier } from "../../shared/types";
import { executeD1All, executeD1First, executeD1Query } from "../utils/d1-helper";

// 製品リポジトリ
export class ProductRepository {
  constructor(private db: D1Database) {}

  async findAll(): Promise<Product[]> {
    const result = await executeD1All<Product>(
      this.db,
      "SELECT * FROM products ORDER BY name ASC"
    );
    return result;
  }

  async findById(id: string): Promise<Product | null> {
    return await executeD1First<Product>(
      this.db,
      "SELECT * FROM products WHERE id = ?",
      [id]
    );
  }

  // 複数の製品を一括取得（IDのリスト）
  async findByIds(ids: string[]): Promise<Map<string, Product>> {
    if (ids.length === 0) return new Map();

    // SQLiteの制限を考慮して、IN句のプレースホルダーを生成
    const placeholders = ids.map(() => "?").join(",");
    const result = await this.db
      .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all<Product>();

    // IDをキーとしたMapに変換（高速な検索のため）
    const productMap = new Map<string, Product>();
    for (const product of result.results) {
      productMap.set(product.id, product);
    }
    return productMap;
  }

  // 製品一覧（カテゴリ名・ティア付き）
  async findAllWithTiers(): Promise<ProductWithTiers[]> {
    const products = await this.db
      .prepare(`
        SELECT p.*, pc.name as category_name
        FROM products p
        JOIN product_categories pc ON p.category_id = pc.id
        ORDER BY pc.display_order ASC, p.name ASC
      `)
      .all<Product & { category_name: string }>();

    const tiers = await this.db
      .prepare("SELECT * FROM product_tiers ORDER BY display_order ASC")
      .all<ProductTier>();

    // 製品ごとにティアを紐付け
    const tierMap = new Map<string, ProductTier[]>();
    for (const tier of tiers.results) {
      if (!tierMap.has(tier.product_id)) {
        tierMap.set(tier.product_id, []);
      }
      tierMap.get(tier.product_id)!.push(tier);
    }

    return products.results.map((p) => ({
      ...p,
      tiers: tierMap.get(p.id) ?? [],
    }));
  }

  async create(data: {
    category_id: string;
    name: string;
    slug: string;
    description: string;
    pricing_model: string;
    is_active: boolean;
  }): Promise<string> {
    const id = crypto.randomUUID();
    await executeD1Query(
      this.db,
      "INSERT INTO products (id, category_id, name, slug, description, pricing_model, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, data.category_id, data.name, data.slug, data.description, data.pricing_model, data.is_active ? 1 : 0],
      "作成",
      "製品"
    );
    return id;
  }

  async update(
    id: string,
    data: {
      category_id: string;
      name: string;
      slug: string;
      description: string;
      pricing_model: string;
      is_active: boolean;
    }
  ): Promise<void> {
    await executeD1Query(
      this.db,
      "UPDATE products SET category_id = ?, name = ?, slug = ?, description = ?, pricing_model = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?",
      [data.category_id, data.name, data.slug, data.description, data.pricing_model, data.is_active ? 1 : 0, id],
      "更新",
      "製品"
    );
  }

  async delete(id: string): Promise<void> {
    await executeD1Query(
      this.db,
      "DELETE FROM products WHERE id = ?",
      [id],
      "削除",
      "製品"
    );
  }
}
