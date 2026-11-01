"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Droplets, HandHeart, Waves, Baby, LayoutGrid, Stethoscope, GraduationCap, Activity, ShieldCheck, Recycle } from "lucide-react";
import { useAthar } from "@/lib/store";
import type { Alert, Category } from "@/lib/types";
import { AlertCard } from "@/components/public/alert-card";
import { HelpModal } from "@/components/public/help-modal";
import { ImpactSection } from "@/components/public/impact-section";
import { SHELTERS, CRISIS_META } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import Link from "next/link";

const LiveMap = dynamic(() => import("@/components/map/live-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-3xl skeleton" />,
});

const FILTERS: { key: Category | "all"; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "الكل", icon: LayoutGrid },
  { key: "blood", label: "تبرع بالدم", icon: Droplets },
  { key: "relief", label: "إغاثة", icon: HandHeart },
  { key: "cleanup", label: "تنظيف", icon: Waves },
  { key: "orphans", label: "أيتام", icon: Baby },
  { key: "medical", label: "طبي", icon: Stethoscope },
  { key: "education", label: "تعليم", icon: GraduationCap },
];

export default function PublicPortal() {
  const { alerts, stats, matchedAlerts, profile, crisis } = useAthar();
  const shelters = crisis ? SHELTERS.filter((s) => s.wilayaCode === crisis.wilayaCode) : [];
  const [filter, setFilter] = useState<Category | "all">("all");
  const [helpTarget, setHelpTarget] = useState<Alert | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      alerts
        .filter((a) => a.status === "approved")
        .filter((a) => filter === "all" || a.category === filter)
        .sort((a, b) => {
          const order = { critical: 0, medium: 1, normal: 2 };
          return order[a.urgency] - order[b.urgency] || +new Date(b.postedAt) - +new Date(a.postedAt);
        }),
    [alerts, filter]
  );

  const critical = visible.filter((a) => a.urgency === "critical").length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
      {/* Hero strip */}
      {crisis && (
        <section className="rounded-3xl border-2 border-red-500 bg-red-50 p-4 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
          <div>
            <div className="text-xs font-black text-red-600">🚨 وضع الطوارئ — {CRISIS_META[crisis.type].emoji} {CRISIS_META[crisis.type].label} في {crisis.wilaya}</div>
            <div className="text-sm text-slate-700">دور الشباب في {crisis.wilaya} مفتوحة كمراكز إيواء وتجمع (🏛️ على الخريطة). الاحتياجات العاجلة: <b>{CRISIS_META[crisis.type].needs.join("، ")}</b>. المتطوعون المسجّلون تلقّوا SMS.</div>
          </div>
          <div className="text-center rounded-2xl bg-white px-4 py-2"><div className="text-2xl font-black text-red-600">{shelters.length}</div><div className="text-[10px] text-slate-500">مركز مفعّل</div></div>
        </section>
      )}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand-700 via-emerald-700 to-slate-900 p-6 sm:p-8 text-white">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              <Activity className="h-3.5 w-3.5 animate-pulse" /> بث مباشر · يتم التحديث من فيسبوك، X، إنستغرام و واتساب
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-black leading-tight">
              الاحتياج الحقيقي، في وقته الحقيقي.
            </h1>
            <p className="mt-2 max-w-xl text-sm sm:text-base text-white/80">
              إيثار يقرأ آلاف المنشورات يومياً، يتحقق منها بالذكاء الاصطناعي، ويصفّي النداءات القديمة
              والمكررة — لتذهب جهودك حيث تُحدث أثراً.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat value={stats.verifiedActive} label="نداء موثّق نشط" icon={ShieldCheck} />
            <Stat value={critical} label="حالة حرجة الآن" icon={Activity} accent />
            <Stat value={stats.recycledFiltered} label="منشور قديم تمت تصفيته" icon={Recycle} />
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map(({ key, label, icon: Icon }) => {
          const count = key === "all" ? alerts.filter((a) => a.status === "approved").length : alerts.filter((a) => a.status === "approved" && a.category === key).length;
          return (
            <button
              key={key}
              onClick={() => { setFilter(key); setFocusId(null); }}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                filter === key
                  ? "border-slate-900 bg-slate-900 text-white shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
              <span className={cn("rounded-full px-1.5 text-[10px]", filter === key ? "bg-white/20" : "bg-slate-100")}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Map + list */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div className="relative h-[420px] lg:h-[640px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
          <LiveMap alerts={visible} onHelp={setHelpTarget} focusId={focusId} shelters={shelters} />
          <div className="absolute bottom-4 right-4 z-[500] flex gap-3 rounded-2xl bg-white/90 px-4 py-2 text-xs font-semibold shadow backdrop-blur">
            <Legend color="#dc2626" label="حرج" />
            <Legend color="#ea580c" label="متوسط" />
            <Legend color="#16a34a" label="عادي" />
            {crisis && <span className="flex items-center gap-1.5 text-red-700">🏛️ مركز إيواء</span>}
          </div>
        </div>
        <aside className="space-y-3 lg:h-[640px] lg:overflow-y-auto pr-0.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-slate-900">النداءات النشطة ({visible.length})</h2>
            <span className="text-xs text-slate-500">مرتبة حسب الاستعجال</span>
          </div>
          {!profile && (
            <Link href="/profile" className="block rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 hover:bg-amber-100">
              ⭐ <b>أنشئ ملفك التطوعي</b> ليقترح عليك إيثار النداءات المناسبة لولايتك وفصيلة دمك ومهاراتك، وتجمع نقاطاً وشارات.
            </Link>
          )}
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              لا توجد نداءات نشطة في هذه الفئة حالياً.
            </div>
          )}
          {visible.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              active={focusId === a.id}
              suggested={matchedAlerts.some((m) => m.id === a.id)}
              onSelect={() => setFocusId(focusId === a.id ? null : a.id)}
              onHelp={() => setHelpTarget(a)}
            />
          ))}
        </aside>
      </div>

      <ImpactSection />

      <HelpModal alert={helpTarget} onClose={() => setHelpTarget(null)} />
    </div>
  );
}

function Stat({ value, label, icon: Icon, accent }: { value: number; label: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl px-3 py-3 backdrop-blur", accent ? "bg-red-500/30 ring-1 ring-red-300/50" : "bg-white/10")}>
      <Icon className="mx-auto h-4 w-4 mb-1 opacity-80" />
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[10px] font-semibold text-white/75 leading-tight">{label}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}
