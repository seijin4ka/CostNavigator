import { Hono } from "hono";
import type { Env } from "../env";
import { TierRepository } from "../repositories/tier-repository";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { TierSchema } from "../../shared/types";

const tiers = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア適用
tiers.use("*", authMiddleware);

// 製品のティア一覧
tiers.get("/product/:productId", async (c) => {
  const repo = new TierRepository(c.env.DB);
  const data = await repo.findByProductId(c.req.param("productId"));
  return success(c, data);
});

// ティア作成
tiers.post("/", async (c) => {
  const data = await validateBody(c, TierSchema);
  if (!data) return c.res;

  const repo = new TierRepository(c.env.DB);
  const id = await repo.create({
    ...data,
    selling_price: data.selling_price ?? null,
    usage_unit: data.usage_unit ?? null,
    usage_unit_price: data.usage_unit_price ?? null,
    selling_usage_unit_price: data.selling_usage_unit_price ?? null,
    usage_included: data.usage_included ?? null,
  });
  const tier = await repo.findById(id);
  return success(c, tier, 201);
});

// ティア更新
tiers.put("/:id", async (c) => {
  const data = await validateBody(c, TierSchema);
  if (!data) return c.res;

  const repo = new TierRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "ティアが見つかりません", 404);

  await repo.update(c.req.param("id"), {
    ...data,
    selling_price: data.selling_price ?? null,
    usage_unit: data.usage_unit ?? null,
    usage_unit_price: data.usage_unit_price ?? null,
    selling_usage_unit_price: data.selling_usage_unit_price ?? null,
    usage_included: data.usage_included ?? null,
  });
  const updated = await repo.findById(c.req.param("id"));
  return success(c, updated);
});

// ティア削除
tiers.delete("/:id", async (c) => {
  const repo = new TierRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "ティアが見つかりません", 404);

  await repo.delete(c.req.param("id"));
  return success(c, { message: "ティアを削除しました" });
});

export default tiers;
