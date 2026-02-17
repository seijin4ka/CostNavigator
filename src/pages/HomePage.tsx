import { useEffect, useState } from "react";
import { EstimatePage } from "./public/EstimatePage";

export function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        // セットアップ状態を確認
        const setupRes = await fetch("/api/auth/setup-status");
        const setupData = await setupRes.json();

        if (setupData.success && !setupData.data.isSetupComplete) {
          // 未セットアップの場合、セットアップページへ
          window.location.href = "/setup";
          return;
        }
      } catch (error) {
        console.error("初期化エラー:", error);
        // エラーの場合でも見積もりページを表示
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // 見積もりページを直接表示
  return <EstimatePage />;
}
