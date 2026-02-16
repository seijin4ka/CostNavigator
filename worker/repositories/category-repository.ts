import type { ProductCategory } from "../../shared/types";
import { executeD1All, executeD1First, executeD1Query } from "../utils/d1-helper";

// カテゴリリポジトリ
export class CategoryRepository {
  constructor(private db: D1Database) {}

  async findAll(): Promise<ProductCategory[]> {
    const result = await executeD1All<ProductCategory>(
      this.db,
      "SELECT * FROM product_categories ORDER BY display_order ASC"
    );
    return result;
  }

  async findById(id: string): Promise<ProductCategory | null> {
    return await executeD1First<ProductCategory>(
      this.db,
      "SELECT * FROM product_categories WHERE id = ?",
      [id]
    );
  }

  async create(data: { name: string; slug: string; display_order: number }): Promise<string> {
    const id = crypto.randomUUID();
    await executeD1Query(
      this.db,
      "INSERT INTO product_categories (id, name, slug, display_order) VALUES (?, ?, ?, ?)",
      [id, data.name, data.slug, data.display_order],
      "作成",
      "カテゴリ"
    );
    return id;
  }

  async update(id: string, data: { name: string; slug: string; display_order: number }): Promise<void> {
    await executeD1Query(
      this.db,
      "UPDATE product_categories SET name = ?, slug = ?, display_order = ? WHERE id = ?",
      [data.name, data.slug, data.display_order, id],
      "更新",
      "カテゴリ"
    );
  }

  async delete(id: string): Promise<void> {
    await executeD1Query(
      this.db,
      "DELETE FROM product_categories WHERE id = ?",
      [id],
      "削除",
      "カテゴリ"
    );
  }
}
