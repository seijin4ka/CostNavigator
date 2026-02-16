import { DatabaseError, UniqueConstraintError, ForeignKeyConstraintError, NotNullConstraintError } from "../errors/app-error";

/**
 * D1クエリ結果の検証とエラーハンドリング
 *
 * @param result - D1のクエリ実行結果
 * @param operation - 実行した操作（INSERT, UPDATE, DELETEなど）
 * @param entityName - エンティティ名（エラーメッセージ用）
 * @throws DatabaseError - クエリ実行に失敗した場合
 * @throws UniqueConstraintError - 一意制約違反の場合
 * @throws ForeignKeyConstraintError - 外部キー制約違反の場合
 * @throws NotNullConstraintError - NOT NULL制約違反の場合
 */
export function validateD1Result(
  result: { success: boolean; meta?: { changes?: number; last_row_id?: number } },
  operation: string = "クエリ",
  entityName: string = "エンティティ"
): void {
  if (!result.success) {
    throw new DatabaseError(`${entityName}の${operation}に失敗しました`);
  }

  // 元のエラーメッセージから制約違反を判定
  // 注意: D1のエラーメッセージの形式に依存
  const error = result as unknown as { error?: Error };
  if (error.error?.message) {
    const message = error.error.message;

    if (message.includes("UNIQUE")) {
      throw new UniqueConstraintError(
        `${entityName}の一意制約違反が発生しました`,
        error.error
      );
    }

    if (message.includes("FOREIGN KEY")) {
      throw new ForeignKeyConstraintError(
        `${entityName}の外部キー制約違反が発生しました`,
        error.error
      );
    }

    if (message.includes("NOT NULL")) {
      throw new NotNullConstraintError(
        `${entityName}の必須フィールドが不足しています`,
        error.error
      );
    }
  }
}

/**
 * D1のprepare + bind + runのヘルパー関数
 *
 * エラーハンドリングを自動で行います。
 *
 * @param db - D1データベースインスタンス
 * @param sql - SQLクエリ
 * @param params - パラメータ
 * @param operation - 実行した操作（エラーメッセージ用）
 * @param entityName - エンティティ名（エラーメッセージ用）
 * @returns クエリ実行結果
 */
export function executeD1Query<T extends { success: boolean }>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
  operation: string = "クエリ",
  entityName: string = "エンティティ"
): T {
  const stmt = db.prepare(sql);
  const result = stmt.bind(...params).run() as T;
  validateD1Result(result, operation, entityName);
  return result;
}

/**
 * D1のprepare + bind + firstのヘルパー関数
 *
 * @param db - D1データベースインスタンス
 * @param sql - SQLクエリ
 * @param params - パラメータ
 * @returns クエリ実行結果（最初の行）
 */
export function executeD1First<T>(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): T | null {
  const stmt = db.prepare(sql);
  return stmt.bind(...params).first<T>();
}

/**
 * D1のprepare + bind + allのヘルパー関数
 *
 * @param db - D1データベースインスタンス
 * @param sql - SQLクエリ
 * @param params - パラメータ
 * @returns クエリ実行結果（全行）
 */
export function executeD1All<T>(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): T[] {
  const stmt = db.prepare(sql);
  return stmt.bind(...params).all<T>().results ?? [];
}
