import { ProductRepository } from "../repositories/product-repository";
import { TierRepository } from "../repositories/tier-repository";
import { EstimateRepository } from "../repositories/estimate-repository";
import { SystemSettingsRepository } from "../repositories/system-settings-repository";
import type {
  ProductWithTiers,
  ProductTier,
  CreateEstimateRequest,
  EstimateWithItems,
} from "../../shared/types";
import { ESTIMATE_REF_PREFIX, RETRY } from "../../shared/constants";
import { KVCache, CacheKeys, PRODUCT_CACHE_TTL, CacheTags } from "../utils/kv-cache";
import { NotFoundError, ValidationError } from "../errors/app-error";

// 販売価格適用済みティア
export interface TierWithSellingPrice extends ProductTier {
  final_price: number;
  final_usage_unit_price: number | null;
}

// 販売価格適用済み製品
export interface ProductWithSellingPrices extends Omit<ProductWithTiers, "tiers"> {
  tiers: TierWithSellingPrice[];
}

// 見積もりサービス
export class EstimateService {
  private productRepo: ProductRepository;
  private tierRepo: TierRepository;
  private estimateRepo: EstimateRepository;
  private settingsRepo: SystemSettingsRepository;
  private cache: KVCache;

  constructor(db: D1Database, kvNamespace?: KVNamespace) {
    this.productRepo = new ProductRepository(db);
    this.tierRepo = new TierRepository(db);
    this.estimateRepo = new EstimateRepository(db);
    this.settingsRepo = new SystemSettingsRepository(db);
    this.cache = kvNamespace ? new KVCache(kvNamespace) : KVCache.createNull();
  }

  // 製品カタログ取得（selling_price優先、キャッシュ利用）
  async getProducts(): Promise<ProductWithSellingPrices[]> {
    return await this.cache.getOrSet(
      CacheKeys.products(),
      async () => this.buildProducts(),
      { ttl: PRODUCT_CACHE_TTL, tags: [CacheTags.products] }
    );
  }

  // マークアップ設定を取得
  private async getMarkupSettings(): Promise<{ enabled: boolean; percentage: number }> {
    const settings = await this.settingsRepo.get();
    return {
      enabled: !!(settings?.markup_enabled),
      percentage: settings?.default_markup_percentage ?? 20,
    };
  }

  // マークアップを適用した価格を計算
  private applyMarkup(basePrice: number, markupEnabled: boolean, markupPercentage: number): number {
    if (!markupEnabled) return basePrice;
    return Math.round(basePrice * (1 + markupPercentage / 100) * 100) / 100;
  }

  // 製品カタログの構築（内部メソッド）
  private async buildProducts(): Promise<ProductWithSellingPrices[]> {
    const [products, markup] = await Promise.all([
      this.productRepo.findAllWithTiers(),
      this.getMarkupSettings(),
    ]);

    // 有効な製品のみ、selling_price優先・未設定時はマークアップ適用で価格を返す
    const result: ProductWithSellingPrices[] = [];
    for (const product of products) {
      if (!product.is_active) continue;

      const tiersWithPrice: TierWithSellingPrice[] = [];
      for (const tier of product.tiers) {
        if (!tier.is_active) continue;

        // selling_priceが設定されている場合はそれを優先、未設定時はbase_priceにマークアップを適用
        const finalPrice = tier.selling_price
          ?? this.applyMarkup(tier.base_price, markup.enabled, markup.percentage);

        // 従量単価も同様
        const finalUsageUnitPrice = tier.selling_usage_unit_price
          ?? (tier.usage_unit_price != null
            ? this.applyMarkup(tier.usage_unit_price, markup.enabled, markup.percentage)
            : null);

        tiersWithPrice.push({
          ...tier,
          final_price: finalPrice,
          final_usage_unit_price: finalUsageUnitPrice,
        });
      }

      if (tiersWithPrice.length > 0) {
        result.push({ ...product, tiers: tiersWithPrice });
      }
    }

    return result;
  }

  // 見積もり作成
  async createEstimate(
    request: CreateEstimateRequest
  ): Promise<EstimateWithItems> {
    // N+1クエリを避けるため、必要な製品とティアを一括取得
    const productIds = [...new Set(request.items.map(item => item.product_id))];
    const tierIds = [...new Set(request.items.map(item => item.tier_id).filter((id): id is string => id != null))];

    const [productMap, tierMap, markup] = await Promise.all([
      this.productRepo.findByIds(productIds),
      this.tierRepo.findByIds(tierIds),
      this.getMarkupSettings(),
    ]);

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
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new NotFoundError("製品", item.product_id);
      }

      // 非アクティブな製品は見積もりに追加不可
      if (!product.is_active) {
        throw new ValidationError(`製品「${product.name}」は現在利用できません`);
      }

      const tier = item.tier_id ? tierMap.get(item.tier_id) ?? null : null;
      // ティアIDが指定されているのにティアが見つからない場合はエラー
      if (item.tier_id && !tier) {
        throw new NotFoundError("ティア", item.tier_id);
      }

      // 非アクティブなティアは見積もりに追加不可
      if (tier && !tier.is_active) {
        throw new ValidationError(`プラン「${tier.name}」は現在利用できません`);
      }

      // 販売価格を使用（selling_price優先、未設定時はbase_priceにマークアップ適用）
      const unitPrice = tier
        ? (tier.selling_price ?? this.applyMarkup(tier.base_price, markup.enabled, markup.percentage))
        : 0;

      // 従量料金の計算（selling_usage_unit_price優先、未設定時はマークアップ適用）
      let usagePrice = 0;
      if (tier && item.usage_quantity) {
        const usageUnitPrice = tier.selling_usage_unit_price
          ?? (tier.usage_unit_price != null
            ? this.applyMarkup(tier.usage_unit_price, markup.enabled, markup.percentage)
            : null);
        if (usageUnitPrice != null) {
          const billableUsage = Math.max(0, item.usage_quantity - (tier.usage_included ?? 0));
          usagePrice = billableUsage * usageUnitPrice;
        }
      }

      const finalPrice = Math.round((unitPrice + usagePrice) * item.quantity * 100) / 100;

      items.push({
        product_id: product.id,
        product_name: product.name,
        tier_id: tier?.id ?? null,
        tier_name: tier?.name ?? null,
        quantity: item.quantity,
        usage_quantity: item.usage_quantity ?? null,
        base_price: finalPrice,
        markup_amount: 0,
        final_price: finalPrice,
      });

      totalMonthly += finalPrice;
    }

    // D1のbatch()を使用してアトミックに見積もりと明細を一括作成
    const referenceNumber = this.generateReferenceNumber();
    let estimateId: string;

    try {
      estimateId = await this.estimateRepo.createWithItems(
        {
          reference_number: referenceNumber,
          customer_name: request.customer_name,
          customer_email: request.customer_email,
          customer_phone: request.customer_phone ?? null,
          customer_company: request.customer_company ?? null,
          notes: request.notes ?? null,
          total_monthly: Math.round(totalMonthly * 100) / 100,
          total_yearly: Math.round(totalMonthly * 12 * 100) / 100,
        },
        items
      );
    } catch (err) {
      // UNIQUE制約違反（参照番号の衝突）の場合はリトライ
      const error = err as Error;
      if (error.message?.includes('UNIQUE')) {
        estimateId = await this.createEstimateWithRetry(
          {
            customer_name: request.customer_name,
            customer_email: request.customer_email,
            customer_phone: request.customer_phone ?? null,
            customer_company: request.customer_company ?? null,
            notes: request.notes ?? null,
            total_monthly: Math.round(totalMonthly * 100) / 100,
            total_yearly: Math.round(totalMonthly * 12 * 100) / 100,
          },
          items
        );
      } else {
        throw err;
      }
    }

    const estimate = await this.estimateRepo.findByIdWithItems(estimateId);
    if (!estimate) throw new Error("見積もりの作成に失敗しました");
    return estimate;
  }

  // 参照番号で見積もり取得
  async getEstimateByReference(referenceNumber: string): Promise<EstimateWithItems | null> {
    return this.estimateRepo.findByReferenceWithItems(referenceNumber);
  }

  // 参照番号生成（暗号学的に安全なランダム値を使用）
  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    // crypto.getRandomValues()で暗号学的に安全な8バイトランダム値を生成
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const random = Array.from(randomBytes)
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, 8)
      .toUpperCase();
    return `${ESTIMATE_REF_PREFIX}-${timestamp}-${random}`;
  }

  // 参照番号の衝突を避けるため、リトライ機能付きでestimateと明細をアトミックに作成
  private async createEstimateWithRetry(
    data: Omit<Parameters<typeof this.estimateRepo.create>[0], 'reference_number'>,
    items: {
      product_id: string;
      product_name: string;
      tier_id: string | null;
      tier_name: string | null;
      quantity: number;
      usage_quantity: number | null;
      base_price: number;
      markup_amount: number;
      final_price: number;
    }[],
    maxAttempts = RETRY.MAX_ATTEMPTS
  ): Promise<string> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const referenceNumber = this.generateReferenceNumber();
      try {
        const estimateId = await this.estimateRepo.createWithItems(
          { ...data, reference_number: referenceNumber },
          items
        );
        return estimateId;
      } catch (err) {
        // UNIQUE制約違反の場合のみリトライ
        const error = err as Error;
        if (error.message?.includes('UNIQUE') && attempt < maxAttempts) {
          // 次のリトライまで少し待つ（ミリ秒単位の衝突を避ける）
          await new Promise(resolve => setTimeout(resolve, RETRY.DELAY_MS));
          continue;
        }
        // UNIQUE制約以外のエラーまたは最終試行の場合は再スロー
        throw err;
      }
    }
    throw new Error(`参照番号の生成に${maxAttempts}回失敗しました`);
  }

}
