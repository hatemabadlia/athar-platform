"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, AlertTriangle } from "lucide-react";
import type { TreeView } from "@/lib/types";
import { TreePhoto } from "@/components/trees/tree-photo";
import { reviewTree } from "@/app/actions/trees";
import { timeAgo } from "@/lib/utils";

export function TreeReview({ trees }: { trees: TreeView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  if (!trees.length) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">لا أشجار بانتظار المراجعة في نطاقك.</div>;
  return (
    <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {err && <p role="alert" className="sm:col-span-3 text-xs text-red-700">{err}</p>}
      {trees.map((t) => {
        const lc = t.locationCheck as { exif_distance_km?: number; photo_age_days?: number; gps_source?: string; exif_present?: boolean };
        const flags = [
          lc.exif_distance_km != null && lc.exif_distance_km > 5 && `موقع الصورة يبعد ${lc.exif_distance_km} كم عن الموقع المختار`,
          lc.photo_age_days != null && lc.photo_age_days > 30 && `الصورة التُقطت قبل ${lc.photo_age_days} يوماً`,
          !lc.exif_present && "لا توجد بيانات EXIF (قد تكون صورة معاد إرسالها)",
        ].filter(Boolean) as string[];
        return (
          <article key={t.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="aspect-[4/3]"><TreePhoto photo={t.photoUrl} species={t.species} wilaya={t.wilaya} /></div>
            <div className="p-3 text-sm space-y-1">
              <div className="font-bold">{t.species} · {t.wilaya}</div>
              <div className="text-xs text-slate-500">{t.place} · {t.userName || "متطوع"} · {timeAgo(t.createdAt)}</div>
              {t.note && <p className="text-xs text-slate-700">{t.note}</p>}
              <div className="text-[11px] text-slate-500">مصدر الموقع: {lc.gps_source === "device" ? "GPS الهاتف" : "اختيار على الخريطة"}{lc.exif_distance_km != null ? ` · فرق EXIF ${lc.exif_distance_km} كم` : ""}</div>
              {flags.map((f) => <div key={f} className="flex items-center gap-1 text-[11px] text-amber-700"><AlertTriangle className="h-3 w-3" aria-hidden />{f}</div>)}
              <div className="flex gap-2 pt-2">
                <button disabled={pending} onClick={() => start(async () => { const r = await reviewTree(t.id, true); if (!r.ok) setErr(r.error); else router.refresh(); })} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white"><Check className="h-4 w-4" aria-hidden /> اعتماد</button>
                <button disabled={pending} onClick={() => start(async () => { const r = await reviewTree(t.id, false); if (!r.ok) setErr(r.error); else router.refresh(); })} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-red-600 py-1.5 text-xs font-bold text-white"><X className="h-4 w-4" aria-hidden /> رفض</button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
