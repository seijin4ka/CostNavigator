import { type FormEvent, type CSSProperties } from "react";
import { formatCurrency } from "../../lib/formatters";
import { StepIndicator } from "./StepIndicator";
import { CloseIcon, ArrowRightIcon } from "./Icons";

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  customerForm: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_company: string;
    notes: string;
  };
  onCustomerFormChange: (form: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_company: string;
    notes: string;
  }) => void;
  itemCount: number;
  totalMonthly: number;
  totalYearly: number;
  primaryColor: string;
  error: string;
  isSubmitting: boolean;
}

export function CustomerInfoModal({
  isOpen,
  onClose,
  onSubmit,
  customerForm,
  onCustomerFormChange,
  itemCount,
  totalMonthly,
  totalYearly,
  primaryColor,
  error,
  isSubmitting,
}: CustomerInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-cn-fade-in opacity-0">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto cn-scrollbar animate-cn-slide-up opacity-0"
        style={{ animationDelay: "50ms" }}
      >
        {/* ステップインジケーター（モーダル内） */}
        <div className="px-6 pt-5 pb-3">
          <StepIndicator currentStep={2} primaryColor={primaryColor} />
        </div>

        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display">お客様情報の入力</h2>
            <p className="text-xs text-slate-400 mt-0.5">見積もりの送付先情報をご入力ください</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 見積もりサマリー */}
        <div
          className="px-6 py-4 border-b border-slate-100"
          style={{ backgroundColor: `${primaryColor}06` }}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-slate-500">{itemCount}件のサービス</span>
            <div className="text-right">
              <span className="cn-price text-xl font-bold font-display" style={{ color: primaryColor }}>
                {formatCurrency(totalMonthly)}
              </span>
              <span className="text-xs text-slate-400 ml-1">/月</span>
            </div>
          </div>
          <div className="flex justify-end mt-0.5">
            <span className="cn-price text-xs text-slate-400">
              年額（月額 × 12ヶ月）: {formatCurrency(totalYearly)}
            </span>
          </div>
        </div>

        {/* 契約条件 */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-xs font-semibold text-slate-800 mb-2 font-display">契約条件について</h3>
          <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>本見積もりは情報提供のみを目的としております。実際の契約には別途契約手続きが必要です。</li>
            <li>お客様からのお断りはいつでも可能です。お気軽にお問い合わせください。</li>
            <li>表示価格は予告なく変更される場合があります。</li>
            <li>お客様の環境や利用状況により、実際の料金と異なる場合があります。</li>
          </ul>
        </div>

        {/* フォーム */}
        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600 font-body">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
                お名前 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={customerForm.customer_name}
                onChange={(e) => onCustomerFormChange({ ...customerForm, customer_name: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow font-body"
                style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
                placeholder="例: 山田 太郎"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
                会社名 <span className="text-slate-300">(任意)</span>
              </label>
              <input
                type="text"
                value={customerForm.customer_company}
                onChange={(e) => onCustomerFormChange({ ...customerForm, customer_company: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow font-body"
                style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
                placeholder="例: 株式会社サンプル"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
                メールアドレス <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={customerForm.customer_email}
                onChange={(e) => onCustomerFormChange({ ...customerForm, customer_email: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow font-body"
                style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
                placeholder="例: yamada@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
                電話番号 <span className="text-slate-300">(任意)</span>
              </label>
              <input
                type="tel"
                value={customerForm.customer_phone}
                onChange={(e) => onCustomerFormChange({ ...customerForm, customer_phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow font-body"
                style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
                placeholder="例: 03-1234-5678"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
              備考 <span className="text-slate-300">(任意)</span>
            </label>
            <textarea
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow resize-none font-body"
              style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
              rows={2}
              value={customerForm.notes}
              onChange={(e) => onCustomerFormChange({ ...customerForm, notes: e.target.value })}
              placeholder="ご質問やご要望がございましたらご記入ください"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors font-display"
            >
              戻る
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-display"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 4px 14px -3px ${primaryColor}66`,
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  見積もりを依頼する
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* フォーム下部の信頼シグナル */}
          <p className="text-center text-[11px] text-slate-400 pt-1">
            送信いただいた情報はSSL暗号化通信で保護されます
          </p>
          {/* 送信後の動作説明 */}
          <p className="text-center text-[11px] text-slate-400">
            送信後、見積もり詳細画面（PDF）が表示されます
          </p>
        </form>
      </div>
    </div>
  );
}
