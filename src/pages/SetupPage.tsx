import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";

interface SetupStatusResponse {
  isSetupComplete: boolean;
}

export function SetupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const redirectTimerRef = useRef<number | null>(null);

  // クリーンアップ: アンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const checkSetupStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<SetupStatusResponse>("/auth/setup-status");

      if (res.data.isSetupComplete) {
        // セットアップ済みの場合、ログインページへ
        navigate("/admin/login");
      }
    } catch (err) {
      console.error("セットアップ状態確認エラー:", err);
      // エラーが発生してもセットアップ画面を表示
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // セットアップ状態を確認
  useEffect(() => {
    checkSetupStatus();
  }, [checkSetupStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 入力バリデーション
    if (!formData.email || !formData.password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("パスワードと確認用パスワードが一致しません");
      return;
    }

    if (formData.password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    setIsSettingUp(true);

    try {
      const res = await apiClient.post<{
        message: string;
        credentials?: { email: string; password: string };
      }>("/auth/setup", {
        email: formData.email,
        password: formData.password,
      });

      setSuccess(res.data.message);

      // 3秒後にログイン画面へ遷移
      redirectTimerRef.current = window.setTimeout(() => {
        navigate("/admin/login");
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "セットアップに失敗しました";
      if (errorMessage.includes("既に完了しています")) {
        // 既にセットアップ済みの場合、ログイン画面へ
        navigate("/admin/login");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSettingUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div role="status" aria-label="読み込み中" className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">初期設定</h1>
          <p className="text-gray-600">
            管理者アカウントを作成して、CostNavigatorの使用を開始してください
          </p>
        </div>

        <Card>
          <div className="p-6 space-y-4">
            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="メールアドレス"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@example.com"
                required
                disabled={isSettingUp}
                autoComplete="email"
              />

              <Input
                label="パスワード"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="8文字以上で入力してください"
                required
                disabled={isSettingUp}
                autoComplete="new-password"
              />

              <Input
                label="パスワード（確認用）"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="パスワードを再度入力してください"
                required
                disabled={isSettingUp}
                autoComplete="new-password"
              />

              <Button type="submit" disabled={isSettingUp} className="w-full">
                {isSettingUp ? "設定中..." : "設定を開始する"}
              </Button>
            </form>
          </div>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          ※ セットアップ後にパスワードを忘れた場合は、
          <br />
          Cloudflare Accessを通じて管理画面にアクセスできます
        </p>
      </div>
    </div>
  );
}
