"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Map as MapIcon, List, Search, X, Users, Camera, Clock } from "lucide-react";
import type { CivicPublic } from "@/lib/data/civic";
import { CIVIC_CATEGORIES, CIVIC_CATEGORY_KEYS, CIVIC_PUBLIC_STATUSES, CIVIC_SEVERITY, CIVIC_STATUS, type CivicCategory, type CivicStatus } from "@/lib/civic";
import { WILAYAS } from "@/lib/wilayas";
import { cn } from "@/lib/utils";

const CivicMap = dynamic(() => import("@/components/civic/civic-map"), { ssr: false, loading: () => <div className="h-full w-full skeleton" /> });

export function CivicExplorer({ reports, thumbs }: { reports: CivicPublic[]; thumbs: Record<string, string> }) {
  const [view, setView] = useState<"map" | "list">("map");
  const [cat, setCat] = useState<CivicCategory | "">("");
  const [status, setStatus] = useState<CivicStatus | "">("");
  const [w, setW] = useState<number | "">("");
  const [selected, setSelected] = useState<CivicPublic | null>(null);
  const [target, setTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [q, setQ] = useState("");
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const visible = useMemo(() => reports.filter((r) => (!cat || r.category === cat) && (!status || r.status === status) && (!w || r.wilayaCode === w)), [reports, cat, status, w]);
  const search = async () => {
    if (q.trim().length < 3) return;
    setSearchMsg(null);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=dz&limit=1&accept-language=ar&q=${encodeURIComponent(q)}`);
      const [hit] = (await r.json()) as { lat: string; lon: string; display_name: string }[];
      if (!hit) { setSearchMsg("لم نجد هذا المكان."); return; }
      setView("map"); setTarget({ lat: +hit.lat, lng: +hit.lon, zoom: 14 }); setSearchMsg(hit.display_name.split(",").slice(0, 2).join("،"));
    } catch { setSearchMsg("البحث غير متاح حالياً."); }
  };
  const select = (r: CivicPublic) => { setSelected(r); setTarget({ lat: r.lat, lng: r.lng, zoom: 16 }); };
  const sel = "rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">خريطة صوّر وبلّغ</h1>
          <p className="text-sm text-slate-600">بلاغات تحقق منها مشرفو الولايات. لون الإطار = الحالة، الرمز = نوع المشكل.</p>
        </div>
        <Link href="/civic/new" className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white"><Camera className="h-4 w-4" aria-hidden /> بلّغ عن مشكل</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="f-cat">الفئة</label>
        <select id="f-cat" value={cat} onChange={(e) => setCat(e.target.value as CivicCategory | "")} className={sel}>
          <option value="">كل الفئات</option>{CIVIC_CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CIVIC_CATEGORIES[k].emoji} {CIVIC_CATEGORIES[k].ar}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-st">الحالة</label>
        <select id="f-st" value={status} onChange={(e) => setStatus(e.target.value as CivicStatus | "")} className={sel}>
          <option value="">كل الحالات</option>{CIVIC_PUBLIC_STATUSES.map((k) => <option key={k} value={k}>{CIVIC_STATUS[k].ar}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-w">الولاية</label>
        <select id="f-w" value={w} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : ""; setW(v); const x = WILAYAS.find((y) => y.code === v); if (x) setTarget({ lat: x.lat, lng: x.lng, zoom: 10 }); }} className={sel}>
          <option value="">كل الولايات</option>{WILAYAS.map((x) => <option key={x.code} value={x.code}>{x.code} - {x.nameAr}</option>)}
        </select>
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex min-w-[200px] flex-1 gap-1">
          <label className="sr-only" htmlFor="f-q">ابحث عن منطقة</label>
          <input id="f-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن حي أو بلدية…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs" />
          <button className="rounded-xl border border-slate-200 bg-white px-3" aria-label="بحث"><Search className="h-4 w-4" /></button>
        </form>
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
          {([["map", "خريطة", MapIcon], ["list", "قائمة", List]] as const).map(([k, l, Icon]) => (
            <button key={k} onClick={() => setView(k)} aria-pressed={view === k} className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold", view === k ? "bg-slate-900 text-white" : "text-slate-600")}><Icon className="h-3.5 w-3.5" aria-hidden />{l}</button>
          ))}
        </div>
      </div>
      {searchMsg && <p className="text-xs text-slate-500">{searchMsg}</p>}
      <p className="text-xs text-slate-500">{visible.length} بلاغ معروض</p>

      {view === "map" ? (
        <div className="relative h-[calc(100vh-300px)] min-h-[440px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
          <CivicMap reports={visible} selectedId={selected?.id ?? null} onSelect={select} target={target} />
          {visible.length === 0 && <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center"><p className="rounded-2xl bg-white/95 px-4 py-3 text-sm font-bold text-slate-600 shadow">لا توجد بلاغات موثّقة بهذه التصفية.</p></div>}
          {selected && (
            <div className="absolute inset-x-3 bottom-3 z-[600] mx-auto max-w-md rounded-3xl bg-white p-4 shadow-2xl sm:inset-x-auto sm:end-3 sm:top-3 sm:bottom-auto sm:w-[340px]">
              <button onClick={() => setSelected(null)} aria-label="إغلاق" className="absolute top-3 end-3 text-slate-400"><X className="h-4 w-4" /></button>
              <ReportCard r={selected} thumb={thumbs[selected.id]} />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.length === 0 ? <p className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد بلاغات موثّقة بهذه التصفية.</p>
            : visible.map((r) => <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-4"><ReportCard r={r} thumb={thumbs[r.id]} /></div>)}
        </div>
      )}
    </div>
  );
}

function ReportCard({ r, thumb }: { r: CivicPublic; thumb?: string }) {
  const c = CIVIC_CATEGORIES[r.category] ?? CIVIC_CATEGORIES.other;
  const st = CIVIC_STATUS[r.status];
  return (
    <div>
      { }
      {thumb && <img src={thumb} alt="" className="mb-3 h-36 w-full rounded-2xl object-cover" />}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold">{c.emoji} {c.ar}</span>
        <span className={cn("rounded-full px-2 py-0.5 font-bold", CIVIC_SEVERITY[r.severity].cls)}>{CIVIC_SEVERITY[r.severity].ar}</span>
        <span className="rounded-full px-2 py-0.5 font-black text-white" style={{ background: st.color }}>{st.ar}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">{r.description}</p>
      <p className="mt-1 text-[11px] text-slate-500">{r.address ?? r.wilaya}</p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Users className="h-3 w-3" aria-hidden />{r.supporters} دعم</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{new Date(r.createdAt).toLocaleDateString("ar-DZ")}</span>
        <Link href={`/civic/r/${r.ref}`} className="font-black text-orange-700 underline">التفاصيل</Link>
      </div>
    </div>
  );
}
