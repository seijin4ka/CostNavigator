import { Hono } from "hono";
import type { Env } from "../env";
import { EstimateService } from "../services/estimate-service";
import { SystemSettingsService } from "../services/system-settings-service";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { CreateEstimateSchema } from "../../shared/types";

const publicRoutes = new Hono<{ Bindings: Env }>();

// システム設定取得（ブランディング用、公開情報のみ）
publicRoutes.get("/system-settings", async (c) => {
  const service = new SystemSettingsService(c.env.DB);
  const settings = await service.getSettings();

  // 公開情報のみ返却（通貨・為替レートは表示に必要）
  return success(c, {
    brand_name: settings.brand_name,
    logo_url: settings.logo_url,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    footer_text: settings.footer_text,
    currency: settings.currency,
    exchange_rate: settings.exchange_rate,
  });
});

// 製品カタログ取得（販売価格で返却）
publicRoutes.get("/products", async (c) => {
  const service = new EstimateService(c.env.DB);
  const products = await service.getProducts();

  const publicProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    category_name: p.category_name,
    pricing_model: p.pricing_model,
    tiers: p.tiers.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      price: t.final_price,
      usage_unit: t.usage_unit,
      usage_unit_price: t.final_usage_unit_price,
      usage_included: t.usage_included,
    })),
  }));

  return success(c, publicProducts);
});

// 見積もり参照番号で取得
publicRoutes.get("/estimates/:ref", async (c) => {
  const service = new EstimateService(c.env.DB);
  const estimate = await service.getEstimateByReference(c.req.param("ref"));

  if (!estimate) {
    return error(c, "NOT_FOUND", "見積もりが見つかりません", 404);
  }

  // 公開情報のみ返却
  return success(c, {
    reference_number: estimate.reference_number,
    customer_name: estimate.customer_name,
    customer_phone: estimate.customer_phone,
    customer_company: estimate.customer_company,
    status: estimate.status,
    total_monthly: estimate.total_monthly,
    total_yearly: estimate.total_yearly,
    created_at: estimate.created_at,
    items: estimate.items.map((item) => ({
      product_name: item.product_name,
      tier_name: item.tier_name,
      quantity: item.quantity,
      usage_quantity: item.usage_quantity,
      final_price: item.final_price,
    })),
  });
});

// 見積もり作成
publicRoutes.post("/estimates", async (c) => {
  const data = await validateBody(c, CreateEstimateSchema);
  if (!data) return c.res;

  const service = new EstimateService(c.env.DB);
  const estimate = await service.createEstimate(data);
  return success(c, {
    reference_number: estimate.reference_number,
    total_monthly: estimate.total_monthly,
    total_yearly: estimate.total_yearly,
    items: estimate.items.map((item) => ({
      product_name: item.product_name,
      tier_name: item.tier_name,
      quantity: item.quantity,
      usage_quantity: item.usage_quantity,
      final_price: item.final_price,
    })),
  }, 201);
});

export default publicRoutes;
