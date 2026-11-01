"use client";

import { TREE_SPECIES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/** Photo if uploaded, otherwise a branded illustrative placeholder by species. */
export function TreePhoto({ photo, species, className, wilaya }: { photo: string | null; species: string; className?: string; wilaya?: string }) {
  if (photo) return <img src={photo} alt={species} className={cn("h-full w-full object-cover", className)} />;
  const sp = TREE_SPECIES.find((s) => s.name === species) ?? TREE_SPECIES[0];
  return (
    <div className={cn("relative h-full w-full bg-gradient-to-br overflow-hidden", sp.color, className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
      <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center text-7xl drop-shadow-lg">{sp.emoji}</div>
      <div className="absolute bottom-2 right-3 text-white text-xs font-bold drop-shadow">{sp.name}{wilaya ? ` · ${wilaya}` : ""}</div>
    </div>
  );
}
