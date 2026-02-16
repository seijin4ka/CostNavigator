import { SystemSettingsRepository } from "../repositories/system-settings-repository";
import { PartnerRepository } from "../repositories/partner-repository";
import type { SystemSettings, UpdateSystemSettingsRequest } from "../../shared/types";
import { KVCache, CacheKeys, SETTINGS_CACHE_TTL, CacheTags } from "../utils/kv-cache";

// システム設定サービス
export class SystemSettingsService {
  private settingsRepo: SystemSettingsRepository;
  private partnerRepo: PartnerRepository;
  private cache: KVCache;

  constructor(private db: D1Database, private cache?: KVNamespace) {
    this.settingsRepo = new SystemSettingsRepository(db);
    this.partnerRepo = new PartnerRepository(db);
    this.cache = cache ? new KVCache(cache) : this.createNullCache();
  }

  // システム設定を取得（キャッシュ利用）
  async getSettings(): Promise<SystemSettings> {
    return await this.cache.getOrSet(
      CacheKeys.systemSettings(),
      async () => {
        await this.settingsRepo.ensureExists();
        const settings = await this.settingsRepo.get();
        if (!settings) {
          throw new Error("システム設定の取得に失敗しました");
        }
        return settings;
      },
      { ttl: SETTINGS_CACHE_TTL, tags: [CacheTags.settings] }
    );
  }

  // システム設定を更新
  async updateSettings(data: UpdateSystemSettingsRequest): Promise<SystemSettings> {
    // primary_partner_slugが指定されている場合、存在確認
    if (data.primary_partner_slug) {
      const partner = await this.partnerRepo.findBySlug(data.primary_partner_slug);
      if (!partner) {
        throw new Error(`パートナー "${data.primary_partner_slug}" が見つかりません`);
      }
    }

    await this.settingsRepo.update(data);

    // 設定更新時はキャッシュを無効化
    await this.cache.delete(CacheKeys.systemSettings());

    return await this.getSettings();
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
