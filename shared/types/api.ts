// API共通レスポンス型

// 成功レスポンス
export interface ApiResponse<T> {
  success: true;
  data: T;
}

// エラーレスポンス
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ページネーション付きレスポンス
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
