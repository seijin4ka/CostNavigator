import type { ApiResponse, ApiError } from "@shared/types";

const API_BASE = "/api";

// APIクライアント（認証トークン自動付与 + 自動リフレッシュ）
class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private onTokenRefreshFailed: (() => void) | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  // トークンリフレッシュ失敗時のコールバック設定（AuthContextでログアウト処理）
  setOnTokenRefreshFailed(callback: () => void) {
    this.onTokenRefreshFailed = callback;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      const err = data as ApiError;

      // 401エラー（認証エラー）かつ、リトライ前かつ、リフレッシュトークンがある場合
      if (res.status === 401 && !isRetry && this.refreshToken && path !== "/auth/refresh") {
        // トークンリフレッシュを試行
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // リフレッシュ成功 → 元のリクエストを再実行（isRetry=true）
          return this.request<T>(method, path, body, true);
        } else {
          // リフレッシュ失敗 → ログアウト処理を通知
          this.onTokenRefreshFailed?.();
          throw new ApiClientError(
            "セッションが期限切れです。再度ログインしてください。",
            "SESSION_EXPIRED",
            401
          );
        }
      }

      throw new ApiClientError(
        err.error?.message ?? "APIエラーが発生しました",
        err.error?.code ?? "UNKNOWN",
        res.status,
        err.error?.details
      );
    }

    return data as ApiResponse<T>;
  }

  // トークンリフレッシュ試行
  private async tryRefreshToken(): Promise<boolean> {
    if (this.isRefreshing) {
      // 既にリフレッシュ中の場合は待機（同時リフレッシュを防ぐ）
      return false;
    }

    this.isRefreshing = true;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      if (data.success && data.data) {
        // 新しいトークンを保存
        this.token = data.data.token;
        this.refreshToken = data.data.refreshToken;

        // localStorageにも保存
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("refreshToken", data.data.refreshToken);

        return true;
      }

      return false;
    } catch (error) {
      console.error("トークンリフレッシュエラー:", error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

// APIエラークラス
export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();
