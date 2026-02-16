export function EstimateFooter() {
  return (
    <footer className="mt-16 lg:mt-24 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400 font-display">
            Powered by <span className="font-semibold text-slate-500">Accelia, Inc.</span>
          </p>
          <p className="text-xs text-slate-400 font-display">
            Cloudflare 製品のお見積もりツール
          </p>
        </div>
      </div>
    </footer>
  );
}
