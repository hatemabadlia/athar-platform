import { cn } from "@/lib/utils";

/**
 * Page masthead used across ATHAR: an eyebrow with a rule, a display title, a lede and actions.
 * Replaces the per-page gradient "hero boxes" with one consistent editorial opening.
 * tone="ink" renders a dark band with the khatam pattern for flagship pages.
 */
export function Masthead({ eyebrow, title, lede, actions, aside, tone = "paper", accent = "brand", className }: {
  eyebrow: string; title: React.ReactNode; lede?: React.ReactNode; actions?: React.ReactNode; aside?: React.ReactNode;
  tone?: "paper" | "ink"; accent?: "brand" | "clay"; className?: string;
}) {
  const ink = tone === "ink";
  return (
    <header className={cn(ink ? "rounded-2xl bg-ink pattern-zellige px-6 py-8 text-paper sm:px-10 sm:py-12" : "border-b border-slate-200 pb-8", className)}>
      <div className={cn("grid gap-8", aside && "lg:grid-cols-[1.3fr_1fr] lg:items-end")}>
        <div>
          <p className={cn("flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em]", ink ? "text-paper/60" : "text-slate-500")}>
            <span className={cn("h-[2px] w-6", accent === "clay" ? "bg-clay-400" : ink ? "bg-brand-300" : "bg-brand-600")} aria-hidden />{eyebrow}
          </p>
          <h1 className={cn("mt-4 font-display text-3xl leading-[1.3] sm:text-[2.6rem]", ink ? "text-paper" : "text-ink")}>{title}</h1>
          {lede && <p className={cn("mt-4 max-w-2xl text-[15px] leading-8", ink ? "text-paper/75" : "text-slate-600")}>{lede}</p>}
          {actions && <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">{actions}</div>}
        </div>
        {aside}
      </div>
    </header>
  );
}

export const btnPrimary = "inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-[15px] font-semibold text-paper transition-colors hover:bg-brand-800";
export const btnOnInk = "inline-flex items-center gap-2 rounded-lg bg-paper px-5 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-white";
export const btnGhostInk = "inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-3 text-[15px] font-medium text-paper transition-colors hover:bg-white/10";
