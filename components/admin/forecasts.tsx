"use client";

import { TrendingUp, BrainCircuit } from "lucide-react";
import { FORECASTS, CATEGORY_META } from "@/lib/mock-data";

export function Forecasts() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 font-black text-slate-900"><BrainCircuit className="h-4 w-4 text-violet-600" /> توقعات الاحتياج (استباقي)</h3>
        <span className="text-[10px] text-slate-400">نموذج زمني على بيانات 3 سنوات</span>
      </div>
      <ul className="space-y-2.5">
        {FORECASTS.map((f, i) => {
          const cat = CATEGORY_META[f.category];
          return (
            <li key={i} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-violet-700">{f.when}</span>
                <span className="flex items-center gap-1 text-[10px] font-black text-slate-700"><TrendingUp className="h-3 w-3" /> {f.prob}%</span>
              </div>
              <div className="mt-0.5 text-sm font-bold text-slate-900">{cat.emoji} {f.what}</div>
              <div className="text-[11px] text-slate-500">{f.why}</div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-violet-500" style={{ width: `${f.prob}%` }} /></div>
              <div className="mt-1 text-[11px] font-semibold text-emerald-700">→ {f.action}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
