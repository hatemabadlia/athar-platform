import Link from "next/link";
import { Siren } from "lucide-react";
import { CRISIS_META } from "@/lib/reference/meta";
import type { CrisisView } from "@/lib/types";

/** Shows crises activated by an authorised admin (rows in `crises`). Nothing is shown otherwise. */
export function CrisisBanner({ crises }: { crises: CrisisView[] }) {
  if (!crises.length) return null;
  return (
    <div className="bg-red-600 text-white" role="alert">
      {crises.map((c) => {
        const m = c.type !== "other" ? CRISIS_META[c.type] : null;
        return (
          <div key={c.id} className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
            <div className="flex items-center gap-2 font-bold"><Siren className="h-4 w-4 animate-pulse" aria-hidden /> وضع الطوارئ: {m?.emoji} {c.title} — {c.wilaya}</div>
            <Link href={`/crisis/${c.id}`} className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-red-700">التفاصيل ونقاط التجمع</Link>
          </div>
        );
      })}
    </div>
  );
}
