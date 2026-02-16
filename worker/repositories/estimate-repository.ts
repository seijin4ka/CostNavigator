import type { Estimate, EstimateItem, EstimateWithItems } from "../../shared/types";
import { executeD1All, executeD1First, executeD1Query } from "../utils/d1-helper";

// 見積もりリポジトリ
export class EstimateRepository {
  constructor(private db: D1Database) {}

  async findAll(): Promise<(Estimate & { partner_name: string })[]> {
    const result = await this.db
      .prepare(`
        SELECT e.*, p.name as partner_name
        FROM estimates e
        JOIN partners p ON e.partner_id = p.id
        ORDER BY e.created_at DESC
      `)
      .all<Estimate & { partner_name: string }>();
    return result.results;
  }

  // ページネーション付き見積もり一覧取得
  async findAllPaginated(
    page: number,
    limit: number
  ): Promise<{
    data: (Estimate & { partner_name: string })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // 総数を取得
    const total = await this.count();

    // ページネーション適用
    const offset = (page - 1) * limit;
    const result = await this.db
      .prepare(`
        SELECT e.*, p.name as partner_name
        FROM estimates e
        JOIN partners p ON e.partner_id = p.id
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(limit, offset)
      .all<Estimate & { partner_name: string }>();

    const totalPages = Math.ceil(total / limit);

    return {
      data: result.results,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string): Promise<Estimate | null> {
    return await executeD1First<Estimate>(
      this.db,
      "SELECT * FROM estimates WHERE id = ?",
      [id]
    );
  }

  async findByIdWithItems(id: string): Promise<EstimateWithItems | null> {
    const estimate = await executeD1First<Estimate & { partner_name: string }>(
      this.db,
      `
        SELECT e.*, p.name as partner_name
        FROM estimates e
        JOIN partners p ON e.partner_id = p.id
        WHERE e.id = ?
      `,
      [id]
    );
    if (!estimate) return null;

    const items = await executeD1All<EstimateItem>(
      this.db,
      "SELECT * FROM estimate_items WHERE estimate_id = ?",
      [id]
    );

    return { ...estimate, items };
  }

  async findByReferenceWithItems(referenceNumber: string): Promise<EstimateWithItems | null> {
    const estimate = await executeD1First<Estimate & { partner_name: string }>(
      this.db,
      `
        SELECT e.*, p.name as partner_name
        FROM estimates e
        JOIN partners p ON e.partner_id = p.id
        WHERE e.reference_number = ?
      `,
      [referenceNumber]
    );
    if (!estimate) return null;

    const items = await executeD1All<EstimateItem>(
      this.db,
      "SELECT * FROM estimate_items WHERE estimate_id = ?",
      [estimate.id]
    );

    return { ...estimate, items };
  }

  async create(data: {
    partner_id: string;
    reference_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    customer_company: string | null;
    notes: string | null;
    total_monthly: number;
    total_yearly: number;
  }): Promise<string> {
    const id = crypto.randomUUID();
    await executeD1Query(
      this.db,
      `INSERT INTO estimates (id, partner_id, reference_number, customer_name, customer_email, customer_phone, customer_company, notes, total_monthly, total_yearly)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.partner_id,
        data.reference_number,
        data.customer_name,
        data.customer_email,
        data.customer_phone,
        data.customer_company,
        data.notes,
        data.total_monthly,
        data.total_yearly
      ],
      "作成",
      "見積もり"
    );
    return id;
  }

  async createItem(
    estimateId: string,
    data: {
      product_id: string;
      product_name: string;
      tier_id: string | null;
      tier_name: string | null;
      quantity: number;
      usage_quantity: number | null;
      base_price: number;
      markup_amount: number;
      final_price: number;
    }
  ): Promise<void> {
    const id = crypto.randomUUID();
    await executeD1Query(
      this.db,
      `INSERT INTO estimate_items (id, estimate_id, product_id, product_name, tier_id, tier_name, quantity, usage_quantity, base_price, markup_amount, final_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        estimateId,
        data.product_id,
        data.product_name,
        data.tier_id,
        data.tier_name,
        data.quantity,
        data.usage_quantity,
        data.base_price,
        data.markup_amount,
        data.final_price
      ],
      "作成",
      "見積もり項目"
    );
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await executeD1Query(
      this.db,
      "UPDATE estimates SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id],
      "更新",
      "見積もり"
    );
  }

  async count(): Promise<number> {
    const result = await executeD1First<{ count: number }>(
      this.db,
      "SELECT COUNT(*) as count FROM estimates"
    );
    return result?.count ?? 0;
  }

  async delete(id: string): Promise<void> {
    await executeD1Query(
      this.db,
      "DELETE FROM estimates WHERE id = ?",
      [id],
      "削除",
      "見積もり"
    );
  }
}
