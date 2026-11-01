"use client";

import Link from "next/link";
import { Siren } from "lucide-react";
import { useAthar } from "@/lib/store";
import { CRISIS_META, SHELTERS } from "@/lib/mock-data";

export function CrisisBanner() {
  const { crisis } = useAthar();
  if (!crisis) return null;
  const m = CRISIS_META[crisis.type];
  const n = SHELTERS.filter((s) => s.wilayaCode === crisis.wilayaCode).length;
  return (
    <div className="bg-red-600 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 font-bold"><Siren className="h-4 w-4 animate-pulse" /> وضع الطوارئ مفعّل: {m.emoji} {m.label} — {crisis.wilaya} · {n} دور شباب مفتوحة كمراكز إيواء وتجمع</div>
        <div className="flex items-center gap-2 text-xs">
          <span className="hidden sm:inline">الاحتياجات: {m.needs.join("، ")}</span>
          <Link href="/" className="rounded-lg bg-white px-3 py-1 font-bold text-red-700">أقرب مركز إليّ</Link>
        </div>
      </div>
    </div>
  );
}
