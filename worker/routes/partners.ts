import { Hono } from "hono";
import type { Env } from "../env";
import { PartnerRepository } from "../repositories/partner-repository";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { PartnerSchema } from "../../shared/types";

const partners = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア適用
partners.use("*", authMiddleware);

// パートナー一覧
partners.get("/", async (c) => {
  const repo = new PartnerRepository(c.env.DB);
  const data = await repo.findAll();
  return success(c, data);
});

// パートナー詳細
partners.get("/:id", async (c) => {
  const repo = new PartnerRepository(c.env.DB);
  const partner = await repo.findById(c.req.param("id"));
  if (!partner) return error(c, "NOT_FOUND", "パートナーが見つかりません", 404);
  return success(c, partner);
});

// パートナー作成
partners.post("/", async (c) => {
  const data = await validateBody(c, PartnerSchema);
  if (!data) return c.res;

  const repo = new PartnerRepository(c.env.DB);
  const id = await repo.create({
    ...data,
    logo_url: data.logo_url ?? null,
  });
  const partner = await repo.findById(id);
  return success(c, partner, 201);
});

// パートナー更新
partners.put("/:id", async (c) => {
  const data = await validateBody(c, PartnerSchema);
  if (!data) return c.res;

  const repo = new PartnerRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "パートナーが見つかりません", 404);

  await repo.update(c.req.param("id"), {
    ...data,
    logo_url: data.logo_url ?? null,
  });
  const updated = await repo.findById(c.req.param("id"));
  return success(c, updated);
});

// パートナー削除
partners.delete("/:id", async (c) => {
  const repo = new PartnerRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "パートナーが見つかりません", 404);

  // システムパートナー（direct）は削除不可
  if (existing.slug === "direct") {
    return error(c, "SYSTEM_PARTNER_DELETION", "システムパートナーは削除できません", 400);
  }

  // 見積もりで使用されていないか確認
  const usageCheck = await c.env.DB
    .prepare("SELECT COUNT(*) as count FROM estimates WHERE partner_id = ?")
    .bind(c.req.param("id"))
    .first<{ count: number }>();

  if (usageCheck && usageCheck.count > 0) {
    return error(
      c,
      "PARTNER_IN_USE",
      "このパートナーは見積もりで使用されているため削除できません。is_activeをfalseに設定してください。",
      400
    );
  }

  await repo.delete(c.req.param("id"));
  return success(c, { message: "パートナーを削除しました" });
});

export default partners;
