import { Hono } from "hono";
import type { Env } from "../env";
import { ProductRepository } from "../repositories/product-repository";
import { CategoryRepository } from "../repositories/category-repository";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { ProductSchema } from "../../shared/types";

const products = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア適用
products.use("*", authMiddleware);

// 製品一覧（ティア付き）
products.get("/", async (c) => {
  const repo = new ProductRepository(c.env.DB);
  const data = await repo.findAllWithTiers();
  return success(c, data);
});

// 製品詳細
products.get("/:id", async (c) => {
  const repo = new ProductRepository(c.env.DB);
  const product = await repo.findById(c.req.param("id"));
  if (!product) return error(c, "NOT_FOUND", "製品が見つかりません", 404);
  return success(c, product);
});

// 製品作成
products.post("/", async (c) => {
  const data = await validateBody(c, ProductSchema);
  if (!data) return c.res;

  // カテゴリIDの存在チェック
  const categoryRepo = new CategoryRepository(c.env.DB);
  const category = await categoryRepo.findById(data.category_id);
  if (!category) return error(c, "NOT_FOUND", "指定されたカテゴリが見つかりません", 404);

  const repo = new ProductRepository(c.env.DB);
  const id = await repo.create(data);
  const product = await repo.findById(id);
  return success(c, product, 201);
});

// 製品更新
products.put("/:id", async (c) => {
  const data = await validateBody(c, ProductSchema);
  if (!data) return c.res;

  const repo = new ProductRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "製品が見つかりません", 404);

  // カテゴリを変更する場合は存在チェック
  if (data.category_id !== existing.category_id) {
    const categoryRepo = new CategoryRepository(c.env.DB);
    const category = await categoryRepo.findById(data.category_id);
    if (!category) return error(c, "NOT_FOUND", "指定されたカテゴリが見つかりません", 404);
  }

  await repo.update(c.req.param("id"), data);
  const updated = await repo.findById(c.req.param("id"));
  return success(c, updated);
});

// 製品削除
products.delete("/:id", async (c) => {
  const repo = new ProductRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "製品が見つかりません", 404);

  // 見積もりで使用されていないか確認
  const usageCheck = await c.env.DB
    .prepare("SELECT COUNT(*) as count FROM estimate_items WHERE product_id = ?")
    .bind(c.req.param("id"))
    .first<{ count: number }>();

  if (usageCheck && usageCheck.count > 0) {
    return error(
      c,
      "PRODUCT_IN_USE",
      "この製品は見積もりで使用されているため削除できません。is_activeをfalseに設定してください。",
      400
    );
  }

  await repo.delete(c.req.param("id"));
  return success(c, { message: "製品を削除しました" });
});

export default products;
