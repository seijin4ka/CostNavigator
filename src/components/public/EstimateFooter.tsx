export function EstimateFooter() {
  return (
    <footer className="mt-16 lg:mt-24 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center space-y-6">
          {/* お問い合わせ情報 */}
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">お問い合わせ</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
          </div>

          {/* 免責事項 */}
          <div className="max-w-2xl mx-auto text-left">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">免責事項</h3>
            <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside leading-relaxed">
              <li>本見積もりは情報提供のみを目的としております。実際の契約には別途契約手続きが必要です。</li>
              <li>表示価格は予告なく変更される場合があります。</li>
              <li>各サービスの詳細仕様についてはCloudflare公式ドキュメントをご確認ください。</li>
              <li>お客様の環境により、実際の料金と異なる場合があります。</li>
            </ul>
          </div>

          {/* クレジット */}
          <div className="text-xs text-slate-400 font-display space-y-1">
            <p className="flex flex-col sm:flex-row items-center justify-center gap-2">
              Powered by <span className="font-semibold text-slate-500">Accelia, Inc.</span>
            </p>
            <p>Cloudflare 製品のお見積もりツール</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
