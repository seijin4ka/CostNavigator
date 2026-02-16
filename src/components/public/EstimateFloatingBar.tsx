import { formatCurrency } from "../../lib/formatters";

export function EstimateFloatingBar({ itemCount, totalMonthly, slug, primaryColor, onSubmit }: {
  itemCount: number;
  totalMonthly: number;
  slug: string | null;
  primaryColor: string;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed bottom-0 inset-x-0 lg:hidden z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-body">{itemCount}件のサービス</p>
          <p className="cn-price text-lg font-bold font-display" style={{ color: primaryColor }}>
            見積もり: {formatCurrency(totalMonthly)}
            <span className="text-xs font-normal text-slate-400 ml-1">/月</span>
          </p>
        </div>
        <button
          onClick={onSubmit}
          className="px-5 py-2.5 rounded-lg text-sm font-bold text-white font-display transition-all hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          見積もりを依頼
        </button>
      </div>
    </div>
  );
}
