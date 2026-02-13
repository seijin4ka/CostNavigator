import { SystemSettingsRepository } from "../repositories/system-settings-repository";

// JWT_SECRETを取得（環境変数 > D1 > 自動生成の順で取得）
export async function getJwtSecret(db: D1Database, envSecret?: string): Promise<string> {
  // 環境変数が設定されている場合はそれを優先
  if (envSecret && envSecret.trim() !== "") {
    return envSecret;
  }

  // D1から取得、存在しない場合は自動生成
  const repo = new SystemSettingsRepository(db);
  await repo.ensureExists(); // system_settingsレコードを確保
  return await repo.ensureJwtSecret(); // JWT_SECRETを確保（なければ生成）
}
