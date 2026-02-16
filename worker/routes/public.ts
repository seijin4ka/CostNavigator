import { Hono } from "hono";
import type { Env } from "../env";
import { EstimateService } from "../services/estimate-service";
import { SystemSettingsService } from "../services/system-settings-service";
import { validateBody } from "../utils/validation";
import { success, error } from "../utils/response";
import { CreateEstimateSchema } from "../../shared/types";

const publicRoutes = new Hono<{ Bindings: Env }>();

// 注意: ルート定義順序が重要。具体的なパス（/estimates/:ref, /system-settings）を
// 汎用パターン（/:partnerSlug）より前に配置すること。

// システム設定取得（ブランディング用、公開情報のみ）
publicRoutes.get("/system-settings", async (c) => {
  const service = new SystemSettingsService(c.env.DB);
  const settings = await service.getSettings();

  // 公開情報のみ返却
  return success(c, {
    brand_name: settings.brand_name,
    primary_partner_slug: settings.primary_partner_slug,
    logo_url: settings.logo_url,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    footer_text: settings.footer_text,
  });
});

// 製品カタログ取得（マークアップなし、パートナー未設定時用）
publicRoutes.get("/products", async (c) => {
  const service = new EstimateService(c.env.DB);
  // マークアップなしの基本価格で製品を取得
  const products = await service.getProductsWithoutMarkup();

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

// 見積もり参照番号で取得（/:partnerSlugより前に配置必須）
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
    partner_name: estimate.partner_name,
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

// パートナー情報取得（ブランディング用）
publicRoutes.get("/:partnerSlug", async (c) => {
  const service = new EstimateService(c.env.DB);
  const partner = await service.getPartnerBranding(c.req.param("partnerSlug"));

  if (!partner) {
    return error(c, "NOT_FOUND", "パートナーが見つかりません", 404);
  }

  // 公開情報のみ返却（マークアップ設定は非公開）
  return success(c, {
    name: partner.name,
    slug: partner.slug,
    logo_url: partner.logo_url,
    primary_color: partner.primary_color,
    secondary_color: partner.secondary_color,
  });
});

// マークアップ適用済み製品カタログ
publicRoutes.get("/:partnerSlug/products", async (c) => {
  const service = new EstimateService(c.env.DB);
  const partner = await service.getPartnerBranding(c.req.param("partnerSlug"));

  if (!partner) {
    return error(c, "NOT_FOUND", "パートナーが見つかりません", 404);
  }

  const products = await service.getProductsWithMarkup(partner);

  // 最終価格のみ返却（base_priceやmarkup_amountは非公開）
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

// 見積もり作成
publicRoutes.post("/:partnerSlug/estimates", async (c) => {
  const data = await validateBody(c, CreateEstimateSchema);
  if (!data) return c.res;

  const service = new EstimateService(c.env.DB);
  const partner = await service.getPartnerBranding(c.req.param("partnerSlug"));

  if (!partner) {
    return error(c, "NOT_FOUND", "パートナーが見つかりません", 404);
  }

  const estimate = await service.createEstimate(partner, data);
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
