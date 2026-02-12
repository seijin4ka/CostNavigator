import { Hono } from "hono";
import type { Env } from "../env";
import { EstimateRepository } from "../repositories/estimate-repository";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { UpdateEstimateStatusSchema } from "../../shared/types";

const estimates = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア適用
estimates.use("*", authMiddleware);

// 見積もり一覧（管理者用 - 全情報表示）
estimates.get("/", async (c) => {
  const repo = new EstimateRepository(c.env.DB);
  const data = await repo.findAll();
  return success(c, data);
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
