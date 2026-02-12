import type { Product, ProductWithTiers, ProductTier } from "../../shared/types";

// 製品リポジトリ
export class ProductRepository {
  constructor(private db: D1Database) {}

  async findAll(): Promise<Product[]> {
    const result = await this.db
      .prepare("SELECT * FROM products ORDER BY name ASC")
      .all<Product>();
    return result.results;
  }

  async findById(id: string): Promise<Product | null> {
    return await this.db
      .prepare("SELECT * FROM products WHERE id = ?")
      .bind(id)
      .first<Product>();
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
    await this.db
      .prepare(
        "INSERT INTO products (id, category_id, name, slug, description, pricing_model, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(id, data.category_id, data.name, data.slug, data.description, data.pricing_model, data.is_active ? 1 : 0)
      .run();
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
    await this.db
      .prepare(
        "UPDATE products SET category_id = ?, name = ?, slug = ?, description = ?, pricing_model = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(data.category_id, data.name, data.slug, data.description, data.pricing_model, data.is_active ? 1 : 0, id)
      .run();
  }

  async delete(id: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM products WHERE id = ?")
      .bind(id)
      .run();
  }
}
