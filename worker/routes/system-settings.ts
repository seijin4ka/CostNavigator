import { Hono } from "hono";
import type { Env } from "../env";
import { authMiddleware } from "../middleware/auth";
import { success } from "../utils/response";
import { validateBody } from "../utils/validation";
import { SystemSettingsService } from "../services/system-settings-service";
import { UpdateSystemSettingsSchema } from "../../shared/types";

const systemSettingsRoutes = new Hono<{ Bindings: Env }>();

// すべてのルートに認証を適用
systemSettingsRoutes.use("*", authMiddleware);

// システム設定取得
systemSettingsRoutes.get("/", async (c) => {
  const service = new SystemSettingsService(c.env.DB);
  const settings = await service.getSettings();
  return success(c, settings);
});

// システム設定更新
systemSettingsRoutes.put("/", async (c) => {
  const body = await validateBody(c, UpdateSystemSettingsSchema);
  if (!body) return c.res;

  const service = new SystemSettingsService(c.env.DB);
  const settings = await service.updateSettings(body);
  return success(c, settings);
});

export default systemSettingsRoutes;
