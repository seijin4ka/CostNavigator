import type { Context, Next } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { error } from "../utils/response";
import {
  AppError,
  DatabaseError,
} from "../errors/app-error";

/**
 * グローバルエラーハンドリングミドルウェア
 *
 * アプリケーション全体で発生した例外を一元管理し、適切なエラーレスポンスを返します。
 *
 * @example
 * // worker/index.ts
 * app.use("*", errorHandler);
 */
export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (err) {
    console.error("Unhandled error:", err);

    // AppErrorのサブクラスの場合は、カスタムエラーレスポンスを返す
    if (err instanceof AppError) {
      return error(c, err.code, err.message, err.statusCode as ContentfulStatusCode, err.details);
    }

    // DatabaseErrorの特殊処理
    if (err instanceof DatabaseError) {
      // 元のエラーに基づいて詳細なエラータイプを判定
      const originalMessage = err.originalError?.message ?? "";
      if (originalMessage.includes("UNIQUE")) {
        return error(
          c,
          "UNIQUE_CONSTRAINT",
          "一意制約違反が発生しました",
          409
        );
      }
      if (originalMessage.includes("FOREIGN KEY")) {
        return error(
          c,
          "FOREIGN_KEY_CONSTRAINT",
          "外部キー制約違反が発生しました",
          400
        );
      }
      if (originalMessage.includes("NOT NULL")) {
        return error(
          c,
          "NOT_NULL_CONSTRAINT",
          "必須フィールドが不足しています",
          400
        );
      }

      return error(c, "DATABASE_ERROR", "データベースエラーが発生しました", 500);
    }

    // TypeErrorの場合（例: null undefined プロパティへのアクセス）
    if (err instanceof TypeError) {
      console.error("TypeError:", err.message, err.stack);
      return error(
        c,
        "TYPE_ERROR",
        "データ型エラーが発生しました",
        500
      );
    }

    // 構文エラーの場合
    if (err instanceof SyntaxError) {
      console.error("SyntaxError:", err.message, err.stack);
      return error(
        c,
        "SYNTAX_ERROR",
        "構文エラーが発生しました",
        400
      );
    }

    // 未予期のエラー
    if (err instanceof Error) {
      console.error("Unexpected error:", err.message, err.stack);
      return error(c, "INTERNAL_ERROR", "予期せぬエラーが発生しました", 500);
    }

    // Errorではない場合（unknown error）
    console.error("Unknown error:", err);
    return error(c, "INTERNAL_ERROR", "予期せぬエラーが発生しました", 500);
  }
};
