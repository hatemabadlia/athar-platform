"use client";

import { MapPin, Clock, Users, ShieldCheck, Building2, Sparkles, Share2, Wrench, Wifi } from "lucide-react";
import type { PublicAlert } from "@/lib/types";
import { CATEGORY_META, URGENCY_META } from "@/lib/reference/meta";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { timeAgoIn } from "@/lib/i18n/dict";

export function AlertCard({
  alert,
  active,
  suggested,
  onSelect,
  onHelp,
  onShare,
}: {
  alert: PublicAlert;
  active?: boolean;
  suggested?: boolean;
  onSelect: () => void;
  onHelp: () => void;
  onShare?: () => void;
}) {
  const t = useT();
  const cat = CATEGORY_META[alert.category];
  const urg = URGENCY_META[alert.urgency];
  const needed = alert.volunteersNeeded;
  const remaining = needed > 0 ? Math.max(0, needed - alert.volunteersJoined) : null;
  const pct = needed > 0 ? Math.min(100, Math.round((alert.volunteersJoined / needed) * 100)) : 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border bg-white p-4 ps-5 transition-colors",
        active ? "border-ink" : "border-slate-200 hover:border-slate-400"
      )}
    >
      {/* urgency as a quiet edge rule rather than a glowing dot */}
      <span className="absolute inset-y-0 start-0 w-1" style={{ background: urg.hex }} aria-hidden />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            <span className="font-medium text-slate-600">{cat.emoji} {t.category[alert.category]}</span>
            <span className="text-slate-300" aria-hidden>·</span>
            <span className="font-semibold" style={{ color: urg.hex }}>{t.urgency[alert.urgency]}</span>
            <span className="ms-auto flex items-center gap-1 font-medium text-brand-700" title={t.card.reviewedTitle}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {t.card.reviewed}
            </span>
            {suggested && (
              <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
                <Sparkles className="h-3 w-3" aria-hidden /> {t.card.suggested}
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold leading-6 text-ink">
            <button type="button" aria-pressed={active} onClick={(e) => { e.stopPropagation(); onSelect(); }} className="text-start hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded">
              {alert.title}<span className="sr-only"> — {t.card.showOnMap}</span>
            </button>
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden /> {alert.wilaya}{alert.baladiya ? ` · ${alert.baladiya}` : ""}</span>
            <span className="flex items-center gap-1" suppressHydrationWarning><Clock className="h-3 w-3" aria-hidden /> {timeAgoIn(t.time, alert.createdAt)}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" aria-hidden /> {t.card.volunteers(alert.volunteersJoined, needed)}</span>
            {alert.institution && <span className="flex items-center gap-1 text-indigo-600"><Building2 className="h-3 w-3" aria-hidden /> {alert.institution}</span>}
          </div>
          {alert.requiredSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <Wrench className="h-3 w-3 text-teal-600" aria-hidden />
              {alert.requiredSkills.map((s) => <span key={s} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">{s}</span>)}
              {alert.remoteOk && <span className="flex items-center gap-0.5 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800"><Wifi className="h-3 w-3" aria-hidden /> عن بُعد</span>}
            </div>
          )}
          {needed > 0 && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: urg.hex }} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); onHelp(); }}
        disabled={remaining === 0 && !alert.joinedByMe}
        className="flex-1 rounded-lg bg-ink py-2 text-xs font-semibold text-paper transition-colors hover:bg-brand-800 disabled:bg-slate-100 disabled:text-slate-400"
      >
        {alert.joinedByMe ? t.card.joined : remaining === 0 ? t.card.full : t.card.help(remaining)}
      </button>
      {onShare && (
        <button onClick={(e) => { e.stopPropagation(); onShare(); }} aria-label="مشاركة النداء" title="مشاركة النداء"
          className="rounded-lg border border-slate-200 px-3 text-slate-500 transition-colors hover:border-slate-400 hover:text-ink">
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      )}
      </div>
    </div>
  );
}
