import { CURRENCY_CONFIG, DEFAULT_CURRENCY } from "@shared/constants";

// 現在の通貨設定（モジュールレベル変数）
let currentCurrency: keyof typeof CURRENCY_CONFIG = DEFAULT_CURRENCY;

// 通貨を設定する
export function setCurrency(code: string): void {
  if (code in CURRENCY_CONFIG) {
    currentCurrency = code as keyof typeof CURRENCY_CONFIG;
  }
}

// 通貨フォーマット
export function formatCurrency(amount: number): string {
  const config = CURRENCY_CONFIG[currentCurrency];
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits,
  }).format(amount);
}

// 日付フォーマット
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

// 数値フォーマット（カンマ区切り）
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("ja-JP").format(num);
}
