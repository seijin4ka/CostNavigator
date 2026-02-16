import type { Context, Next } from "hono";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * レート制限ミドルウェア
 *
 * IPアドレスベースのインメモリレート制限を実装します。
 * 同一IPアドレスからのリクエスト数を制限し、閾値を超えた場合は429エラーを返します。
 *
 * @param maxRequests - 指定された時間枠内で許可する最大リクエスト数
 * @param windowMs - 時間枠（ミリ秒）
 *
 * @example
 * // 5回/60秒のレート制限
 * app.use("/api/auth/login", rateLimit(5, 60000));
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, RateLimitEntry>();

  return async (c: Context, next: Next) => {
    // IPアドレスを取得（Cloudflare Workers環境ではCF-Connecting-IPを使用）
    const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
    const now = Date.now();

    // 古いエントリを削除
    const windowStart = now - windowMs;
    for (const [key, value] of requests.entries()) {
      if (value.resetAt < windowStart) {
        requests.delete(key);
      }
    }

    // 現在のエントリを取得または初期化
    let entry = requests.get(ip);
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    // カウントを増加
    entry.count++;
    requests.set(ip, entry);

    // 制限を超えている場合は429エラーを返す
    if (entry.count > maxRequests) {
      const remainingSeconds = Math.ceil((entry.resetAt - now) / 1000);
      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `リクエスト回数が制限を超えました。${remainingSeconds}秒後に再試行してください。`,
          },
        },
        429
      );
    }

    await next();
  };
}
