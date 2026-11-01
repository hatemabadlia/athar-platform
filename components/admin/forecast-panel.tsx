import { TrendingUp, Info } from "lucide-react";
import type { ForecastResult } from "@/lib/forecast";
import { CATEGORY_META } from "@/lib/reference/meta";
import { findWilaya } from "@/lib/wilayas";
import type { Category } from "@/lib/types";

export function ForecastPanel({ result }: { result: ForecastResult }) {
  const max = Math.max(1, ...result.monthly.map((m) => m.count));
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-black text-slate-900"><TrendingUp className="h-5 w-5 text-brand-600" aria-hidden /> توقعات الاحتياج (نموذج)</h2>
        <p className="text-xs text-slate-500 mt-1">محسوبة من تاريخ المنصة فقط (نفس الشهر في السنوات السابقة). التوقع ليس احتياجاً مؤكداً.</p>
        {!result.enough ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 flex gap-2"><Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden /><div><b>لا توجد بيانات تاريخية كافية بعد.</b><div className="text-xs mt-1">{result.reason} · {result.totalEvents} نداء معتمد مسجّل.</div></div></div>
        ) : (
          <ul className="mt-4 space-y-3">{result.forecasts.map((f) => {
            const c = CATEGORY_META[f.category as Category];
            return (
              <li key={f.category} className="rounded-2xl border border-slate-200 p-3 text-sm">
                <div className="font-bold">{c?.emoji} {c?.labelAr ?? f.category} — {f.month}</div>
                <div className="text-xs text-slate-600">متوقع ≈ <b>{f.expected}</b> نداء (المدى {f.low}–{f.high}) بناءً على {f.basedOnYears} سنة</div>
                {f.topWilayas.length > 0 && <div className="text-[11px] text-slate-500">الأكثر تاريخياً: {f.topWilayas.map((w) => `${findWilaya(w.wilayaCode)?.nameAr} (${Math.round(w.share * 100)}%)`).join("، ")}</div>}
              </li>
            );
          })}</ul>
        )}
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">
          <b>إشارات خارجية:</b> لا يوجد مصدر عام مُتحقق منه مربوط حالياً (مثلاً نشرات الأرصاد). تُعرض هنا مع مصدرها وتاريخ جمعها عند ربطها.
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-900">الإحصاءات الفعلية الشهرية</h2>
        <p className="text-xs text-slate-500 mb-3">نداءات معتمدة/محلولة حسب شهر الإنشاء.</p>
        {result.monthly.length === 0 ? <p className="text-sm text-slate-500">لا بيانات بعد.</p> : (
          <ol className="space-y-1">{result.monthly.slice(-18).map((m) => (
            <li key={m.month} className="flex items-center gap-2 text-xs"><span className="w-16 font-mono" dir="ltr">{m.month}</span><span className="h-3 rounded bg-brand-500" style={{ width: `${(m.count / max) * 100}%`, minWidth: 4 }} aria-hidden /><span className="tabular-nums">{m.count}</span></li>
          ))}</ol>
        )}
      </section>
    </div>
  );
}
