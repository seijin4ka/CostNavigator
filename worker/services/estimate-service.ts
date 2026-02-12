import { PartnerRepository } from "../repositories/partner-repository";
import { ProductRepository } from "../repositories/product-repository";
import { TierRepository } from "../repositories/tier-repository";
import { MarkupRepository } from "../repositories/markup-repository";
import { EstimateRepository } from "../repositories/estimate-repository";
import type {
  Partner,
  ProductWithTiers,
  ProductTier,
  CreateEstimateRequest,
  EstimateWithItems,
} from "../../shared/types";
import { ESTIMATE_REF_PREFIX } from "../../shared/constants";

// マークアップ適用済みティア
export interface TierWithMarkupPrice extends ProductTier {
  final_price: number;
  final_usage_unit_price: number | null;
}

// マークアップ適用済み製品
export interface ProductWithMarkupPrices extends Omit<ProductWithTiers, "tiers"> {
  tiers: TierWithMarkupPrice[];
}

// 見積もりサービス
export class EstimateService {
  private partnerRepo: PartnerRepository;
  private productRepo: ProductRepository;
  private tierRepo: TierRepository;
  private markupRepo: MarkupRepository;
  private estimateRepo: EstimateRepository;

  constructor(private db: D1Database) {
    this.partnerRepo = new PartnerRepository(db);
    this.productRepo = new ProductRepository(db);
    this.tierRepo = new TierRepository(db);
    this.markupRepo = new MarkupRepository(db);
    this.estimateRepo = new EstimateRepository(db);
  }

  // パートナーのブランディング情報取得
  async getPartnerBranding(slug: string): Promise<Partner | null> {
    return this.partnerRepo.findBySlug(slug);
  }

  // マークアップ適用済み製品カタログ取得
  async getProductsWithMarkup(partner: Partner): Promise<ProductWithMarkupPrices[]> {
    const products = await this.productRepo.findAllWithTiers();

    // 有効な製品のみ、マークアップを適用
    const result: ProductWithMarkupPrices[] = [];
    for (const product of products) {
      if (!product.is_active) continue;

      const tiersWithMarkup: TierWithMarkupPrice[] = [];
      for (const tier of product.tiers) {
        if (!tier.is_active) continue;

        const markup = await this.markupRepo.resolveMarkup(
          partner.id,
          product.id,
          tier.id,
          partner.default_markup_type,
          partner.default_markup_value
        );

        // マークアップ適用後の価格を計算
        const finalPrice = this.applyMarkup(tier.base_price, markup.markup_type, markup.markup_value);
        const finalUsageUnitPrice = tier.usage_unit_price != null
          ? this.applyMarkup(tier.usage_unit_price, markup.markup_type, markup.markup_value)
          : null;

        tiersWithMarkup.push({
          ...tier,
          final_price: finalPrice,
          final_usage_unit_price: finalUsageUnitPrice,
        });
      }

      if (tiersWithMarkup.length > 0) {
        result.push({ ...product, tiers: tiersWithMarkup });
      }
    }

    return result;
  }

  // 見積もり作成
  async createEstimate(
    partner: Partner,
    request: CreateEstimateRequest
  ): Promise<EstimateWithItems> {
    const referenceNumber = this.generateReferenceNumber();
    let totalMonthly = 0;

    // 各アイテムの価格を計算
    const items: {
      product_id: string;
      product_name: string;
      tier_id: string | null;
      tier_name: string | null;
      quantity: number;
      usage_quantity: number | null;
      base_price: number;
      markup_amount: number;
      final_price: number;
    }[] = [];

    for (const item of request.items) {
      const product = await this.productRepo.findById(item.product_id);
      if (!product) continue;

      const tier = item.tier_id ? await this.tierRepo.findById(item.tier_id) : null;
      const basePrice = tier?.base_price ?? 0;

      // 従量料金の計算
      let usagePrice = 0;
      if (tier && tier.usage_unit_price != null && item.usage_quantity) {
        const billableUsage = Math.max(0, item.usage_quantity - (tier.usage_included ?? 0));
        usagePrice = billableUsage * tier.usage_unit_price;
      }

      const totalBasePrice = (basePrice + usagePrice) * item.quantity;

      // マークアップ解決・適用
      const markup = await this.markupRepo.resolveMarkup(
        partner.id,
        product.id,
        tier?.id ?? null,
        partner.default_markup_type,
        partner.default_markup_value
      );

      const finalPrice = this.applyMarkup(totalBasePrice, markup.markup_type, markup.markup_value);
      const markupAmount = finalPrice - totalBasePrice;

      items.push({
        product_id: product.id,
        product_name: product.name,
        tier_id: tier?.id ?? null,
        tier_name: tier?.name ?? null,
        quantity: item.quantity,
        usage_quantity: item.usage_quantity ?? null,
        base_price: totalBasePrice,
        markup_amount: markupAmount,
        final_price: finalPrice,
      });

      totalMonthly += finalPrice;
    }

    // 見積もり保存
    const estimateId = await this.estimateRepo.create({
      partner_id: partner.id,
      reference_number: referenceNumber,
      customer_name: request.customer_name,
      customer_email: request.customer_email,
      customer_phone: request.customer_phone ?? null,
      customer_company: request.customer_company ?? null,
      notes: request.notes ?? null,
      total_monthly: totalMonthly,
      total_yearly: totalMonthly * 12,
    });

    // 明細保存
    for (const item of items) {
      await this.estimateRepo.createItem(estimateId, item);
    }

    const estimate = await this.estimateRepo.findByIdWithItems(estimateId);
    if (!estimate) throw new Error("見積もりの作成に失敗しました");
    return estimate;
  }

  // 参照番号で見積もり取得
  async getEstimateByReference(referenceNumber: string): Promise<EstimateWithItems | null> {
    return this.estimateRepo.findByReferenceWithItems(referenceNumber);
  }

  // マークアップ適用
  private applyMarkup(basePrice: number, markupType: string, markupValue: number): number {
    if (markupType === "percentage") {
      return Math.round(basePrice * (1 + markupValue / 100) * 100) / 100;
    }
    // 固定額の場合
    return Math.round((basePrice + markupValue) * 100) / 100;
  }

  // 参照番号生成
  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${ESTIMATE_REF_PREFIX}-${timestamp}-${random}`;
  }
}
