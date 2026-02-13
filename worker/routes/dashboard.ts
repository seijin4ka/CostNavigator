import { Hono } from "hono";
import type { Env } from "../env";
import { authMiddleware } from "../middleware/auth";
import { success } from "../utils/response";

const dashboard = new Hono<{ Bindings: Env }>();

dashboard.use("*", authMiddleware);

// ダッシュボード統計情報
dashboard.get("/stats", async (c) => {
  const db = c.env.DB;

  const [productsCount, partnersCount, estimatesCount, recentEstimates, estimateTotals] =
    await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM products WHERE is_active = 1").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM partners WHERE is_active = 1").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM estimates").first<{ count: number }>(),
      db
        .prepare(`
          SELECT e.reference_number, e.customer_name, e.customer_company, e.total_amount, e.status, e.created_at, p.name as partner_name
          FROM estimates e
          JOIN partners p ON e.partner_id = p.id
          ORDER BY e.created_at DESC
          LIMIT 5
        `)
        .all(),
      db
        .prepare("SELECT SUM(total_amount) as total_amount FROM estimates")
        .first<{ total_amount: number | null }>(),
    ]);

  return success(c, {
    products_count: productsCount?.count ?? 0,
    partners_count: partnersCount?.count ?? 0,
    estimates_count: estimatesCount?.count ?? 0,
    total_revenue: estimateTotals?.total_amount ?? 0,
    recent_estimates: recentEstimates.results,
  });
});

export default dashboard;
