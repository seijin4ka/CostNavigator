import { SystemSettingsRepository } from "../repositories/system-settings-repository";
import type { SystemSettings, UpdateSystemSettingsRequest } from "../../shared/types";
import { KVCache, CacheKeys, SETTINGS_CACHE_TTL, CacheTags } from "../utils/kv-cache";

// システム設定サービス
export class SystemSettingsService {
  private settingsRepo: SystemSettingsRepository;
  private cache: KVCache;

  constructor(db: D1Database, kvNamespace?: KVNamespace) {
    this.settingsRepo = new SystemSettingsRepository(db);
    this.cache = kvNamespace ? new KVCache(kvNamespace) : this.createNullCache();
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
      getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null }),
    } as unknown as KVNamespace);
  }
}
