import { Outlet } from "react-router-dom";
import type { PartnerBranding } from "@shared/types";

interface PublicLayoutProps {
  partner: PartnerBranding | null;
}

// パートナーブランド表示の公開レイアウト
export function PublicLayout({ partner }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header
        className="border-b"
        style={{ backgroundColor: partner?.secondary_color ?? "#1B1B1B" }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          {partner?.logo_url && (
            <img
              src={partner.logo_url}
              alt={partner.name}
              className="h-8 object-contain"
            />
          )}
          <div>
            <h1 className="text-lg font-bold text-white">
              {partner?.name ?? "CostNavigator"}
            </h1>
            <p className="text-xs text-gray-300">Cloudflare サービス見積もり</p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 text-center text-xs text-gray-400">
          Powered by CostNavigator
        </div>
      </footer>
    </div>
  );
}
