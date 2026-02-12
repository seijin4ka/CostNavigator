import type { Context } from "hono";

// 成功レスポンス
export function success<T>(c: Context, data: T, status: number = 200) {
  return c.json({ success: true, data }, status);
}

// エラーレスポンス
export function error(
  c: Context,
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, string[]>
) {
  return c.json(
    {
      success: false,
      error: { code, message, details },
    },
    status
  );
}

// ページネーション付きレスポンス
export function paginated<T>(
  c: Context,
  data: T[],
  total: number,
  page: number,
  perPage: number
) {
  return c.json({
    success: true,
    data,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    },
  });
}
