"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Droplets, HandHeart, Waves, Baby, LayoutGrid, Stethoscope, GraduationCap, Activity, ShieldCheck, Recycle, ScanSearch, Users, Wrench, Globe2, Camera, Clock, CheckCircle2 } from "lucide-react";
import type { Category, CrisisView, PublicAlert, ShelterView } from "@/lib/types";
import { AlertCard } from "@/components/public/alert-card";
import { HelpModal } from "@/components/public/help-modal";
import { ShareCard } from "@/components/public/share-card";
import { SealCanvas } from "@/components/three/seal-canvas";
import { CATEGORY_META, CRISIS_META } from "@/lib/reference/meta";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { timeAgoIn } from "@/lib/i18n/dict";

const LiveMap = dynamic(() => import("@/components/map/live-map"), { ssr: false, loading: () => <div className="h-full w-full rounded-3xl skeleton" /> });

const FILTERS: { key: Category | "all"; icon: React.ElementType }[] = [
  { key: "all", icon: LayoutGrid }, { key: "blood", icon: Droplets }, { key: "relief", icon: HandHeart }, { key: "cleanup", icon: Waves },
  { key: "orphans", icon: Baby }, { key: "medical", icon: Stethoscope }, { key: "education", icon: GraduationCap }, { key: "skills", icon: Wrench },
];
const ORDER = { critical: 0, medium: 1, normal: 2 } as const;

interface ReportCard { id: string; outcome: string; attended: number; hours: number; organization: string | null; createdAt: string; title: string; category: string }

export function Portal({ alerts, crises, shelters, stats, matches, signedIn, hasProfile, reports }: {
  alerts: PublicAlert[]; crises: CrisisView[]; shelters: ShelterView[];
  stats: { approved: number; critical: number; filtered: number };
  matches: { id: string; reasons: string[] }[]; signedIn: boolean; hasProfile: boolean; reports: ReportCard[];
}) {
  const t = useT();
  const [filter, setFilter] = useState<Category | "all">("all");
  const [helpTarget, setHelpTarget] = useState<PublicAlert | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<PublicAlert | null>(null);
  // Shared links open as /?alert=<id>: focus that alert on the map and in the list.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("alert");
    if (id && alerts.some((a) => a.id === id)) {
      setFocusId(id);
      requestAnimationFrame(() => document.getElementById(`alert-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
  }, [alerts]);
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
              <div className="text-xs font-black text-red-600">{t.portal.crisisMode(`${m?.emoji ?? ""} ${c.title}`, c.wilaya)}</div>
              <div className="text-sm text-slate-700">
                {here.length ? t.portal.sheltersOnMap : t.portal.noShelters}
                {m && <> {t.portal.expectedNeeds} <b>{m.needs.join("، ")}</b>.</>}
              </div>
            </div>
            <Link href={`/crisis/${c.id}`} className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-bold text-red-700">{t.crisis.details}</Link>
          </section>
        );
      })}

      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(6,95,70,0.5),transparent_60%)]" aria-hidden />
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-white/15">
              <Activity className="h-3.5 w-3.5" aria-hidden /> {t.portal.liveBadge}
            </div>
            <h1 className="mt-4 text-3xl sm:text-5xl font-black leading-[1.15] tracking-tight">{t.portal.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-lg leading-relaxed text-slate-300">{t.portal.heroText}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/check" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm sm:text-base font-black text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"><ScanSearch className="h-5 w-5" aria-hidden /> {t.portal.ctaCheck}</Link>
              <a href="#alerts" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm sm:text-base font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15"><ShieldCheck className="h-5 w-5" aria-hidden /> {t.portal.ctaAlerts}</a>
            </div>
          </div>
          <div>
            <SealCanvas mode="hero" className="mx-auto h-[220px] w-full max-w-[420px] sm:h-[280px]" />
            <div className="mt-1 grid grid-cols-3 gap-3 text-center">
              <Stat value={stats.filtered} label={t.portal.statFiltered} icon={Recycle} accent />
              <Stat value={stats.approved} label={t.portal.statApproved} icon={ShieldCheck} />
              <Stat value={stats.critical} label={t.portal.statCritical} icon={Activity} />
            </div>
          </div>
        </div>
        <ol className="relative grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
          {t.portal.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3 bg-slate-950/80 px-4 py-3 text-xs sm:text-sm text-slate-300">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-black text-emerald-300">{i + 1}</span>{step}
            </li>
          ))}
        </ol>
      </section>

      <Link href="/civic" className="group flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-orange-200 bg-gradient-to-l from-orange-50 to-white p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white"><Camera className="h-5 w-5" aria-hidden /></span>
          <div><div className="font-black text-slate-900">جديد: صوّر وبلّغ</div><div className="text-sm text-slate-600">شفت مشكل في حيّك؟ حفرة، إنارة، نفايات… صوّرو، بلّغ عليه، وتابع إصلاحه.</div></div>
        </div>
        <span className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-black text-white group-hover:bg-orange-700">بلّغ الآن</span>
      </Link>

      <div id="alerts" className="scroll-mt-24 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="toolbar" aria-label={t.portal.filterLabel}>
        {FILTERS.map(({ key, icon: Icon }) => {
          const label = key === "all" ? t.portal.filterAll : t.category[key];
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
          <Link href="/map" className="absolute top-4 end-4 z-[500] flex items-center gap-1.5 rounded-2xl bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow backdrop-blur hover:bg-white">
            <Globe2 className="h-4 w-4 text-emerald-700" aria-hidden /> خريطة إيثار الكاملة
          </Link>
          <div className="absolute bottom-4 end-4 z-[500] flex gap-3 rounded-2xl bg-white/90 px-4 py-2 text-xs font-semibold shadow backdrop-blur">
            <Legend color="#dc2626" label={t.urgency.critical} /><Legend color="#ea580c" label={t.urgency.medium} /><Legend color="#16a34a" label={t.urgency.normal} />
            {shelters.length > 0 && <span className="flex items-center gap-1.5 text-red-700">🏛️ {t.portal.shelter}</span>}
          </div>
        </div>
        <aside className="space-y-3 lg:h-[640px] lg:overflow-y-auto pr-0.5" aria-label={t.portal.listLabel}>
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-slate-900">{t.portal.listTitle(visible.length)}</h2>
            <span className="text-xs text-slate-500">{t.portal.byUrgency}</span>
          </div>
          {signedIn && !hasProfile && (
            <Link href="/profile" className="block rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 hover:bg-amber-100">
              ⭐ {t.portal.completeProfile}
            </Link>
          )}
          {!signedIn && (
            <Link href="/login" className="block rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700 hover:bg-slate-50">
              {t.portal.loginCta}
            </Link>
          )}
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              {alerts.length === 0 ? (
                <>
                  <div className="text-3xl mb-2" aria-hidden>🕊️</div>
                  <div className="font-bold text-slate-700">{t.portal.emptyTitle}</div>
                  <p className="mt-1">{t.portal.emptyText}</p>
                  <Link href="/submit" className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 font-bold text-white">{t.nav.submit}</Link>
                </>
              ) : t.portal.emptyCategory}
            </div>
          )}
          {visible.map((a) => (
            <div key={a.id} id={`alert-${a.id}`}>
              <AlertCard alert={a} active={focusId === a.id} suggested={matchMap.has(a.id)}
                onSelect={() => setFocusId(focusId === a.id ? null : a.id)} onHelp={() => setHelpTarget(a)} onShare={() => setShareTarget(a)} />
              {matchMap.has(a.id) && <div className="px-3 pt-1 text-[10px] text-amber-700">{t.portal.whySuggested} {matchMap.get(a.id)!.join(" · ")}</div>}
            </div>
          ))}
        </aside>
      </div>

      {reports.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-black text-slate-900 mb-1"><CheckCircle2 className="h-5 w-5 text-sky-600" aria-hidden /> {t.portal.reportsTitle}</h2>
          <p className="text-xs text-slate-500 mb-4">{t.portal.reportsText}</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {reports.map((r) => {
              const cat = CATEGORY_META[r.category as Category] ?? CATEGORY_META.relief;
              return (
                <div key={r.id} className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {t.category[r.category as Category] ?? r.category}</span>
                  <div className="mt-2 font-bold text-slate-900 text-sm">{r.title}</div>
                  <div className="mt-1 text-xs text-sky-900 font-semibold">✅ {r.outcome}</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" aria-hidden /> {t.portal.attended(r.attended)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden /> {t.portal.hours(r.hours)}</span>
                    {r.organization && <span>{r.organization}</span>}
                    <span suppressHydrationWarning>{timeAgoIn(t.time, r.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <HelpModal alert={helpTarget} onClose={() => setHelpTarget(null)} signedIn={signedIn} />
      <ShareCard alert={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}

function Stat({ value, label, icon: Icon, accent }: { value: number; label: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl px-3 py-3", accent ? "bg-emerald-500/15 ring-1 ring-emerald-400/30" : "bg-white/5 ring-1 ring-white/10")}>
      <Icon className={cn("mx-auto mb-1 h-4 w-4", accent ? "text-emerald-300" : "text-slate-400")} aria-hidden />
      <div>
        <div className="text-2xl font-black tabular-nums">{value}</div>
        <div className="text-[10px] font-semibold leading-tight text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden /> {label}</span>;
}
