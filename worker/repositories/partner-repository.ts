import type { Partner } from "../../shared/types";
import { executeD1All, executeD1First, executeD1Query } from "../utils/d1-helper";

// パートナーリポジトリ
export class PartnerRepository {
  constructor(private db: D1Database) {}

  async findAll(): Promise<Partner[]> {
    const result = await executeD1All<Partner>(
      this.db,
      "SELECT * FROM partners ORDER BY name ASC"
    );
    return result;
  }

  async findById(id: string): Promise<Partner | null> {
    return await executeD1First<Partner>(
      this.db,
      "SELECT * FROM partners WHERE id = ?",
      [id]
    );
  }

  async findBySlug(slug: string): Promise<Partner | null> {
    return await executeD1First<Partner>(
      this.db,
      "SELECT * FROM partners WHERE slug = ? AND is_active = 1",
      [slug]
    );
  }

  async create(data: {
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    default_markup_type: string;
    default_markup_value: number;
    is_active: boolean;
  }): Promise<string> {
    const id = crypto.randomUUID();
    await executeD1Query(
      this.db,
      `INSERT INTO partners (id, name, slug, logo_url, primary_color, secondary_color, default_markup_type, default_markup_value, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.slug,
        data.logo_url,
        data.primary_color,
        data.secondary_color,
        data.default_markup_type,
        data.default_markup_value,
        data.is_active ? 1 : 0
      ],
      "作成",
      "パートナー"
    );
    return id;
  }

  async update(id: string, data: {
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    default_markup_type: string;
    default_markup_value: number;
    is_active: boolean;
  }): Promise<void> {
    await executeD1Query(
      this.db,
      `UPDATE partners SET name = ?, slug = ?, logo_url = ?, primary_color = ?, secondary_color = ?,
         default_markup_type = ?, default_markup_value = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?`,
      [
        data.name,
        data.slug,
        data.logo_url,
        data.primary_color,
        data.secondary_color,
        data.default_markup_type,
        data.default_markup_value,
        data.is_active ? 1 : 0,
        id
      ],
      "更新",
      "パートナー"
    );
  }

  async delete(id: string): Promise<void> {
    await executeD1Query(
      this.db,
      "DELETE FROM partners WHERE id = ?",
      [id],
      "削除",
      "パートナー"
    );
  }

  async count(): Promise<number> {
    const result = await executeD1First<{ count: number }>(
      this.db,
      "SELECT COUNT(*) as count FROM partners"
    );
    return result?.count ?? 0;
  }
}
