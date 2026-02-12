import type { Estimate, EstimateItem, EstimateWithItems } from "../../shared/types";

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

  async findById(id: string): Promise<Estimate | null> {
    return await this.db
      .prepare("SELECT * FROM estimates WHERE id = ?")
      .bind(id)
      .first<Estimate>();
  }

  async findByIdWithItems(id: string): Promise<EstimateWithItems | null> {
    const estimate = await this.db
      .prepare(`
        SELECT e.*, p.name as partner_name
        FROM estimates e
        JOIN partners p ON e.partner_id = p.id
        WHERE e.id = ?
      `)
      .bind(id)
      .first<Estimate & { partner_name: string }>();
    if (!estimate) return null;

    const items = await this.db
      .prepare("SELECT * FROM estimate_items WHERE estimate_id = ?")
      .bind(id)
      .all<EstimateItem>();

    return { ...estimate, items: items.results };
  }

  async findByReferenceWithItems(referenceNumber: string): Promise<EstimateWithItems | null> {
    const estimate = await this.db
      .prepare(`
        SELECT e.*, p.name as partner_name
        FROM estimates e
        JOIN partners p ON e.partner_id = p.id
        WHERE e.reference_number = ?
      `)
      .bind(referenceNumber)
      .first<Estimate & { partner_name: string }>();
    if (!estimate) return null;

    const items = await this.db
      .prepare("SELECT * FROM estimate_items WHERE estimate_id = ?")
      .bind(estimate.id)
      .all<EstimateItem>();

    return { ...estimate, items: items.results };
  }

  async create(data: {
    partner_id: string;
    reference_number: string;
    customer_name: string;
    customer_email: string;
    customer_company: string | null;
    notes: string | null;
    total_monthly: number;
    total_yearly: number;
  }): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO estimates (id, partner_id, reference_number, customer_name, customer_email, customer_company, notes, total_monthly, total_yearly)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.partner_id,
        data.reference_number,
        data.customer_name,
        data.customer_email,
        data.customer_company,
        data.notes,
        data.total_monthly,
        data.total_yearly
      )
      .run();
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
    await this.db
      .prepare(
        `INSERT INTO estimate_items (id, estimate_id, product_id, product_name, tier_id, tier_name, quantity, usage_quantity, base_price, markup_amount, final_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
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
      )
      .run();
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.db
      .prepare("UPDATE estimates SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, id)
      .run();
  }

  async count(): Promise<number> {
    const result = await this.db
      .prepare("SELECT COUNT(*) as count FROM estimates")
      .first<{ count: number }>();
    return result?.count ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM estimates WHERE id = ?")
      .bind(id)
      .run();
  }
}
