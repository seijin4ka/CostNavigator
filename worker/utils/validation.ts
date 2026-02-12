import type { Context } from "hono";
import type { ZodSchema, ZodError } from "zod";
import { error } from "./response";

// Zodスキーマによるリクエストボディバリデーション
export async function validateBody<T>(c: Context, schema: ZodSchema<T>): Promise<T | null> {
  try {
    const body = await c.req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      const details = formatZodError(result.error);
      error(c, "VALIDATION_ERROR", "入力内容に誤りがあります", 400, details);
      return null;
    }
    return result.data;
  } catch {
    error(c, "INVALID_JSON", "リクエストボディのJSON形式が不正です", 400);
    return null;
  }
}

// Zodエラーをフィールド別のメッセージに変換
function formatZodError(err: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join(".");
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  return details;
}
