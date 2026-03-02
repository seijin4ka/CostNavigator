import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { EstimatePage } from "./public/EstimatePage";

interface SetupStatusResponse {
  isSetupComplete: boolean;
}

export function HomePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        // セットアップ状態を確認
        const res = await apiClient.get<SetupStatusResponse>("/auth/setup-status");

        if (!res.data.isSetupComplete) {
          // 未セットアップの場合、セットアップページへ
          navigate("/setup");
          return;
        }
      } catch {
        // エラーの場合でも見積もりページを表示
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 border-[3px] border-orange-100 border-t-orange-500 rounded-full animate-spin mx-auto"
          />
          <p className="mt-4 text-sm text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 見積もりページを直接表示
  return <EstimatePage />;
}
