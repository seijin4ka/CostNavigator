import { Hono } from "hono";
import type { Env } from "../env";
import { ProductRepository } from "../repositories/product-repository";
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

  await repo.update(c.req.param("id"), data);
  const updated = await repo.findById(c.req.param("id"));
  return success(c, updated);
});

// 製品削除
products.delete("/:id", async (c) => {
  const repo = new ProductRepository(c.env.DB);
  const existing = await repo.findById(c.req.param("id"));
  if (!existing) return error(c, "NOT_FOUND", "製品が見つかりません", 404);

  await repo.delete(c.req.param("id"));
  return success(c, { message: "製品を削除しました" });
});

export default products;
