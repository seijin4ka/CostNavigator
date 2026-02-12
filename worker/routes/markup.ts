import { Hono } from "hono";
import type { Env } from "../env";
import { MarkupRepository } from "../repositories/markup-repository";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { MarkupRuleSchema } from "../../shared/types";

const markup = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア適用
markup.use("*", authMiddleware);

// パートナーのマークアップルール一覧
markup.get("/:partnerId/markup-rules", async (c) => {
  const repo = new MarkupRepository(c.env.DB);
  const data = await repo.findByPartnerId(c.req.param("partnerId"));
  return success(c, data);
});

// マークアップルール作成
markup.post("/:partnerId/markup-rules", async (c) => {
  const data = await validateBody(c, MarkupRuleSchema);
  if (!data) return c.res;

  const repo = new MarkupRepository(c.env.DB);
  const id = await repo.create({
    partner_id: c.req.param("partnerId"),
    product_id: data.product_id ?? null,
    tier_id: data.tier_id ?? null,
    markup_type: data.markup_type,
    markup_value: data.markup_value,
  });
  const rule = await repo.findById(id);
  return success(c, rule, 201);
});

// マークアップルール更新
markup.put("/:partnerId/markup-rules/:ruleId", async (c) => {
  const data = await validateBody(c, MarkupRuleSchema);
  if (!data) return c.res;

  const repo = new MarkupRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("ruleId"));
  if (!existing) return error(c, "NOT_FOUND", "マークアップルールが見つかりません", 404);

  await repo.update(c.req.param("ruleId"), {
    markup_type: data.markup_type,
    markup_value: data.markup_value,
    product_id: data.product_id ?? null,
    tier_id: data.tier_id ?? null,
  });
  const updated = await repo.findById(c.req.param("ruleId"));
  return success(c, updated);
});

// マークアップルール削除
markup.delete("/:partnerId/markup-rules/:ruleId", async (c) => {
  const repo = new MarkupRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("ruleId"));
  if (!existing) return error(c, "NOT_FOUND", "マークアップルールが見つかりません", 404);

  await repo.delete(c.req.param("ruleId"));
  return success(c, { message: "マークアップルールを削除しました" });
});

export default markup;
