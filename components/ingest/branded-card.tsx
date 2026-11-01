"use client";

import type { BrandedPost } from "@/lib/types";
import { CATEGORY_META } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const GRADIENT: Record<string, string> = {
  blood: "from-rose-600 via-red-700 to-slate-900",
  relief: "from-amber-500 via-orange-700 to-slate-900",
  cleanup: "from-emerald-500 via-teal-700 to-slate-900",
  orphans: "from-violet-500 via-purple-800 to-slate-900",
  medical: "from-sky-500 via-blue-800 to-slate-900",
  education: "from-indigo-500 via-indigo-800 to-slate-900",
};

/** Square 1:1 social visual rendered in Athar brand identity. */
export function BrandedCard({ post, className, compact = false }: { post: BrandedPost; className?: string; compact?: boolean }) {
  const cat = CATEGORY_META[post.category];
  return (
    <div className={cn("relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-xl select-none", GRADIENT[post.category], className)} dir="rtl">
      {/* texture */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_10%,white,transparent_45%)]" />
      <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute left-3 top-3 text-6xl opacity-15">{cat.emoji}</div>

      {/* brand header */}
      <div className={cn("absolute inset-x-0 top-0 flex items-center justify-between", compact ? "p-2.5" : "p-4")}>
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center justify-center rounded-xl bg-white text-brand-700 font-black shadow", compact ? "h-6 w-6 text-sm" : "h-9 w-9 text-xl")}>إ</div>
          <div className="leading-tight">
            <div className={cn("font-black", compact ? "text-xs" : "text-base")}>إيثار</div>
            {!compact && <div className="text-[9px] tracking-wider text-white/70 uppercase">Athar · Volunteer Intelligence</div>}
          </div>
        </div>
        {post.urgency === "critical" && (
          <span className={cn("rounded-full bg-white text-red-700 font-black animate-pulse", compact ? "px-1.5 py-0.5 text-[8px]" : "px-2.5 py-1 text-[11px]")}>🚨 عاجل</span>
        )}
      </div>

      {/* body */}
      <div className={cn("absolute inset-x-0 flex flex-col justify-end", compact ? "bottom-8 px-2.5" : "bottom-14 px-4")}>
        <div className={cn("inline-flex w-fit items-center gap-1 rounded-full bg-white/20 backdrop-blur font-bold", compact ? "px-1.5 py-0.5 text-[8px]" : "px-2.5 py-1 text-[11px]")}>
          {cat.emoji} {cat.labelAr} · {post.wilaya}
        </div>
        <h3 className={cn("mt-2 font-black leading-tight drop-shadow", compact ? "text-sm line-clamp-2" : "text-2xl")}>{post.headline}</h3>
        {!compact && (
          <ul className="mt-3 space-y-1 text-[13px] font-semibold text-white/95">
            {post.details.slice(0, 4).map((d, i) => <li key={i}>{d.icon} {d.text}</li>)}
          </ul>
        )}
      </div>

      {/* footer: verified + link */}
      <div className={cn("absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/30 backdrop-blur-sm", compact ? "px-2.5 py-1.5" : "px-4 py-2.5")}>
        <span className={cn("flex items-center gap-1 font-bold", compact ? "text-[8px]" : "text-[11px]")}>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-slate-900 text-[9px]">✓</span>
          موثّق بالذكاء الاصطناعي {post.score}%
        </span>
        <span className={cn("font-mono font-bold text-white/90", compact ? "text-[8px]" : "text-[11px]")} dir="ltr">{post.shortLink}</span>
      </div>
    </div>
  );
}
