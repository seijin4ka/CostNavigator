import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { apiClient } from "../api/client";
import type { User, LoginResponse, RefreshTokenResponse } from "@shared/types";
import { STORAGE_KEYS } from "@shared/constants";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// JWTペイロードのデコード（有効期限の取得用）
function decodeJwt(token: string): { exp: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);

  // ログアウト処理（トークンリフレッシュ失敗時にも呼ばれる）
  const logout = useCallback(() => {
    // リフレッシュタイマーをクリア
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    apiClient.setToken(null);
    apiClient.setRefreshToken(null);
    setUser(null);
  }, []);

  // プロアクティブなトークンリフレッシュ（有効期限の2分前）
  const scheduleTokenRefresh = useCallback((token: string) => {
    // 既存のタイマーをクリア
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return;

    // 有効期限の2分前にリフレッシュ（ミリ秒単位）
    const expiresIn = payload.exp * 1000 - Date.now();
    const refreshIn = Math.max(0, expiresIn - 2 * 60 * 1000);

    refreshTimerRef.current = window.setTimeout(async () => {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return;

      try {
        const res = await apiClient.post<RefreshTokenResponse>("/auth/refresh", { refreshToken });
        const newToken = res.data.token;
        const newRefreshToken = res.data.refreshToken;

        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        apiClient.setToken(newToken);
        apiClient.setRefreshToken(newRefreshToken);

        // 次のリフレッシュをスケジュール
        scheduleTokenRefresh(newToken);
      } catch (error) {
        console.error("プロアクティブなトークンリフレッシュに失敗:", error);
        // リフレッシュ失敗時はログアウト
        logout();
      }
    }, refreshIn);
  }, [logout]);

  // 初期化時にトークンからユーザー情報を復元
  useEffect(() => {
    // トークンリフレッシュ失敗時のコールバックを設定
    apiClient.setOnTokenRefreshFailed(logout);

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (token && refreshToken) {
      apiClient.setToken(token);
      apiClient.setRefreshToken(refreshToken);
      apiClient
        .get<User>("/auth/me")
        .then((res) => {
          setUser(res.data);
          // プロアクティブなトークンリフレッシュをスケジュール
          scheduleTokenRefresh(token);
        })
        .catch(() => {
          // トークンが無効な場合はクリア
          logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    // クリーンアップ: コンポーネントアンマウント時にタイマーをクリア
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [logout, scheduleTokenRefresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<LoginResponse>("/auth/login", { email, password });
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.data.token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, res.data.refreshToken);
    apiClient.setToken(res.data.token);
    apiClient.setRefreshToken(res.data.refreshToken);
    setUser(res.data.user);

    // プロアクティブなトークンリフレッシュをスケジュール
    scheduleTokenRefresh(res.data.token);
  }, [scheduleTokenRefresh]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider 内で使用してください");
  return ctx;
}
