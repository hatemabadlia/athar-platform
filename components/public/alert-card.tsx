"use client";

import { MapPin, Clock, Users, ShieldCheck, Building2, Sparkles, Share2 } from "lucide-react";
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
        "group cursor-pointer rounded-2xl border bg-white p-4 transition-all hover:shadow-md",
        active ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 h-3 w-3 shrink-0 rounded-full ring-4" style={{ background: urg.hex, ["--tw-ring-color" as string]: `${urg.hex}33` }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>
              {cat.emoji} {t.category[alert.category]}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${urg.bg} ${urg.color}`}>{t.urgency[alert.urgency]}</span>
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700" title={t.card.reviewedTitle}>
              <ShieldCheck className="h-3 w-3" aria-hidden /> {t.card.reviewed}
            </span>
            {suggested && (
              <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <Sparkles className="h-3 w-3" /> {t.card.suggested}
              </span>
            )}
          </div>
          <h3 className="font-bold text-slate-900 leading-snug">
            <button type="button" aria-pressed={active} onClick={(e) => { e.stopPropagation(); onSelect(); }} className="text-start hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded">
              {alert.title}<span className="sr-only"> — {t.card.showOnMap}</span>
            </button>
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden /> {alert.wilaya}{alert.baladiya ? ` · ${alert.baladiya}` : ""}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden /> {timeAgoIn(t.time, alert.createdAt)}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" aria-hidden /> {t.card.volunteers(alert.volunteersJoined, needed)}</span>
            {alert.institution && <span className="flex items-center gap-1 text-indigo-600"><Building2 className="h-3 w-3" aria-hidden /> {alert.institution}</span>}
          </div>
          {needed > 0 && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: urg.hex }} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); onHelp(); }}
        disabled={remaining === 0 && !alert.joinedByMe}
        className="flex-1 rounded-xl border border-brand-600 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-600 hover:text-white disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
      >
        {alert.joinedByMe ? t.card.joined : remaining === 0 ? t.card.full : t.card.help(remaining)}
      </button>
      {onShare && (
        <button onClick={(e) => { e.stopPropagation(); onShare(); }} aria-label="مشاركة النداء" title="مشاركة النداء"
          className="rounded-xl border border-slate-200 px-3 text-slate-600 transition-colors hover:border-brand-600 hover:text-brand-700">
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      )}
      </div>
    </div>
  );
}
