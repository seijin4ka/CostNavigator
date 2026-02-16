import type { MarkupRule, MarkupRuleWithNames, ResolvedMarkup } from "../../shared/types";
import { executeD1First, executeD1Query } from "../utils/d1-helper";

// マークアップルールリポジトリ
export class MarkupRepository {
  constructor(private db: D1Database) {}

  // パートナーのマークアップルール一覧（製品名・ティア名付き）
  async findByPartnerId(partnerId: string): Promise<MarkupRuleWithNames[]> {
    const result = await this.db
      .prepare(`
        SELECT mr.*,
          p.name as product_name,
          pt.name as tier_name
        FROM markup_rules mr
        LEFT JOIN products p ON mr.product_id = p.id
        LEFT JOIN product_tiers pt ON mr.tier_id = pt.id
        WHERE mr.partner_id = ?
        ORDER BY mr.product_id ASC, mr.tier_id ASC
      `)
      .bind(partnerId)
      .all<MarkupRuleWithNames>();
    return result.results;
  }

  async findById(id: string): Promise<MarkupRule | null> {
    return await executeD1First<MarkupRule>(
      this.db,
      "SELECT * FROM markup_rules WHERE id = ?",
      [id]
    );
  }

  async create(data: {
    partner_id: string;
    product_id: string | null;
    tier_id: string | null;
    markup_type: string;
    markup_value: number;
  }): Promise<string> {
    const id = crypto.randomUUID();
    await executeD1Query(
      this.db,
      `INSERT INTO markup_rules (id, partner_id, product_id, tier_id, markup_type, markup_value)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.partner_id, data.product_id, data.tier_id, data.markup_type, data.markup_value],
      "作成",
      "マークアップルール"
    );
    return id;
  }

  async update(id: string, data: {
    markup_type: string;
    markup_value: number;
    product_id: string | null;
    tier_id: string | null;
  }): Promise<void> {
    await executeD1Query(
      this.db,
      `UPDATE markup_rules SET markup_type = ?, markup_value = ?, product_id = ?, tier_id = ?, updated_at = datetime('now')
         WHERE id = ?`,
      [data.markup_type, data.markup_value, data.product_id, data.tier_id, id],
      "更新",
      "マークアップルール"
    );
  }

  async delete(id: string): Promise<void> {
    await executeD1Query(
      this.db,
      "DELETE FROM markup_rules WHERE id = ?",
      [id],
      "削除",
      "マークアップルール"
    );
  }

  // マークアップ解決（優先度順カスケード）
  // 1. パートナー + 製品 + ティア（最も具体的）
  // 2. パートナー + 製品
  // 3. パートナーのデフォルト設定（フォールバック）
  async resolveMarkup(
    partnerId: string,
    productId: string,
    tierId: string | null,
    defaultMarkupType: string,
    defaultMarkupValue: number
  ): Promise<ResolvedMarkup> {
    // ティア指定がある場合、最も具体的なルールを探す
    if (tierId) {
      const tierRule = await executeD1First<MarkupRule>(
        this.db,
        "SELECT * FROM markup_rules WHERE partner_id = ? AND product_id = ? AND tier_id = ?",
        [partnerId, productId, tierId]
      );
      if (tierRule) {
        return {
          markup_type: tierRule.markup_type as ResolvedMarkup["markup_type"],
          markup_value: tierRule.markup_value,
          source: "product_tier",
        };
      }
    }

    // 製品レベルのルールを探す
    const productRule = await executeD1First<MarkupRule>(
      this.db,
      "SELECT * FROM markup_rules WHERE partner_id = ? AND product_id = ? AND tier_id IS NULL",
      [partnerId, productId]
    );
    if (productRule) {
      return {
        markup_type: productRule.markup_type as ResolvedMarkup["markup_type"],
        markup_value: productRule.markup_value,
        source: "product",
      };
    }

    // パートナーデフォルトにフォールバック
    return {
      markup_type: defaultMarkupType as ResolvedMarkup["markup_type"],
      markup_value: defaultMarkupValue,
      source: "partner_default",
    };
  }
}
