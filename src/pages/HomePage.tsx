import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { EstimatePage } from "./public/EstimatePage";

interface SystemSettings {
  brand_name: string;
  primary_partner_slug: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
}

interface SetupStatus {
  isSetupComplete: boolean;
  userCount: number;
}

export function HomePage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        // セットアップ状態を確認
        const setupRes = await fetch("/api/auth/setup-status");
        const setupData = await setupRes.json();

        if (setupData.success && !setupData.data.isSetupComplete) {
          // 未セットアップの場合、セットアップページへ
          return <Navigate to="/setup" replace />;
        }

        // セットアップ済みの場合、システム設定を取得
        const res = await fetch("/api/public/system-settings");
        const data = await res.json();
        if (data.success) {
          setSettings(data.data);
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

  // primary_partner_slugが設定されている場合は、そのパートナーの見積もりページへ
  // 設定されていない場合は、ダイレクト見積もりページを表示
  return <EstimatePage />;
}
