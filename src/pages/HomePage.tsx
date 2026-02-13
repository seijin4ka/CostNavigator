import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

interface SystemSettings {
  brand_name: string;
  primary_partner_slug: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
}

export function HomePage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/public/system-settings");
        const data = await res.json();
        if (data.success) {
          setSettings(data.data);
        }
      } catch (error) {
        console.error("システム設定の読み込みエラー:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // primary_partner_slugが設定されている場合は、そのパートナーの見積もりページへ
  if (settings?.primary_partner_slug) {
    return <Navigate to={`/estimate/${settings.primary_partner_slug}`} replace />;
  }

  // 設定されていない場合は管理画面へ
  return <Navigate to="/admin/login" replace />;
}
