// KVキャッシュユーティリティ
// Cloudflare Workers KV を使用したクエリ結果のキャッシュ

export interface CacheOptions {
  ttl?: number; // キャッシュの有効期限（秒）
  tags?: string[]; // キャッシュタグ（一括無効化用）
}

// キャッシュのデフォルト設定
export const DEFAULT_CACHE_TTL = 300; // 5分
export const PRODUCT_CACHE_TTL = 600; // 製品データ: 10分
export const PARTNER_CACHE_TTL = 600; // パートナー: 10分
export const SETTINGS_CACHE_TTL = 1800; // 設定: 30分

export class KVCache {
  constructor(private kv: KVNamespace) {}

  /**
   * キャッシュから値を取得
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, "text");
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`キャッシュ取得エラー [${key}]:`, error);
      return null;
    }
  }

  /**
   * キャッシュに値を設定
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const ttl = options.ttl ?? DEFAULT_CACHE_TTL;

      if (options.tags && options.tags.length > 0) {
        // タグ付きでキャッシュ（一括無効化用）
        await this.kv.put(key, serialized, {
          expirationTtl: ttl,
          metadata: { tags: options.tags },
        });
      } else {
        // 通常のキャッシュ
        await this.kv.put(key, serialized, {
          expirationTtl: ttl,
        });
      }
    } catch (error) {
      console.error(`キャッシュ設定エラー [${key}]:`, error);
      // キャッシュ失敗は致命的ではないのでスルー
    }
  }

  /**
   * キャッシュを削除
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error(`キャッシュ削除エラー [${key}]:`, error);
    }
  }

  /**
   * タグに関連するキャッシュをすべて削除（KVネームスペースをスキャン）
   * 注意: KVはタグによる一括削除をネイティブにサポートしていないため、
   *       この実装ではmetadataのスキャンが必要となり効率的ではない
   *       本来の使用方法は、更新時に関連キーを個別に削除すること
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      // 注: KVのlist APIは最大1000件までしか返せない
      // 大規模な運用では、別のアプローチ（キーの設計など）を検討する必要がある
      const list = await this.kv.list();
      const keysToDelete: string[] = [];

      for (const key of list.keys) {
        const metadata = key.metadata as { tags?: string[] } | undefined;
        if (metadata?.tags && metadata.tags.some((tag) => tags.includes(tag))) {
          keysToDelete.push(key.name);
        }
      }

      if (keysToDelete.length > 0) {
        await this.kv.delete(keysToDelete);
      }
    } catch (error) {
      console.error("タグによるキャッシュ無効化エラー:", error);
    }
  }

  /**
   * 指定されたキープレフィックスに一致するすべてのキャッシュを削除
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    try {
      const list = await this.kv.list({ prefix });
      const keys = list.keys.map((k) => k.name);

      if (keys.length > 0) {
        await this.kv.delete(keys);
      }
    } catch (error) {
      console.error(`プレフィックスによるキャッシュ無効化エラー [${prefix}]:`, error);
    }
  }

  /**
   * キャッシュ取得or設定パターン（Cache-Aside）
   * キャッシュが存在すればそれを返し、存在しなければfactory関数を実行してキャッシュに保存
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // キャッシュを試行
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // キャッシュミス - データを取得してキャッシュに保存
    const value = await factory();
    await this.set(key, value, options);

    return value;
  }
}

// キャッシュキー生成ヘルパー
export const CacheKeys = {
  // 製品関連
  products: () => "products:all",
  product: (id: string) => `product:${id}`,
  productBySlug: (slug: string) => `product:slug:${slug}`,
  productsByCategory: (categoryId: string) => `products:category:${categoryId}`,

  // カテゴリ関連
  categories: () => "categories:all",
  category: (id: string) => `category:${id}`,

  // パートナー関連
  partners: () => "partners:all",
  partner: (id: string) => `partner:${id}`,
  partnerBySlug: (slug: string) => `partner:slug:${slug}`,

  // システム設定関連
  systemSettings: () => "system:settings",

  // マークアップルール関連
  markupRules: (partnerId: string) => `markup:partner:${partnerId}`,
} as const;

// キャッシュタグ定義（一括無効化用）
export const CacheTags = {
  products: "products",
  categories: "categories",
  partners: "partners",
  settings: "settings",
  markupRules: "markup-rules",
} as const;
