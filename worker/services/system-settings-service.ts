import { SystemSettingsRepository } from "../repositories/system-settings-repository";
import { PartnerRepository } from "../repositories/partner-repository";
import type { SystemSettings, UpdateSystemSettingsRequest } from "../../shared/types";

// システム設定サービス
export class SystemSettingsService {
  private settingsRepo: SystemSettingsRepository;
  private partnerRepo: PartnerRepository;

  constructor(private db: D1Database) {
    this.settingsRepo = new SystemSettingsRepository(db);
    this.partnerRepo = new PartnerRepository(db);
  }

  // システム設定を取得
  async getSettings(): Promise<SystemSettings> {
    await this.settingsRepo.ensureExists();
    const settings = await this.settingsRepo.get();
    if (!settings) {
      throw new Error("システム設定の取得に失敗しました");
    }
    return settings;
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
    return await this.getSettings();
  }
}
