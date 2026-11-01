"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Droplets, HandHeart, Waves, Baby, LayoutGrid, Stethoscope, GraduationCap, Activity, ShieldCheck, Recycle, Send, Users, Clock, CheckCircle2 } from "lucide-react";
import type { Category, CrisisView, PublicAlert, ShelterView } from "@/lib/types";
import { AlertCard } from "@/components/public/alert-card";
import { HelpModal } from "@/components/public/help-modal";
import { CATEGORY_META, CRISIS_META } from "@/lib/reference/meta";
import { cn, timeAgo } from "@/lib/utils";

const LiveMap = dynamic(() => import("@/components/map/live-map"), { ssr: false, loading: () => <div className="h-full w-full rounded-3xl skeleton" /> });

const FILTERS: { key: Category | "all"; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "الكل", icon: LayoutGrid },
  { key: "blood", label: "تبرع بالدم", icon: Droplets },
  { key: "relief", label: "إغاثة", icon: HandHeart },
  { key: "cleanup", label: "بيئة", icon: Waves },
  { key: "orphans", label: "أيتام ومسنون", icon: Baby },
  { key: "medical", label: "طبي", icon: Stethoscope },
  { key: "education", label: "تعليم", icon: GraduationCap },
];
const ORDER = { critical: 0, medium: 1, normal: 2 } as const;

interface ReportCard { id: string; outcome: string; attended: number; hours: number; organization: string | null; createdAt: string; title: string; category: string }

export function Portal({ alerts, crises, shelters, stats, matches, signedIn, hasProfile, reports }: {
  alerts: PublicAlert[]; crises: CrisisView[]; shelters: ShelterView[];
  stats: { approved: number; critical: number; filtered: number };
  matches: { id: string; reasons: string[] }[]; signedIn: boolean; hasProfile: boolean; reports: ReportCard[];
}) {
  const [filter, setFilter] = useState<Category | "all">("all");
  const [helpTarget, setHelpTarget] = useState<PublicAlert | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const matchMap = useMemo(() => new Map(matches.map((m) => [m.id, m.reasons])), [matches]);

  const visible = useMemo(() => alerts
    .filter((a) => filter === "all" || a.category === filter)
    .sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency] || +new Date(b.createdAt) - +new Date(a.createdAt)), [alerts, filter]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
      {crises.map((c) => {
        const m = c.type !== "other" ? CRISIS_META[c.type] : null;
        const here = shelters.filter((s) => s.wilayaCode === c.wilayaCode);
        return (
          <section key={c.id} className="rounded-3xl border-2 border-red-500 bg-red-50 p-4 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
            <div>
              <div className="text-xs font-black text-red-600">🚨 وضع الطوارئ — {m?.emoji} {c.title} في {c.wilaya}</div>
              <div className="text-sm text-slate-700">
                {here.length ? <>مراكز الإيواء/التجمع المفعّلة تظهر على الخريطة (🏛️).</> : <>لم تُسجَّل بعد مراكز إيواء مفتوحة لهذه الحالة.</>}
                {m && <> الاحتياجات المتوقعة: <b>{m.needs.join("، ")}</b>.</>}
              </div>
            </div>
            <Link href={`/crisis/${c.id}`} className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-bold text-red-700">التفاصيل</Link>
          </section>
        );
      })}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand-700 via-emerald-700 to-slate-900 p-6 sm:p-8 text-white">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              <Activity className="h-3.5 w-3.5" aria-hidden /> نداءات راجعها مشرفون — تتحدث مباشرة
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-black leading-tight">الاحتياج الحقيقي، في وقته الحقيقي.</h1>
            <p className="mt-2 max-w-xl text-sm sm:text-base text-white/80">
              تصل النداءات عبر الاستمارة وتيليغرام وواتساب والمشرفين، يحللها إيثار ليكشف المنشورات القديمة والمكررة،
              ثم يراجعها مشرف قبل نشرها هنا.
            </p>
            <Link href="/submit" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand-800"><Send className="h-4 w-4" aria-hidden /> أرسل نداءً</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat value={stats.approved} label="نداء معتمد نشط" icon={ShieldCheck} />
            <Stat value={stats.critical} label="حالة حرجة" icon={Activity} accent />
            <Stat value={stats.filtered} label="منشور قديم/مكرر صُفّي" icon={Recycle} />
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="toolbar" aria-label="تصفية حسب الفئة">
        {FILTERS.map(({ key, label, icon: Icon }) => {
          const count = key === "all" ? alerts.length : alerts.filter((a) => a.category === key).length;
          return (
            <button key={key} onClick={() => { setFilter(key); setFocusId(null); }} aria-pressed={filter === key}
              className={cn("flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                filter === key ? "border-slate-900 bg-slate-900 text-white shadow" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400")}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
              <span className={cn("rounded-full px-1.5 text-[10px]", filter === key ? "bg-white/20" : "bg-slate-100")}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div className="relative h-[420px] lg:h-[640px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
          <LiveMap alerts={visible} onHelp={setHelpTarget} focusId={focusId} shelters={shelters} />
          <div className="absolute bottom-4 right-4 z-[500] flex gap-3 rounded-2xl bg-white/90 px-4 py-2 text-xs font-semibold shadow backdrop-blur">
            <Legend color="#dc2626" label="حرج" /><Legend color="#ea580c" label="متوسط" /><Legend color="#16a34a" label="عادي" />
            {shelters.length > 0 && <span className="flex items-center gap-1.5 text-red-700">🏛️ مركز إيواء</span>}
          </div>
        </div>
        <aside className="space-y-3 lg:h-[640px] lg:overflow-y-auto pr-0.5" aria-label="قائمة النداءات">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-slate-900">النداءات النشطة ({visible.length})</h2>
            <span className="text-xs text-slate-500">حسب الاستعجال</span>
          </div>
          {signedIn && !hasProfile && (
            <Link href="/profile" className="block rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 hover:bg-amber-100">
              ⭐ <b>أكمل ملفك التطوعي</b> (الولاية، المهارات، الفصيلة) ليقترح عليك إيثار النداءات المناسبة.
            </Link>
          )}
          {!signedIn && (
            <Link href="/login" className="block rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700 hover:bg-slate-50">
              سجّل الدخول للمشاركة في النداءات، تأكيد حضورك، وجمع ساعات تطوع موثّقة.
            </Link>
          )}
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              {alerts.length === 0 ? (
                <>
                  <div className="text-3xl mb-2" aria-hidden>🕊️</div>
                  <div className="font-bold text-slate-700">لا توجد نداءات معتمدة حالياً</div>
                  <p className="mt-1">تظهر هنا النداءات بعد مراجعة مشرف. هل تعرف حاجة حقيقية؟</p>
                  <Link href="/submit" className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 font-bold text-white">أرسل نداءً</Link>
                </>
              ) : "لا توجد نداءات نشطة في هذه الفئة حالياً."}
            </div>
          )}
          {visible.map((a) => (
            <div key={a.id}>
              <AlertCard alert={a} active={focusId === a.id} suggested={matchMap.has(a.id)}
                onSelect={() => setFocusId(focusId === a.id ? null : a.id)} onHelp={() => setHelpTarget(a)} />
              {matchMap.has(a.id) && <div className="px-3 pt-1 text-[10px] text-amber-700">لماذا مقترح: {matchMap.get(a.id)!.join(" · ")}</div>}
            </div>
          ))}
        </aside>
      </div>

      {reports.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-black text-slate-900 mb-1"><CheckCircle2 className="h-5 w-5 text-sky-600" aria-hidden /> إغلاق الحلقة — تقارير ما بعد النشاط</h2>
          <p className="text-xs text-slate-500 mb-4">يكتبها صاحب النداء أو مسؤول النادي ويعتمدها مشرف.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {reports.map((r) => {
              const cat = CATEGORY_META[r.category as Category] ?? CATEGORY_META.relief;
              return (
                <div key={r.id} className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span>
                  <div className="mt-2 font-bold text-slate-900 text-sm">{r.title}</div>
                  <div className="mt-1 text-xs text-sky-900 font-semibold">✅ {r.outcome}</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" aria-hidden /> {r.attended} حضر</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden /> {r.hours} ساعة</span>
                    {r.organization && <span>{r.organization}</span>}
                    <span>{timeAgo(r.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <HelpModal alert={helpTarget} onClose={() => setHelpTarget(null)} signedIn={signedIn} />
    </div>
  );
}

function Stat({ value, label, icon: Icon, accent }: { value: number; label: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl px-3 py-3 backdrop-blur", accent ? "bg-red-500/30 ring-1 ring-red-300/50" : "bg-white/10")}>
      <Icon className="mx-auto h-4 w-4 mb-1 opacity-80" aria-hidden />
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[10px] font-semibold text-white/75 leading-tight">{label}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden /> {label}</span>;
}
