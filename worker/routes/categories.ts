import { Hono } from "hono";
import type { Env } from "../env";
import { CategoryRepository } from "../repositories/category-repository";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { CategorySchema } from "../../shared/types";

const categories = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア適用
categories.use("*", authMiddleware);

// カテゴリ一覧
categories.get("/", async (c) => {
  const repo = new CategoryRepository(c.env.DB);
  const data = await repo.findAll();
  return success(c, data);
});

// カテゴリ詳細
categories.get("/:id", async (c) => {
  const repo = new CategoryRepository(c.env.DB);
  const category = await repo.findById(c.req.param("id"));
  if (!category) return error(c, "NOT_FOUND", "カテゴリが見つかりません", 404);
  return success(c, category);
});

// カテゴリ作成
categories.post("/", async (c) => {
  const data = await validateBody(c, CategorySchema);
  if (!data) return c.res;

  const repo = new CategoryRepository(c.env.DB);
  const id = await repo.create(data);
  const category = await repo.findById(id);
  return success(c, category, 201);
});

// カテゴリ更新
categories.put("/:id", async (c) => {
  const data = await validateBody(c, CategorySchema);
  if (!data) return c.res;

  const repo = new CategoryRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "カテゴリが見つかりません", 404);

  await repo.update(c.req.param("id"), data);
  const updated = await repo.findById(c.req.param("id"));
  return success(c, updated);
});

// カテゴリ削除
categories.delete("/:id", async (c) => {
  const repo = new CategoryRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "カテゴリが見つかりません", 404);

  // 製品で使用されていないか確認
  const usageCheck = await c.env.DB
    .prepare("SELECT COUNT(*) as count FROM products WHERE category_id = ?")
    .bind(c.req.param("id"))
    .first<{ count: number }>();

  if (usageCheck && usageCheck.count > 0) {
    return error(
      c,
      "CATEGORY_IN_USE",
      "このカテゴリは製品で使用されているため削除できません",
      400
    );
  }

  await repo.delete(c.req.param("id"));
  return success(c, { message: "カテゴリを削除しました" });
});

export default categories;
