"use client";

import { CheckCircle2, Users, Clock, Building2 } from "lucide-react";
import { useAthar } from "@/lib/store";
import { CATEGORY_META } from "@/lib/mock-data";
import { timeAgo } from "@/lib/utils";

export function ImpactSection() {
  const { alerts } = useAthar();
  const done = alerts.filter((a) => a.status === "resolved" && a.report);
  if (!done.length) return null;
  const hours = done.reduce((s, a) => s + (a.report?.hours ?? 0), 0);
  const people = done.reduce((s, a) => s + (a.report?.attended ?? 0), 0);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="flex items-center gap-2 font-black text-slate-900"><CheckCircle2 className="h-5 w-5 text-sky-600" /> ماذا تحقق هذا الأسبوع؟ — إغلاق الحلقة</h2>
          <p className="text-xs text-slate-500">كل نداء يُحل يُوثَّق بتقرير إنجاز من الجمعية والنادي — الشفافية تبني الثقة في العمل التطوعي.</p>
        </div>
        <div className="flex gap-4 text-center">
          <div><div className="text-xl font-black text-sky-700">{done.length}</div><div className="text-[10px] text-slate-500">نداء مُنجز</div></div>
          <div><div className="text-xl font-black text-sky-700">{people}</div><div className="text-[10px] text-slate-500">متطوع حضر</div></div>
          <div><div className="text-xl font-black text-sky-700">{hours}</div><div className="text-[10px] text-slate-500">ساعة تطوعية</div></div>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {done.map((a) => {
          const cat = CATEGORY_META[a.category];
          return (
            <div key={a.id} className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-4">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span>
              <div className="mt-2 font-bold text-slate-900 text-sm">{a.title}</div>
              <div className="mt-1 text-xs text-sky-900 font-semibold">✅ {a.report!.outcome}</div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {a.report!.attended} متطوع</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.report!.hours} ساعة</span>
                {a.report!.club && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {a.report!.club}</span>}
                <span>{timeAgo(a.postedAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
