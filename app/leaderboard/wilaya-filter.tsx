"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WILAYAS } from "@/lib/wilayas";

/** Wilaya selector that keeps the other leaderboard filters in the URL. */
export function WilayaFilter({ value, allLabel, locale }: { value: number | null; allLabel: string; locale: "ar" | "fr" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center">
      <span className="sr-only">{allLabel}</span>
      <select value={value ?? ""} onChange={(e) => {
        const q = new URLSearchParams(params.toString());
        if (e.target.value) q.set("w", e.target.value); else q.delete("w");
        router.push(`${pathname}?${q.toString()}`);
      }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
        <option value="">{allLabel}</option>
        {WILAYAS.map((w) => <option key={w.code} value={w.code}>{w.code} - {locale === "fr" ? w.name : w.nameAr}</option>)}
      </select>
    </label>
  );
}
