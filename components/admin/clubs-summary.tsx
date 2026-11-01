"use client";

import Link from "next/link";
import { Building2, Users, ChevronLeft } from "lucide-react";
import { useAthar } from "@/lib/store";

export function ClubsSummary() {
  const { clubs } = useAthar();
  const top = [...clubs].sort((a, b) => b.points - a.points).slice(0, 4);
  const members = clubs.reduce((s, c) => s + c.members, 0);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 font-black text-slate-900"><Building2 className="h-4 w-4 text-indigo-600" /> نوادي مؤسسات الشباب</h3>
        <Link href="/clubs" className="text-xs font-bold text-indigo-700 flex items-center">الكل <ChevronLeft className="h-3 w-3" /></Link>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><Users className="h-3.5 w-3.5" /> {clubs.length} نادٍ · {members} شاب متطوع مسجّل</div>
      <ul className="space-y-2">
        {top.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-center text-xs font-black text-slate-400">{i + 1}</span>
            <div className="min-w-0 flex-1"><div className="truncate font-semibold text-slate-800">{c.name}</div><div className="truncate text-[10px] text-slate-500">{c.institution}</div></div>
            <span className="text-xs font-black text-indigo-700 tabular-nums">{c.points.toLocaleString("en-US")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
