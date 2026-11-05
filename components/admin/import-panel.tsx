"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importCsv } from "@/app/actions/admin";

const KINDS = {
  institutions: { label: "مؤسسات (دور الشباب، مراكز حقن الدم…)", cols: "name_ar,name_fr,kind,wilaya_code,address,lat,lng,phone", note: "kind: youth_house | youth_center | hospital | blood_center | school | civil_protection | other" },
  shelters: { label: "مراكز إيواء", cols: "name,wilaya_code,capacity,lat,lng,phone", note: "تُستورد مغلقة؛ افتحها يدوياً عند الحاجة." },
  baladiyas: { label: "البلديات", cols: "wilaya_code,name_ar,name_fr,lat,lng,ons_code", note: "من مصدر رسمي (ONS/الجريدة الرسمية) أو OSM مع ذكر الترخيص." },
  historical: { label: "أرشيف منشورات قديمة معروفة", cols: "text,first_seen_at,wilaya_code,category,resolved_at", note: "منشورات قديمة متداولة رصدتموها فعلاً — تُستخدم لكشف إعادة التدوير." },
} as const;
type Kind = keyof typeof KINDS;

export function ImportPanel({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("institutions");
  const [csv, setCsv] = useState(""); const [source, setSource] = useState("");
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const onFile = async (f?: File) => { if (!f) return; if (f.size > 2 * 1024 * 1024) { setErr("الملف أكبر من 2 ميغا"); return; } setCsv(await f.text()); };
  return (
    <section className="grid lg:grid-cols-[1fr_300px] gap-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="font-black text-slate-900">استيراد بيانات مرجعية (CSV)</h2>
        <p className="text-xs text-slate-500">لا نخترع مؤسسات: هذه الجداول فارغة حتى تستوردوا قائمة موثوقة. اذكروا المصدر — يُحفظ مع كل سطر.</p>
        <div className="flex flex-wrap gap-1">{(Object.keys(KINDS) as Kind[]).map((k) => <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-full border px-3 py-1 text-xs font-bold ${kind === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"}`}>{KINDS[k].label}</button>)}</div>
        <div className="rounded-xl bg-slate-50 p-2 text-[11px]"><div className="font-mono" dir="ltr">{KINDS[kind].cols}</div><div className="text-slate-500 mt-1">{KINDS[kind].note}</div></div>
        <div><label htmlFor="src" className="text-xs font-bold">المصدر *</label><input id="src" value={source} onChange={(e) => setSource(e.target.value)} placeholder="مثال: قائمة المديرية الولائية — مراسلة رقم … بتاريخ …" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm"><Upload className="h-4 w-4" aria-hidden /> اختر ملف CSV (UTF-8)<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} /></label>
        <label htmlFor="csv" className="sr-only">محتوى CSV</label>
        <textarea id="csv" rows={6} dir="ltr" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={KINDS[kind].cols} className="w-full rounded-lg border border-slate-300 p-2 font-mono text-[11px]" />
        <Button disabled={pending || !csv.trim() || source.trim().length < 3} onClick={() => start(async () => { setErr(null); const r = await importCsv(kind, csv, source); if (r.ok) { setRes(r.data!); router.refresh(); } else setErr(r.error); })}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} استيراد
        </Button>
        {err && <p role="alert" className="text-xs text-red-700">{err}</p>}
        {res && <div role="status" className="rounded-xl bg-slate-50 p-3 text-xs"><b>{res.inserted}</b> أُضيف · <b>{res.skipped}</b> تُخطّي{res.errors.length > 0 && <ul className="mt-1 text-red-700">{res.errors.map((e) => <li key={e}>{e}</li>)}</ul>}</div>}
      </div>
      <aside className="rounded-3xl border border-slate-200 bg-white p-5 text-sm space-y-2">
        <h3 className="font-black">الحالة الحالية</h3>
        <div className="flex justify-between"><span>مؤسسات</span><b>{counts.institutions ?? 0}</b></div>
        <div className="flex justify-between"><span>مراكز إيواء</span><b>{counts.shelters ?? 0}</b></div>
        <div className="flex justify-between"><span>بلديات</span><b>{counts.baladiyas ?? 0}</b></div>
        <div className="flex justify-between"><span>أرشيف المنشورات</span><b>{counts.historical_posts ?? 0}</b></div>
        <p className="text-[11px] text-slate-500">الولايات 59–69 (تقسيم 2026) غير مُدرجة حتى التحقق من ترقيمها الرسمي. انظر docs/DATA_SOURCES.md.</p>
      </aside>
    </section>
  );
}
