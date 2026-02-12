import type { ProductCategory } from "../../shared/types";

// カテゴリリポジトリ
export class CategoryRepository {
  constructor(private db: D1Database) {}

  async findAll(): Promise<ProductCategory[]> {
    const result = await this.db
      .prepare("SELECT * FROM product_categories ORDER BY display_order ASC")
      .all<ProductCategory>();
    return result.results;
  }

  async findById(id: string): Promise<ProductCategory | null> {
    return await this.db
      .prepare("SELECT * FROM product_categories WHERE id = ?")
      .bind(id)
      .first<ProductCategory>();
  }

  async create(data: { name: string; slug: string; display_order: number }): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare("INSERT INTO product_categories (id, name, slug, display_order) VALUES (?, ?, ?, ?)")
      .bind(id, data.name, data.slug, data.display_order)
      .run();
    return id;
  }

  async update(id: string, data: { name: string; slug: string; display_order: number }): Promise<void> {
    await this.db
      .prepare("UPDATE product_categories SET name = ?, slug = ?, display_order = ? WHERE id = ?")
      .bind(data.name, data.slug, data.display_order, id)
      .run();
  }

  async delete(id: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM product_categories WHERE id = ?")
      .bind(id)
      .run();
  }
}
