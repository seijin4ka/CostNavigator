import { Hono } from "hono";
import type { Env } from "../env";
import { authMiddleware } from "../middleware/auth";
import { success } from "../utils/response";

const dashboard = new Hono<{ Bindings: Env }>();

dashboard.use("*", authMiddleware);

// ダッシュボード統計情報
dashboard.get("/stats", async (c) => {
  const db = c.env.DB;

  const [productsCount, categoriesCount, estimatesCount, recentEstimates, estimateTotals] =
    await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM products WHERE is_active = 1").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM categories").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM estimates").first<{ count: number }>(),
      db
        .prepare(`
          SELECT reference_number, customer_name, customer_company, total_monthly, status, created_at
          FROM estimates
          ORDER BY created_at DESC
          LIMIT 5
        `)
        .all(),
      db
        .prepare("SELECT SUM(total_monthly) as total_monthly FROM estimates")
        .first<{ total_monthly: number | null }>(),
    ]);

  return success(c, {
    products_count: productsCount?.count ?? 0,
    categories_count: categoriesCount?.count ?? 0,
    estimates_count: estimatesCount?.count ?? 0,
    total_revenue: estimateTotals?.total_monthly ?? 0,
    recent_estimates: recentEstimates.results,
  });
});

export default dashboard;
