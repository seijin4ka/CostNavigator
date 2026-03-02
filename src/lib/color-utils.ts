// 16進数カラーコードが「明るい色」かどうかを判定する
// ヘッダーなどの背景色に応じてテキスト色を切り替えるために使用
export function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6 && c.length !== 3) return true;
  const fullHex = c.length === 3
    ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
    : c;
  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return true;
  // ITU-R BT.601 輝度計算
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
