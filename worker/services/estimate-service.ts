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
import { ESTIMATE_REF_PREFIX, RETRY } from "../../shared/constants";
import { KVCache, CacheKeys, PRODUCT_CACHE_TTL, PARTNER_CACHE_TTL, CacheTags } from "../utils/kv-cache";

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
  private cache: KVCache;

  constructor(private db: D1Database, private cache?: KVNamespace) {
    this.partnerRepo = new PartnerRepository(db);
    this.productRepo = new ProductRepository(db);
    this.tierRepo = new TierRepository(db);
    this.markupRepo = new MarkupRepository(db);
    this.estimateRepo = new EstimateRepository(db);
    this.cache = cache ? new KVCache(cache) : this.createNullCache();
  }

  // パートナーのブランディング情報取得（キャッシュ利用）
  async getPartnerBranding(slug: string): Promise<Partner | null> {
    return await this.cache.getOrSet(
      CacheKeys.partnerBySlug(slug),
      () => this.partnerRepo.findBySlug(slug),
      { ttl: PARTNER_CACHE_TTL, tags: [CacheTags.partners] }
    );
  }

  // マークアップなし製品カタログ取得（パートナー未設定時用、キャッシュ利用）
  async getProductsWithoutMarkup(): Promise<ProductWithMarkupPrices[]> {
    return await this.cache.getOrSet(
      CacheKeys.products(),
      async () => this.buildProductsWithoutMarkup(),
      { ttl: PRODUCT_CACHE_TTL, tags: [CacheTags.products] }
    );
  }

  // マークアップなし製品カタログの構築（内部メソッド）
  private async buildProductsWithoutMarkup(): Promise<ProductWithMarkupPrices[]> {
    const products = await this.productRepo.findAllWithTiers();

    // 有効な製品のみ、基本価格をそのまま使用
    const result: ProductWithMarkupPrices[] = [];
    for (const product of products) {
      if (!product.is_active) continue;

      const tiersWithPrice: TierWithMarkupPrice[] = [];
      for (const tier of product.tiers) {
        if (!tier.is_active) continue;

        tiersWithPrice.push({
          ...tier,
          final_price: tier.base_price,
          final_usage_unit_price: tier.usage_unit_price,
        });
      }

      if (tiersWithPrice.length > 0) {
        result.push({ ...product, tiers: tiersWithPrice });
      }
    }

    return result;
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
    // N+1クエリを避けるため、必要な製品とティアを一括取得
    const productIds = [...new Set(request.items.map(item => item.product_id))];
    const tierIds = [...new Set(request.items.map(item => item.tier_id).filter((id): id is string => id != null))];

    const [productMap, tierMap] = await Promise.all([
      this.productRepo.findByIds(productIds),
      this.tierRepo.findByIds(tierIds),
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
        throw new Error(`製品ID ${item.product_id} が見つかりません`);
      }

      const tier = item.tier_id ? tierMap.get(item.tier_id) ?? null : null;
      // ティアIDが指定されているのにティアが見つからない場合はエラー
      if (item.tier_id && !tier) {
        throw new Error(`ティアID ${item.tier_id} が見つかりません`);
      }
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

    // トランザクション処理（D1はネイティブトランザクションをサポートしていないため、手動でロールバック）
    let estimateId: string | null = null;

    try {
      // 見積もり保存（参照番号の衝突をリトライで対応）
      estimateId = await this.createEstimateWithRetry({
        partner_id: partner.id,
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
    } catch (error) {
      // エラー発生時、作成された見積もりを削除（不完全な見積もりを残さない）
      if (estimateId) {
        try {
          await this.estimateRepo.delete(estimateId);
          console.error("不完全な見積もりを削除しました:", estimateId);
        } catch (deleteError) {
          console.error("不完全な見積もりの削除に失敗しました:", deleteError);
        }
      }
      throw error;
    }
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

  // 参照番号の衝突を避けるため、リトライ機能付きでestimateを作成
  private async createEstimateWithRetry(
    data: Omit<Parameters<typeof this.estimateRepo.create>[0], 'reference_number'>,
    maxAttempts = RETRY.MAX_ATTEMPTS
  ): Promise<string> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const referenceNumber = this.generateReferenceNumber();
      try {
        const estimateId = await this.estimateRepo.create({
          ...data,
          reference_number: referenceNumber,
        });
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

  // キャッシュなしのNullCache（開発環境などKVが設定されていない場合用）
  private createNullCache(): KVCache {
    return new KVCache({
      get: async () => null,
      put: async () => void 0,
      delete: async () => void 0,
      list: async () => ({ keys: [] }),
    } as KVNamespace);
  }
}
