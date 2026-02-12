import type { Partner } from "../../shared/types";

// パートナーリポジトリ
export class PartnerRepository {
  constructor(private db: D1Database) {}

  async findAll(): Promise<Partner[]> {
    const result = await this.db
      .prepare("SELECT * FROM partners ORDER BY name ASC")
      .all<Partner>();
    return result.results;
  }

  async findById(id: string): Promise<Partner | null> {
    return await this.db
      .prepare("SELECT * FROM partners WHERE id = ?")
      .bind(id)
      .first<Partner>();
  }

  async findBySlug(slug: string): Promise<Partner | null> {
    return await this.db
      .prepare("SELECT * FROM partners WHERE slug = ? AND is_active = 1")
      .bind(slug)
      .first<Partner>();
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
    await this.db
      .prepare(
        `INSERT INTO partners (id, name, slug, logo_url, primary_color, secondary_color, default_markup_type, default_markup_value, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.name,
        data.slug,
        data.logo_url,
        data.primary_color,
        data.secondary_color,
        data.default_markup_type,
        data.default_markup_value,
        data.is_active ? 1 : 0
      )
      .run();
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
    await this.db
      .prepare(
        `UPDATE partners SET name = ?, slug = ?, logo_url = ?, primary_color = ?, secondary_color = ?,
         default_markup_type = ?, default_markup_value = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        data.name,
        data.slug,
        data.logo_url,
        data.primary_color,
        data.secondary_color,
        data.default_markup_type,
        data.default_markup_value,
        data.is_active ? 1 : 0,
        id
      )
      .run();
  }

  async delete(id: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM partners WHERE id = ?")
      .bind(id)
      .run();
  }

  async count(): Promise<number> {
    const result = await this.db
      .prepare("SELECT COUNT(*) as count FROM partners")
      .first<{ count: number }>();
    return result?.count ?? 0;
  }
}
