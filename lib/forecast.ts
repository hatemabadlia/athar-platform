/**
 * Demand forecasts from the platform's OWN history (pure, unit-tested).
 * Method: seasonal-naive — next month ≈ mean of the same calendar month in previous years, with the
 * min/max of those years as the range. Only produced when there is enough history; otherwise the
 * result says so explicitly. Forecasts are not confirmed needs.
 */
export interface HistoryPoint { category: string; wilayaCode: number | null; createdAt: string }

export const MIN_MONTHS = 13;        // need the same month in at least one previous year
export const MIN_EVENTS = 30;        // per category, overall

export interface CategoryForecast {
  category: string;
  month: string;                     // YYYY-MM forecast target
  expected: number;
  low: number;
  high: number;
  basedOnYears: number;
  topWilayas: { wilayaCode: number; share: number }[];
}

export interface ForecastResult {
  enough: boolean;
  historyMonths: number;
  totalEvents: number;
  reason?: string;
  forecasts: CategoryForecast[];
  monthly: { month: string; count: number }[];   // actual history, for display
}

const ym = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export function computeForecasts(points: HistoryPoint[], now = new Date()): ForecastResult {
  const valid = points.filter((p) => !Number.isNaN(Date.parse(p.createdAt)));
  const monthlyMap = new Map<string, number>();
  for (const p of valid) monthlyMap.set(ym(new Date(p.createdAt)), (monthlyMap.get(ym(new Date(p.createdAt))) ?? 0) + 1);
  const monthly = [...monthlyMap.entries()].sort().map(([month, count]) => ({ month, count }));
  if (!valid.length) return { enough: false, historyMonths: 0, totalEvents: 0, reason: "لا توجد بيانات تاريخية بعد.", forecasts: [], monthly };

  const first = new Date(Math.min(...valid.map((p) => Date.parse(p.createdAt))));
  const historyMonths = (now.getUTCFullYear() - first.getUTCFullYear()) * 12 + (now.getUTCMonth() - first.getUTCMonth()) + 1;
  if (historyMonths < MIN_MONTHS) {
    return { enough: false, historyMonths, totalEvents: valid.length, monthly,
      reason: `بيانات غير كافية بعد: ${historyMonths} شهر من التاريخ (نحتاج ${MIN_MONTHS} شهراً على الأقل لمقارنة نفس الشهر من سنة سابقة).`, forecasts: [] };
  }

  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const targetMonth = target.getUTCMonth();
  const byCat = new Map<string, HistoryPoint[]>();
  valid.forEach((p) => byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]));

  const forecasts: CategoryForecast[] = [];
  for (const [category, list] of byCat) {
    if (list.length < MIN_EVENTS) continue;
    const perYear = new Map<number, number>();
    for (const p of list) {
      const d = new Date(p.createdAt);
      if (d.getUTCMonth() === targetMonth && d.getUTCFullYear() < target.getUTCFullYear()) perYear.set(d.getUTCFullYear(), (perYear.get(d.getUTCFullYear()) ?? 0) + 1);
    }
    // years in which the platform existed during that month but had zero events count as 0
    for (let y = first.getUTCFullYear(); y < target.getUTCFullYear(); y++) {
      const monthStart = Date.UTC(y, targetMonth, 1);
      if (monthStart >= Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1) && !perYear.has(y)) perYear.set(y, 0);
    }
    if (!perYear.size) continue;
    const vals = [...perYear.values()];
    const sameMonth = list.filter((p) => new Date(p.createdAt).getUTCMonth() === targetMonth && p.wilayaCode != null);
    const wc = new Map<number, number>();
    sameMonth.forEach((p) => wc.set(p.wilayaCode!, (wc.get(p.wilayaCode!) ?? 0) + 1));
    forecasts.push({
      category, month: ym(target),
      expected: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      low: Math.min(...vals), high: Math.max(...vals), basedOnYears: vals.length,
      topWilayas: [...wc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([wilayaCode, n]) => ({ wilayaCode, share: sameMonth.length ? n / sameMonth.length : 0 })),
    });
  }
  return { enough: forecasts.length > 0, historyMonths, totalEvents: valid.length, monthly, forecasts,
    reason: forecasts.length ? undefined : `لا توجد فئة بها ${MIN_EVENTS} نداءً على الأقل.` };
}
