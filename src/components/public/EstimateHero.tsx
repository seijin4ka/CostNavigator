import type { CSSProperties } from "react";
import { StepIndicator } from "./StepIndicator";
import { ClockIcon, DocumentIcon, LockIcon } from "./Icons";

export function EstimateHero({ currentStep, primaryColor, secondaryColor }: {
  currentStep: number;
  primaryColor: string;
  secondaryColor: string;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${secondaryColor}08, ${primaryColor}06, ${secondaryColor}04)` }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="text-center max-w-3xl mx-auto animate-cn-fade-up opacity-0">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight font-display leading-tight">
            最適なCloudflareプランを
            <br className="sm:hidden" />
            <span style={{ color: primaryColor }}>簡単お見積もり</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl mx-auto">
            必要なサービスを選択するだけで、即座にお見積もりを作成。
            <br className="hidden sm:block" />
            PDFでのダウンロードも無料でご利用いただけます。
          </p>

          {/* バリュープロポジション */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ClockIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
              <span>すぐに見積もり完了</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <DocumentIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
              <span>見積もりPDFの発行</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <LockIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
              <span>会員登録不要</span>
            </div>
          </div>
        </div>

        {/* ステップインジケーター */}
        <div className="mt-8 animate-cn-fade-up opacity-0" style={{ animationDelay: "100ms" }}>
          <StepIndicator currentStep={currentStep} primaryColor={primaryColor} />
        </div>
      </div>
      {/* セクション区切り */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    </div>
  );
}
