"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { TreePine, Plus, Leaf, Globe2, MapPinned, Trophy, Sparkles, Map as MapIcon } from "lucide-react";
import { useAthar } from "@/lib/store";
import { CO2_PER_TREE_KG } from "@/lib/mock-data";
import { TreeCard } from "@/components/trees/tree-card";
import { AddTreeModal } from "@/components/trees/add-tree-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TreePost } from "@/lib/types";

const TreesMap = dynamic(() => import("@/components/trees/trees-map"), { ssr: false, loading: () => <div className="h-full w-full skeleton" /> });

export default function TreesPage() {
  const { trees, likeTree, profile } = useAthar();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"feed" | "mine">("feed");
  const [wilaya, setWilaya] = useState<string | "all">("all");
  const [focus, setFocus] = useState<TreePost | null>(null);

  const approved = trees.filter((t) => t.status === "approved");
  const mine = trees.filter((t) => t.mine);
  const base = 12_480; // simulated national baseline
  const total = base + approved.length;
  const leaderboard = useMemo(() => {
    const m = new Map<string, number>();
    approved.forEach((t) => m.set(t.wilaya, (m.get(t.wilaya) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [approved]);
  const feed = (tab === "mine" ? mine : approved).filter((t) => wilaya === "all" || t.wilaya === wilaya);
  const mapTrees = trees.filter((t) => t.status !== "rejected" && (t.status === "approved" || t.mine)).filter((t) => wilaya === "all" || t.wilaya === wilaya);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-700 via-green-800 to-slate-900 p-6 sm:p-8 text-white">
        <div className="absolute -left-10 -top-10 text-[180px] opacity-10 select-none">🌳</div>
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur"><Leaf className="h-3.5 w-3.5" /> الحملة الوطنية للتشجير · شجرة لكل شاب</div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-black leading-tight">غابة إيثار</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">اغرس شجرة، صوّرها، وشاركها. يتحقق مشرف مديرية الشباب من الصورة والموقع، فتظهر في الغابة الوطنية وتربح <b>50 نقطة</b> وشارة 🌳 — وتُحتسب في ترتيب ناديك وولايتك.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="bg-white text-emerald-800 hover:bg-emerald-50" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> أضف شجرتي</Button>
              {profile && <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 h-10 text-sm font-semibold"><Sparkles className="h-4 w-4" /> أشجارك: {mine.filter((t) => t.status === "approved").length} موثّقة · {mine.filter((t) => t.status === "pending").length} قيد المراجعة</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat icon={TreePine} v={total.toLocaleString("en-US")} l="شجرة موثّقة وطنياً" />
            <Stat icon={Globe2} v={`${Math.round((total * CO2_PER_TREE_KG) / 1000)} طن`} l="CO₂ يُمتص سنوياً" />
            <Stat icon={MapPinned} v={String(new Set(approved.map((t) => t.wilaya)).size + 31)} l="ولاية مشاركة" />
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* feed */}
        <div className="space-y-4">
          {/* map */}
          <div className="relative h-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
            <TreesMap trees={mapTrees} focus={focus} />
            <div className="absolute top-3 right-3 z-[500] flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow backdrop-blur"><MapIcon className="h-4 w-4 text-emerald-600" /> خريطة غابة إيثار · {mapTrees.length} شجرة</div>
            <div className="absolute bottom-3 right-3 z-[500] flex gap-3 rounded-2xl bg-white/90 px-3 py-1.5 text-[11px] font-semibold shadow backdrop-blur">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> موثّقة</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> قيد المراجعة</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> أشجاري</span>
            </div>
            {focus && <button onClick={() => setFocus(null)} className="absolute top-3 left-3 z-[500] rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow">عرض الكل</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl bg-slate-100 p-1">
              {([["feed", "الغابة الوطنية"], ["mine", "أشجاري"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={cn("rounded-xl px-4 py-1.5 text-sm font-bold", tab === k ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600")}>{l}</button>
              ))}
            </div>
            <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">
              <option value="all">كل الولايات</option>
              {[...new Set(trees.map((t) => t.wilaya))].map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          {feed.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              {tab === "mine" ? <>لم تضف أي شجرة بعد. <button onClick={() => setOpen(true)} className="font-bold text-emerald-700">أضف شجرتك الأولى 🌱</button></> : "لا توجد أشجار في هذه الولاية بعد — كن الأول!"}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {feed.map((t) => <TreeCard key={t.id} tree={t} onLike={() => likeTree(t.id)} onLocate={() => { setFocus(t); window.scrollTo({ top: 0, behavior: "smooth" }); }} active={focus?.id === t.id} />)}
          </div>
        </div>

        {/* sidebar */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-slate-900 mb-3"><Trophy className="h-5 w-5 text-amber-500" /> الولايات الأكثر تشجيراً</h3>
            <ol className="space-y-2">
              {leaderboard.map(([w, n], i) => (
                <li key={w} className="flex items-center gap-2 text-sm">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black", i === 0 ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-600")}>{i + 1}</span>
                  <span className="flex-1 font-semibold text-slate-800">{w}</span>
                  <span className="text-xs font-black text-emerald-700">{n} 🌳</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm text-sm space-y-2">
            <h3 className="font-black text-slate-900">كيف يعمل؟</h3>
            <Step n="1" t="اغرس شجرة في دار الشباب، مدرستك، أو حيّك." />
            <Step n="2" t="صوّرها وأرسلها (نوع الشجرة + الولاية + المكان)." />
            <Step n="3" t="يتحقق مشرف مديرية الشباب من الصورة والموقع." />
            <Step n="4" t="تظهر في الغابة الوطنية: +50 نقطة، شارة غارس 🌳، ونقاط لناديك." />
            <div className="rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800">🏆 كل ربيع: الولاية والنادي الأكثر تشجيراً يُكرَّمان في اليوم الوطني للشجرة (25 أكتوبر).</div>
          </div>
        </aside>
      </div>

      <AddTreeModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function Stat({ icon: Icon, v, l }: { icon: React.ElementType; v: string; l: string }) {
  return <div className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur"><Icon className="mx-auto h-4 w-4 mb-1 opacity-80" /><div className="text-xl font-black">{v}</div><div className="text-[10px] font-semibold text-white/75">{l}</div></div>;
}
function Step({ n, t }: { n: string; t: string }) {
  return <div className="flex gap-2 text-slate-700"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">{n}</span><span className="text-xs">{t}</span></div>;
}
