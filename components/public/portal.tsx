"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Droplets, HandHeart, Waves, Baby, LayoutGrid, Stethoscope, GraduationCap, ShieldCheck, ScanSearch, Users, Wrench, Globe2, Camera, Clock } from "lucide-react";
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

  const ledger = [...alerts].sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt)).slice(0, 4);
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-8">
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

      {/* ── Hero: asymmetric editorial composition. Right: the promise. Left: the live verification ledger (real data). */}
      <section className="grid gap-8 border-b border-slate-200 pb-10 pt-4 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:pt-8">
        <div className="flex flex-col justify-center">
          <p className="eyebrow">منصة جزائرية · تحقّق، تطوّع، أثر</p>
          <h1 className="mt-5 font-display text-[2.1rem] leading-[1.3] text-ink sm:text-5xl sm:leading-[1.25]">
            كل نداء إنساني <span className="relative whitespace-nowrap text-brand-700">يُتحقَّق منه<svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-1 h-2.5 w-full text-clay-400"><path d="M2 8 C 50 2, 120 2, 198 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span> قبل أن يصل إليك.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-8 text-slate-600 sm:text-base">{t.portal.heroText}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/check" className="group inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-[15px] font-semibold text-paper transition-colors hover:bg-brand-800">
              <ScanSearch className="h-[18px] w-[18px]" aria-hidden /> {t.portal.ctaCheck}
            </Link>
            <a href="#alerts" className="link text-[15px] font-semibold text-ink">{t.portal.ctaAlerts} ←</a>
          </div>
          <dl className="mt-10 grid grid-cols-3 divide-x divide-x-reverse divide-slate-200 border-y border-slate-200">
            {([[stats.approved, t.portal.statApproved], [stats.filtered, t.portal.statFiltered], [stats.critical, t.portal.statCritical]] as const).map(([v, l], i) => (
              <div key={l} className="px-4 py-4 first:ps-0">
                <dd className={cn("font-display text-3xl tabular-nums sm:text-4xl", i === 1 ? "text-clay-500" : "text-ink")}>{v}</dd>
                <dt className="mt-1 text-xs leading-5 text-slate-500">{l}</dt>
              </div>
            ))}
          </dl>
        </div>

        <aside aria-label="سجل التحقق" className="relative overflow-hidden rounded-2xl bg-ink text-paper pattern-zellige">
          <div className="flex items-center justify-between px-5 pt-5 text-xs">
            <span className="font-semibold tracking-wide text-paper/70">سجل التحقق</span>
            <span className="flex items-center gap-1.5 text-brand-200"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300" aria-hidden /> مباشر</span>
          </div>
          <SealCanvas mode="hero" className="mx-auto h-[190px] w-full max-w-[360px] sm:h-[220px]" />
          <ol className="divide-y divide-white/10 border-t border-white/10">
            {ledger.length === 0 ? <li className="px-5 py-6 text-sm text-paper/60">{t.portal.emptyTitle}</li> : ledger.map((a) => (
              <li key={a.id}>
                <button onClick={() => { setFocusId(a.id); document.getElementById(`alert-${a.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }}
                  className="group flex w-full items-center gap-3 px-5 py-3 text-start transition-colors hover:bg-white/5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-base" aria-hidden>{CATEGORY_META[a.category].emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-paper">{a.title}</span>
                    <span className="block text-[11px] text-paper/55" suppressHydrationWarning>{a.wilaya} · {timeAgoIn(t.time, a.createdAt)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-200"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {t.card.reviewed}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-paper/55">الذكاء الاصطناعي يقترح، ومشرف الولاية يقرّر. لا شيء يظهر هنا قبل مراجعة بشرية.</p>
        </aside>
      </section>

      {/* ── How a request moves: four steps on one rule, not four cards */}
      <section aria-label="كيف يتحرك النداء" className="py-2">
        <ol className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
          {t.portal.steps.map((step, i) => (
            <li key={step} className="relative pe-4">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm text-brand-700 tabular-nums">0{i + 1}</span>
                <span className="h-px flex-1 bg-slate-300" aria-hidden />
              </div>
              <p className="mt-2 text-[13px] leading-6 text-slate-700">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Civic reporting: an editorial strip with a clay rule */}
      <Link href="/civic" className="group grid items-center gap-4 border-y border-slate-200 py-5 sm:grid-cols-[auto_1fr_auto]">
        <span className="font-display text-xl text-clay-600">صوّر وبلّغ</span>
        <span className="text-sm leading-7 text-slate-600 sm:border-s sm:border-slate-200 sm:ps-4">شفت مشكل في حيّك؟ حفرة، إنارة معطلة، نفايات… صوّرو، بلّغ عليه، وتابع إصلاحه مع مشرف ولايتك.</span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink"><Camera className="h-4 w-4 text-clay-500" aria-hidden /> <span className="link">بلّغ الآن</span></span>
      </Link>

      <header id="alerts" className="scroll-mt-24 space-y-4">
        <p className="eyebrow">01 · النداءات الموثّقة</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-ink sm:text-3xl">{t.portal.listTitle(visible.length)}</h2>
          <span className="text-xs text-slate-500">{t.portal.byUrgency}</span>
        </div>
        <div className="-mx-1 flex gap-5 overflow-x-auto border-b border-slate-200 px-1" role="toolbar" aria-label={t.portal.filterLabel}>
          {FILTERS.map(({ key, icon: Icon }) => {
            const label = key === "all" ? t.portal.filterAll : t.category[key];
            const count = key === "all" ? alerts.length : alerts.filter((a) => a.category === key).length;
            const on = filter === key;
            return (
              <button key={key} onClick={() => { setFilter(key); setFocusId(null); }} aria-pressed={on}
                className={cn("relative flex shrink-0 items-center gap-1.5 pb-3 pt-1 text-sm transition-colors",
                  on ? "font-semibold text-ink" : "text-slate-500 hover:text-ink")}>
                <Icon className="h-4 w-4" aria-hidden strokeWidth={on ? 2.2 : 1.8} /> {label}
                <span className="text-[11px] tabular-nums text-slate-400">{count}</span>
                {on && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-brand-600" aria-hidden />}
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div className="relative h-[420px] lg:h-[640px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <LiveMap alerts={visible} onHelp={setHelpTarget} focusId={focusId} shelters={shelters} />
          <Link href="/map" className="absolute top-3 end-3 z-[500] flex items-center gap-1.5 rounded-lg border border-slate-200 bg-paper px-3 py-2 text-xs font-semibold text-ink hover:bg-white">
            <Globe2 className="h-4 w-4 text-brand-700" aria-hidden /> الخريطة الكاملة
          </Link>
          <div className="absolute bottom-3 end-3 z-[500] flex gap-3 rounded-lg border border-slate-200 bg-paper px-3 py-2 text-[11px] font-medium text-slate-700">
            <Legend color="#dc2626" label={t.urgency.critical} /><Legend color="#ea580c" label={t.urgency.medium} /><Legend color="#16a34a" label={t.urgency.normal} />
            {shelters.length > 0 && <span className="flex items-center gap-1.5 text-red-700">🏛️ {t.portal.shelter}</span>}
          </div>
        </div>
        <aside className="space-y-3 lg:h-[640px] lg:overflow-y-auto pr-0.5" aria-label={t.portal.listLabel}>
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
        <section className="space-y-5">
          <p className="eyebrow">02 · إغلاق الحلقة</p>
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div>
              <h2 className="font-display text-2xl text-ink">{t.portal.reportsTitle}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{t.portal.reportsText}</p>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
              {reports.map((r) => {
                const cat = CATEGORY_META[r.category as Category] ?? CATEGORY_META.relief;
                return (
                  <li key={r.id} className="flex flex-col bg-white p-5">
                    <span className="text-[11px] font-medium text-slate-500">{cat.emoji} {t.category[r.category as Category] ?? r.category}</span>
                    <div className="mt-2 text-sm font-semibold leading-6 text-ink">{r.title}</div>
                    <blockquote className="mt-3 border-s-2 border-brand-500 ps-3 text-[13px] leading-6 text-slate-700">{r.outcome}</blockquote>
                    <dl className="mt-auto flex gap-5 pt-4 text-[11px] text-slate-500">
                      <div><dd className="font-display text-lg tabular-nums text-ink">{r.attended}</dd><dt className="flex items-center gap-1"><Users className="h-3 w-3" aria-hidden /> حضر</dt></div>
                      <div><dd className="font-display text-lg tabular-nums text-ink">{r.hours}</dd><dt className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden /> ساعة</dt></div>
                      <div className="ms-auto self-end" suppressHydrationWarning>{timeAgoIn(t.time, r.createdAt)}</div>
                    </dl>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      <HelpModal alert={helpTarget} onClose={() => setHelpTarget(null)} signedIn={signedIn} />
      <ShareCard alert={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden /> {label}</span>;
}
