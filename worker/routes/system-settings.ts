import { Hono } from "hono";
import type { Env } from "../env";
import { authMiddleware } from "../middleware/auth";
import { success, error } from "../utils/response";
import { SystemSettingsService } from "../services/system-settings-service";
import type { UpdateSystemSettingsRequest } from "../../shared/types";

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
  try {
    const body = await c.req.json<UpdateSystemSettingsRequest>();
    const service = new SystemSettingsService(c.env.DB);
    const settings = await service.updateSettings(body);
    return success(c, settings);
  } catch (err) {
    return error(c, "UPDATE_FAILED", (err as Error).message, 400);
  }
});

export default systemSettingsRoutes;
