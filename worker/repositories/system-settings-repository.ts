import type { SystemSettings } from "../../shared/types";

// システム設定リポジトリ
export class SystemSettingsRepository {
  constructor(private db: D1Database) {}

  // システム設定を取得（常にIDは'default'）
  async get(): Promise<SystemSettings | null> {
    return await this.db
      .prepare("SELECT * FROM system_settings WHERE id = ?")
      .bind("default")
      .first<SystemSettings>();
  }

  // システム設定を更新
  async update(data: {
    brand_name?: string;
    primary_partner_slug?: string | null;
    logo_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
    footer_text?: string;
  }): Promise<void> {
    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (data.brand_name !== undefined) {
      fields.push("brand_name = ?");
      values.push(data.brand_name);
    }
    if (data.primary_partner_slug !== undefined) {
      fields.push("primary_partner_slug = ?");
      values.push(data.primary_partner_slug);
    }
    if (data.logo_url !== undefined) {
      fields.push("logo_url = ?");
      values.push(data.logo_url);
    }
    if (data.primary_color !== undefined) {
      fields.push("primary_color = ?");
      values.push(data.primary_color);
    }
    if (data.secondary_color !== undefined) {
      fields.push("secondary_color = ?");
      values.push(data.secondary_color);
    }
    if (data.footer_text !== undefined) {
      fields.push("footer_text = ?");
      values.push(data.footer_text);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");

    await this.db
      .prepare(`UPDATE system_settings SET ${fields.join(", ")} WHERE id = ?`)
      .bind(...values, "default")
      .run();
  }

  // システム設定を初期化（存在しない場合のみ作成）
  async ensureExists(): Promise<void> {
    const existing = await this.get();
    if (!existing) {
      await this.db
        .prepare(
          `INSERT INTO system_settings (id, brand_name, footer_text)
           VALUES (?, ?, ?)`
        )
        .bind("default", "CostNavigator", "Powered by CostNavigator")
        .run();
    }
  }
}
