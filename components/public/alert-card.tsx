"use client";

import { MapPin, Clock, Users, ShieldCheck, Building2, Sparkles } from "lucide-react";
import type { Alert } from "@/lib/types";
import { CATEGORY_META, URGENCY_META } from "@/lib/mock-data";
import { timeAgo, cn } from "@/lib/utils";

export function AlertCard({
  alert,
  active,
  suggested,
  onSelect,
  onHelp,
}: {
  alert: Alert;
  active?: boolean;
  suggested?: boolean;
  onSelect: () => void;
  onHelp: () => void;
}) {
  const cat = CATEGORY_META[alert.category];
  const urg = URGENCY_META[alert.urgency];
  const remaining = Math.max(0, alert.volunteersNeeded - alert.volunteersJoined);
  const pct = alert.volunteersNeeded ? Math.round((alert.volunteersJoined / alert.volunteersNeeded) * 100) : 100;

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
              {cat.emoji} {cat.labelAr}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span>
            <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              <ShieldCheck className="h-3 w-3 text-emerald-600" /> {alert.credibilityScore}%
            </span>
            {suggested && (
              <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <Sparkles className="h-3 w-3" /> مقترح لك
              </span>
            )}
          </div>
          <h4 className="font-bold text-slate-900 leading-snug">{alert.title}</h4>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {alert.wilaya}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(alert.postedAt)}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {alert.volunteersJoined}/{alert.volunteersNeeded}</span>
            {alert.hub && <span className="flex items-center gap-1 text-indigo-600"><Building2 className="h-3 w-3" /> {alert.hub}</span>}
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: urg.hex }} />
          </div>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onHelp(); }}
        disabled={remaining === 0}
        className="mt-3 w-full rounded-xl border border-brand-600 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-600 hover:text-white disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
      >
        {remaining === 0 ? "اكتمل العدد ✓" : `🙋 أستطيع المساعدة (نحتاج ${remaining})`}
      </button>
    </div>
  );
}
