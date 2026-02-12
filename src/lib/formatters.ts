import { CURRENCY } from "@shared/constants";

// 通貨フォーマット
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: "currency",
    currency: CURRENCY.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
