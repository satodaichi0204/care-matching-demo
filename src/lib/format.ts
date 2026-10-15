import { CARE_LEVELS } from "./domain.ts";

/** 185000 → 「18.5万円」 */
export function formatManYen(yen: number): string {
  if (yen === 0) return "0円";
  const man = yen / 10_000;
  return `${Number.isInteger(man) ? man : man.toFixed(1)}万円`;
}

/** 月額の幅。「15万〜22.5万円」、同じなら「15万円」 */
export function formatFeeRange(min: number, max: number): string {
  if (min === max) return formatManYen(min);
  return `${formatManYen(min).replace("円", "")}〜${formatManYen(max)}`;
}

/** 介護度の幅。「要介護1〜要介護5」「自立〜要介護3」 */
export function formatCareRange(min: number, max: number): string {
  if (min === max) return CARE_LEVELS[min];
  return `${CARE_LEVELS[min]}〜${CARE_LEVELS[max]}`;
}

/** 「3分前」「2日前」 */
export function formatRelative(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (sec < 60) return "たった今";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  return `${Math.floor(hour / 24)}日前`;
}

/** 「3分前に更新」「たった今更新」 */
export function formatUpdated(date: Date | string, now: Date = new Date()): string {
  const relative = formatRelative(date, now);
  return relative === "たった今" ? "たった今更新" : `${relative}に更新`;
}

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** 「2026/10/15」 */
export function formatDate(date: Date | string): string {
  return dateFormat.format(typeof date === "string" ? new Date(date) : date);
}
