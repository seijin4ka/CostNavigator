/**
 * アプリケーションエラー基底クラス
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * データベースエラー
 */
export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super("DATABASE_ERROR", message, 500);
  }
}

/**
 * 一意制約違反エラー
 */
export class UniqueConstraintError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.code = "UNIQUE_CONSTRAINT";
    this.statusCode = 409;
  }
}

/**
 * 外部キー制約違反エラー
 */
export class ForeignKeyConstraintError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.code = "FOREIGN_KEY_CONSTRAINT";
    this.statusCode = 400;
  }
}

/**
 * NOT NULL制約違反エラー
 */
export class NotNullConstraintError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.code = "NOT_NULL_CONSTRAINT";
    this.statusCode = 400;
  }
}

/**
 * リソース未検出エラー
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const idMessage = id ? ` (ID: ${id})` : '';
    super("NOT_FOUND", `${resource}${idMessage}が見つかりません`, 404);
  }
}

/**
 * 検証エラー
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

/**
 * 認証エラー
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "認証が必要です") {
    super("UNAUTHORIZED", message, 401);
  }
}

/**
 * 認可エラー
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "アクセス権限がありません") {
    super("FORBIDDEN", message, 403);
  }
}

/**
 * レート制限エラー
 */
export class RateLimitError extends AppError {
  constructor(message: string = "リクエスト回数が制限を超えました") {
    super("RATE_LIMIT_EXCEEDED", message, 429);
  }
}

/**
 * トークンエラー
 */
export class TokenError extends AppError {
  constructor(message: string = "トークンが無効または期限切れです") {
    super("INVALID_TOKEN", message, 401);
  }
}
