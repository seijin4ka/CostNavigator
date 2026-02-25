// 見積もりステータスの表示ラベルと色
export const ESTIMATE_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  sent: "送信済み",
  accepted: "承認済み",
  expired: "期限切れ",
};

export const ESTIMATE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-600",
};
