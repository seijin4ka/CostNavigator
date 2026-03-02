import type { Estimate, EstimateItem, EstimateWithItems } from "../../shared/types";
import { executeD1All, executeD1First, executeD1Query } from "../utils/d1-helper";

// 見積もりリポジトリ
export class EstimateRepository {
  constructor(private db: D1Database) {}

  async findAll(): Promise<Estimate[]> {
    const result = await this.db
      .prepare(`
        SELECT *
        FROM estimates
        ORDER BY created_at DESC
      `)
      .all<Estimate>();
    return result.results;
  }

  // 全見積もり + 明細を一括取得（CSVエクスポート用）
  async findAllWithItems(): Promise<EstimateWithItems[]> {
    const estimates = await this.findAll();
    if (estimates.length === 0) return [];

    const items = await this.db
      .prepare("SELECT * FROM estimate_items ORDER BY estimate_id, id")
      .all<EstimateItem>();

    // estimate_id でグルーピング
    const itemsByEstimate = new Map<string, EstimateItem[]>();
    for (const item of items.results) {
      const list = itemsByEstimate.get(item.estimate_id) ?? [];
      list.push(item);
      itemsByEstimate.set(item.estimate_id, list);
    }

    return estimates.map((e) => ({
      ...e,
      items: itemsByEstimate.get(e.id) ?? [],
    }));
  }

  // ページネーション付き見積もり一覧取得
  async findAllPaginated(
    page: number,
    limit: number
  ): Promise<{
    data: Estimate[];
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
        SELECT *
        FROM estimates
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(limit, offset)
      .all<Estimate>();

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
    const estimate = await executeD1First<Estimate>(
      this.db,
      "SELECT * FROM estimates WHERE id = ?",
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
    const estimate = await executeD1First<Estimate>(
      this.db,
      "SELECT * FROM estimates WHERE reference_number = ?",
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
      `INSERT INTO estimates (id, reference_number, customer_name, customer_email, customer_phone, customer_company, notes, total_monthly, total_yearly)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
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

  // 見積もりと明細をバッチで一括作成（アトミック処理）
  async createWithItems(
    data: {
      reference_number: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string | null;
      customer_company: string | null;
      notes: string | null;
      total_monthly: number;
      total_yearly: number;
    },
    items: {
      product_id: string;
      product_name: string;
      tier_id: string | null;
      tier_name: string | null;
      quantity: number;
      usage_quantity: number | null;
      base_price: number;
      markup_amount: number;
      final_price: number;
    }[]
  ): Promise<string> {
    const estimateId = crypto.randomUUID();

    // D1のbatch()を使用してアトミックに実行（全ステートメントが単一トランザクションで実行される）
    const statements: D1PreparedStatement[] = [];

    // 見積もりヘッダー
    statements.push(
      this.db
        .prepare(
          `INSERT INTO estimates (id, reference_number, customer_name, customer_email, customer_phone, customer_company, notes, total_monthly, total_yearly)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          estimateId,
          data.reference_number,
          data.customer_name,
          data.customer_email,
          data.customer_phone,
          data.customer_company,
          data.notes,
          data.total_monthly,
          data.total_yearly
        )
    );

    // 見積もり明細
    for (const item of items) {
      const itemId = crypto.randomUUID();
      statements.push(
        this.db
          .prepare(
            `INSERT INTO estimate_items (id, estimate_id, product_id, product_name, tier_id, tier_name, quantity, usage_quantity, base_price, markup_amount, final_price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            itemId,
            estimateId,
            item.product_id,
            item.product_name,
            item.tier_id,
            item.tier_name,
            item.quantity,
            item.usage_quantity,
            item.base_price,
            item.markup_amount,
            item.final_price
          )
      );
    }

    await this.db.batch(statements);
    return estimateId;
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
    // 明細と見積もりをバッチで一括削除（ON DELETE CASCADEに依存せず明示的に削除）
    await this.db.batch([
      this.db.prepare("DELETE FROM estimate_items WHERE estimate_id = ?").bind(id),
      this.db.prepare("DELETE FROM estimates WHERE id = ?").bind(id),
    ]);
  }
}
