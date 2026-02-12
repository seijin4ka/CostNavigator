import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiClient } from "../api/client";
import type { User, LoginResponse } from "@shared/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "cn_auth_token";
const REFRESH_TOKEN_KEY = "cn_refresh_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ログアウト処理（トークンリフレッシュ失敗時にも呼ばれる）
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    apiClient.setToken(null);
    apiClient.setRefreshToken(null);
    setUser(null);
  }, []);

  // 初期化時にトークンからユーザー情報を復元
  useEffect(() => {
    // トークンリフレッシュ失敗時のコールバックを設定
    apiClient.setOnTokenRefreshFailed(logout);

    const token = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (token && refreshToken) {
      apiClient.setToken(token);
      apiClient.setRefreshToken(refreshToken);
      apiClient
        .get<User>("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          // トークンが無効な場合はクリア
          logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<LoginResponse>("/auth/login", { email, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refreshToken);
    apiClient.setToken(res.data.token);
    apiClient.setRefreshToken(res.data.refreshToken);
    setUser(res.data.user);
  }, []);

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
