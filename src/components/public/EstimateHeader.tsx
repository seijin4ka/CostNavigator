import { ShieldIcon } from "./Icons";
import { isLightColor } from "../../lib/color-utils";

interface Branding {
  name: string;
  logo_url: string | null;
}

export function EstimateHeader({ branding, primaryColor, secondaryColor }: {
  branding: Branding | null;
  primaryColor: string;
  secondaryColor: string;
}) {
  const light = isLightColor(secondaryColor);

  return (
    <header
      className={`relative overflow-hidden ${light ? "border-b border-slate-200" : ""}`}
      style={{ backgroundColor: secondaryColor }}
    >
      {/* 背景パターン（暗い背景のみ） */}
      {!light && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")`,
          }}
        />
      )}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          {/* ロゴ + ブランド名 */}
          <div className="flex items-center gap-3 sm:gap-4">
            {branding?.logo_url && (
              <img src={branding.logo_url} alt={branding.name} className="h-7 sm:h-8 object-contain" />
            )}
            <div>
              <h1
                className={`text-base sm:text-lg font-bold tracking-tight font-display ${
                  light ? "text-slate-900" : "text-white"
                }`}
              >
                {branding?.name ?? "Accelia"}
              </h1>
              <p
                className={`text-[11px] sm:text-xs tracking-wide ${
                  light ? "text-slate-400" : "text-white/50"
                }`}
              >
                Cloudflare サービス見積もり
              </p>
            </div>
          </div>
          {/* 認定バッジ */}
          <div
            className={`hidden sm:flex items-center gap-2 text-xs ${
              light ? "text-slate-400" : "text-white/60"
            }`}
          >
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
