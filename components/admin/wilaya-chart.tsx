"use client";

import { useAthar } from "@/lib/store";
import { useMemo } from "react";

export function WilayaChart() {
  const { alerts } = useAthar();
  const data = useMemo(() => {
    const m = new Map<string, { active: number; filtered: number }>();
    alerts.forEach((a) => {
      const e = m.get(a.wilaya) ?? { active: 0, filtered: 0 };
      if (a.status === "approved" || a.status === "pending") e.active++;
      if (a.status === "recycled" || a.status === "merged" || a.status === "rejected") e.filtered++;
      m.set(a.wilaya, e);
    });
    return [...m.entries()].map(([w, v]) => ({ w, ...v })).sort((a, b) => b.active + b.filtered - (a.active + a.filtered)).slice(0, 8);
  }, [alerts]);
  const max = Math.max(1, ...data.map((d) => d.active + d.filtered));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-slate-900">التوزيع حسب الولاية</h3>
        <div className="flex gap-3 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-brand-500 inline-block" /> نشط</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-fuchsia-400 inline-block" /> تمت تصفيته</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {data.map((d) => (
          <div key={d.w} className="flex items-center gap-3 text-sm">
            <div className="w-20 shrink-0 font-semibold text-slate-700 truncate">{d.w}</div>
            <div className="flex-1 flex h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-brand-500 transition-all duration-700" style={{ width: `${(d.active / max) * 100}%` }} />
              <div className="h-full bg-fuchsia-400 transition-all duration-700" style={{ width: `${(d.filtered / max) * 100}%` }} />
            </div>
            <div className="w-8 text-left text-xs font-bold tabular-nums text-slate-600">{d.active + d.filtered}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
