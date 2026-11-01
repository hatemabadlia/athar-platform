"use client";

import { Inbox, ShieldCheck, Recycle, MapPinned, Clock, TrendingUp } from "lucide-react";
import { useAthar } from "@/lib/store";
import { cn } from "@/lib/utils";

export function StatsCards({ onSelect, active }: { onSelect: (k: string) => void; active: string }) {
  const { stats } = useAthar();
  const cards = [
    { key: "all", label: "إجمالي المنشورات المستقبلة", value: stats.totalIngested, sub: "+128 خلال 24 ساعة", icon: Inbox, tone: "bg-slate-900 text-white", iconBg: "bg-white/15" },
    { key: "approved", label: "نداءات موثّقة نشطة", value: stats.verifiedActive, sub: `${stats.pending} بانتظار المراجعة`, icon: ShieldCheck, tone: "bg-white", iconBg: "bg-emerald-100 text-emerald-700" },
    { key: "recycled", label: "منشورات قديمة / مكررة تمت تصفيتها", value: stats.recycledFiltered, sub: `≈ ${stats.volunteerHoursSaved.toLocaleString("ar-DZ")} ساعة تطوعية محفوظة`, icon: Recycle, tone: "bg-white", iconBg: "bg-fuchsia-100 text-fuchsia-700" },
    { key: "wilayas", label: "ولايات بها نداءات نشطة", value: stats.activeWilayas, sub: "من أصل 58 ولاية", icon: MapPinned, tone: "bg-white", iconBg: "bg-sky-100 text-sky-700" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const dark = c.tone.includes("slate-900");
        const isActive = active === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
            className={cn(
              "text-right rounded-3xl border p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
              c.tone,
              dark ? "border-slate-900" : "border-slate-200",
              isActive && !dark && "ring-2 ring-brand-400",
              isActive && dark && "ring-2 ring-white/60"
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", c.iconBg)}>
                <Icon className="h-5 w-5" />
              </div>
              <TrendingUp className={cn("h-4 w-4", dark ? "text-emerald-300" : "text-emerald-500")} />
            </div>
            <div className={cn("mt-3 text-3xl font-black tabular-nums", dark ? "text-white" : "text-slate-900")}>
              {c.value.toLocaleString("en-US")}
            </div>
            <div className={cn("text-xs font-bold mt-0.5", dark ? "text-white/80" : "text-slate-700")}>{c.label}</div>
            <div className={cn("mt-1 flex items-center gap-1 text-[11px]", dark ? "text-white/60" : "text-slate-500")}>
              <Clock className="h-3 w-3" /> {c.sub}
            </div>
          </button>
        );
      })}
    </div>
  );
}
