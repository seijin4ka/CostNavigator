import { CURRENCY_CONFIG, DEFAULT_CURRENCY } from "@shared/constants";

// 現在の通貨設定（モジュールレベル変数）
let currentCurrency: keyof typeof CURRENCY_CONFIG = DEFAULT_CURRENCY;
let currentExchangeRate = 150.0;

// 通貨と為替レートを設定する
export function setCurrency(code: string, exchangeRate?: number): void {
  if (code in CURRENCY_CONFIG) {
    currentCurrency = code as keyof typeof CURRENCY_CONFIG;
  }
  if (exchangeRate !== undefined && exchangeRate > 0) {
    currentExchangeRate = exchangeRate;
  }
}

// 通貨フォーマット（USD入力値を現在の通貨に換算して表示）
export function formatCurrency(amount: number): string {
  const config = CURRENCY_CONFIG[currentCurrency];
  // JPYの場合は為替レートで換算（DB内の価格はUSDベース）
  const convertedAmount = currentCurrency === "JPY" ? amount * currentExchangeRate : amount;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits,
  }).format(convertedAmount);
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
