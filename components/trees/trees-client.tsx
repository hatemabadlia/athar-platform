"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TreePine, Plus, Trophy, MapPinned, Leaf, Map as MapIcon, Sparkles } from "lucide-react";
import type { TreeView } from "@/lib/types";
import { TreeCard } from "./tree-card";
import { AddTreeModal } from "./add-tree-modal";
import { Button } from "@/components/ui/button";
import { toggleLike } from "@/app/actions/trees";
import { cn } from "@/lib/utils";

const TreesMap = dynamic(() => import("./trees-map"), { ssr: false, loading: () => <div className="h-full w-full skeleton" /> });

export function TreesClient({ trees, viewerId, defaultWilaya }: { trees: TreeView[]; viewerId: string | null; defaultWilaya: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"feed" | "mine">("feed");
  const [wilaya, setWilaya] = useState<string>("all");
  const [focus, setFocus] = useState<TreeView | null>(null);
  const [, start] = useTransition();
  const [local, setLocal] = useState<Record<string, { liked: boolean; likes: number }>>({});

  const view = (t: TreeView) => (local[t.id] ? { ...t, likedByMe: local[t.id].liked, likes: local[t.id].likes } : t);
  const approved = trees.filter((t) => t.status === "approved");
  const mine = trees.filter((t) => t.mine);
  const leaderboard = useMemo(() => {
    const m = new Map<string, number>();
    approved.forEach((t) => m.set(t.wilaya, (m.get(t.wilaya) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [approved]);
  const feed = (tab === "mine" ? mine : approved).filter((t) => wilaya === "all" || t.wilaya === wilaya).map(view);
  const mapTrees = trees.filter((t) => t.status === "approved" || t.mine).filter((t) => t.status !== "rejected" && (wilaya === "all" || t.wilaya === wilaya));

  const like = (t: TreeView) => {
    if (!viewerId) { router.push("/login?next=/trees"); return; }
    const v = view(t);
    setLocal((l) => ({ ...l, [t.id]: { liked: !v.likedByMe, likes: v.likes + (v.likedByMe ? -1 : 1) } }));
    start(async () => { const r = await toggleLike(t.id, !v.likedByMe); if (!r.ok) setLocal((l) => ({ ...l, [t.id]: { liked: v.likedByMe, likes: v.likes } })); });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-ink pattern-zellige p-6 sm:p-8 text-white">
        <div className="absolute -left-10 -top-10 text-[180px] opacity-10 select-none" aria-hidden>🌳</div>
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold"><Leaf className="h-3.5 w-3.5" aria-hidden /> شجرة لكل شاب</div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-black leading-tight">غابة إيثار</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">اغرس شجرة، صوّرها، وأرسلها. يتحقق مشرف من الصورة والموقع، فتظهر في الغابة وتُحتسب لك <b>50 نقطة</b> بعد الاعتماد.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {viewerId ? <Button className="bg-white text-emerald-800 hover:bg-emerald-50" onClick={() => setOpen(true)}><Plus className="h-4 w-4" aria-hidden /> أضف شجرتي</Button>
                : <Link href="/login?next=/trees" className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-bold text-emerald-800">سجّل الدخول لإضافة شجرة</Link>}
              {viewerId && <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 h-10 text-sm font-semibold"><Sparkles className="h-4 w-4" aria-hidden /> أشجارك: {mine.filter((t) => t.status === "approved").length} موثّقة · {mine.filter((t) => t.status === "pending").length} قيد المراجعة</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <Stat icon={TreePine} v={String(approved.length)} l="شجرة موثّقة" />
            <Stat icon={MapPinned} v={String(new Set(approved.map((t) => t.wilaya)).size)} l="ولاية مشاركة" />
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-4">
          <div className="relative h-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
            <TreesMap trees={mapTrees} focus={focus} />
            <div className="absolute top-3 right-3 z-[500] flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow"><MapIcon className="h-4 w-4 text-emerald-600" aria-hidden /> {mapTrees.length} شجرة</div>
            {focus && <button onClick={() => setFocus(null)} className="absolute top-3 left-3 z-[500] rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow">عرض الكل</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl bg-slate-100 p-1" role="tablist">
              {([["feed", "الغابة"], ["mine", "أشجاري"]] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-xl px-4 py-1.5 text-sm font-bold", tab === k ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600")}>{l}</button>
              ))}
            </div>
            <label htmlFor="tw" className="sr-only">الولاية</label>
            <select id="tw" value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">
              <option value="all">كل الولايات</option>
              {[...new Set(trees.map((t) => t.wilaya))].map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          {feed.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              {tab === "mine" ? <>لم تضف أي شجرة بعد. {viewerId && <button onClick={() => setOpen(true)} className="font-bold text-emerald-700">أضف شجرتك الأولى 🌱</button>}</> : "لا توجد أشجار موثّقة بعد — كن الأول!"}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {feed.map((t) => <TreeCard key={t.id} tree={t} onLike={() => like(t)} onLocate={() => { setFocus(t); window.scrollTo({ top: 0, behavior: "smooth" }); }} active={focus?.id === t.id} />)}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-slate-900 mb-3"><Trophy className="h-5 w-5 text-amber-500" aria-hidden /> الولايات الأكثر تشجيراً</h2>
            {leaderboard.length === 0 ? <p className="text-xs text-slate-500">يظهر بعد اعتماد أول شجرة.</p> : (
              <ol className="space-y-2">{leaderboard.map(([w, n], i) => (
                <li key={w} className="flex items-center gap-2 text-sm"><span className={cn("flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black", i === 0 ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-600")}>{i + 1}</span><span className="flex-1 font-semibold text-slate-800">{w}</span><span className="text-xs font-black text-emerald-700">{n} 🌳</span></li>
              ))}</ol>
            )}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm text-xs text-slate-700 space-y-1.5">
            <h2 className="text-sm font-black text-slate-900">كيف يعمل التحقق؟</h2>
            <p>• الصورة إلزامية وتُخزّن بشكل خاص؛ تظهر للعموم فقط بعد الاعتماد.</p>
            <p>• تُزال بيانات EXIF (الموقع الدقيق والتاريخ) من النسخة المخزنة، ويُستخدم الفرق بين موقع الصورة والموقع المختار كإشارة للمشرف فقط.</p>
            <p>• يُعرض موقع الشجرة بدقة ~100 متر.</p>
          </div>
        </aside>
      </div>
      {open && <AddTreeModal open onClose={() => setOpen(false)} defaultWilaya={defaultWilaya} />}
    </div>
  );
}

function Stat({ icon: Icon, v, l }: { icon: React.ElementType; v: string; l: string }) {
  return <div className="rounded-2xl bg-white/10 px-3 py-3"><Icon className="mx-auto h-4 w-4 mb-1 opacity-80" aria-hidden /><div className="text-xl font-black">{v}</div><div className="text-[10px] font-semibold text-white/75">{l}</div></div>;
}
