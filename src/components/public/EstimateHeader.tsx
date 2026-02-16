import type { PartnerBranding } from "@shared/types";
import { ShieldIcon } from "./Icons";

export function EstimateHeader({ partner, primaryColor, secondaryColor }: {
  partner: PartnerBranding | null;
  primaryColor: string;
  secondaryColor: string;
}) {
  return (
    <header className="relative overflow-hidden" style={{ backgroundColor: secondaryColor }}>
      {/* 背景パターン */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          {/* ロゴ + パートナー名 */}
          <div className="flex items-center gap-3 sm:gap-4">
            {partner?.logo_url && (
              <img src={partner.logo_url} alt={partner.name} className="h-7 sm:h-8 object-contain" />
            )}
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-display">
                {partner?.name ?? "CostNavigator"}
              </h1>
              <p className="text-[11px] sm:text-xs text-white/50 tracking-wide">
                Cloudflare サービス見積もり
              </p>
            </div>
          </div>
          {/* 認定バッジ */}
          <div className="hidden sm:flex items-center gap-2 text-white/60 text-xs">
            <ShieldIcon className="w-4 h-4" />
            <span className="font-display">Cloudflare 認定パートナー</span>
          </div>
        </div>
      </div>
      {/* アクセントライン */}
      <div
        className="h-[3px]"
        style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}88, transparent)` }}
      />
    </header>
  );
}
