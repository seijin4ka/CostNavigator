import { Hono } from "hono";
import type { Env } from "../env";
import { EstimateRepository } from "../repositories/estimate-repository";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { UpdateEstimateStatusSchema } from "../../shared/types";
import { DEFAULT_PAGE_LIMIT } from "../../shared/constants";

const estimates = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア適用
estimates.use("*", authMiddleware);

// CSVエクスポート（全見積もり + 明細行）
estimates.get("/csv", async (c) => {
  const repo = new EstimateRepository(c.env.DB);
  const all = await repo.findAllWithItems();

  const STATUS_LABELS: Record<string, string> = {
    draft: "下書き",
    sent: "送信済み",
    accepted: "承認済み",
    expired: "期限切れ",
  };

  // BOM + ヘッダー行
  const header = "参照番号,お客様名,会社名,メールアドレス,電話番号,ステータス,作成日,サービス名,プラン名,数量,従量数,基本価格,販売価格,月額合計,年額合計";
  const rows: string[] = [];

  for (const e of all) {
    if (e.items.length === 0) {
      // 明細なしの見積もり（ヘッダー情報のみ）
      rows.push([
        e.reference_number,
        csvEscape(e.customer_name),
        csvEscape(e.customer_company ?? ""),
        e.customer_email,
        e.customer_phone ?? "",
        STATUS_LABELS[e.status] ?? e.status,
        e.created_at,
        "", "", "", "", "", "",
        e.total_monthly,
        e.total_yearly,
      ].join(","));
    } else {
      // 明細ごとに1行出力
      for (const item of e.items) {
        rows.push([
          e.reference_number,
          csvEscape(e.customer_name),
          csvEscape(e.customer_company ?? ""),
          e.customer_email,
          e.customer_phone ?? "",
          STATUS_LABELS[e.status] ?? e.status,
          e.created_at,
          csvEscape(item.product_name),
          csvEscape(item.tier_name ?? ""),
          item.quantity,
          item.usage_quantity ?? "",
          item.base_price,
          item.final_price,
          e.total_monthly,
          e.total_yearly,
        ].join(","));
      }
    }
  }

  const csv = "\uFEFF" + header + "\n" + rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="estimates-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// CSV用エスケープ（ダブルクォート、カンマ、改行を含む場合に囲む）
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// 見積もり一覧（管理者用 - 全情報表示、ページネーション対応）
estimates.get("/", async (c) => {
  const repo = new EstimateRepository(c.env.DB);

  // クエリパラメータからページ情報を取得
  const pageParam = c.req.query("page");
  const limitParam = c.req.query("limit");

  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10))) : DEFAULT_PAGE_LIMIT;

  const result = await repo.findAllPaginated(page, limit);
  return success(c, result);
});

// 見積もり詳細（管理者用 - base_price, markup_amount含む）
estimates.get("/:id", async (c) => {
  const repo = new EstimateRepository(c.env.DB);
  const estimate = await repo.findByIdWithItems(c.req.param("id"));
  if (!estimate) return error(c, "NOT_FOUND", "見積もりが見つかりません", 404);
  return success(c, estimate);
});

// 見積もりステータス更新
estimates.put("/:id/status", async (c) => {
  const data = await validateBody(c, UpdateEstimateStatusSchema);
  if (!data) return c.res;

  const repo = new EstimateRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "見積もりが見つかりません", 404);

  await repo.updateStatus(c.req.param("id"), data.status);
  return success(c, { message: "ステータスを更新しました" });
});

// 見積もり削除
estimates.delete("/:id", async (c) => {
  const repo = new EstimateRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "見積もりが見つかりません", 404);

  await repo.delete(c.req.param("id"));
  return success(c, { message: "見積もりを削除しました" });
});

export default estimates;
