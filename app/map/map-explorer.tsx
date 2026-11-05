"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ShieldCheck, Wrench, TreePine, Building2, Home } from "lucide-react";
import type { PublicAlert, ShelterView } from "@/lib/types";
import type { Layers, MapClub, MapTree } from "@/components/map/athar-map";
import { cn } from "@/lib/utils";

const AtharMap = dynamic(() => import("@/components/map/athar-map"), { ssr: false, loading: () => <div className="h-full w-full skeleton" /> });

export function MapExplorer({ alerts, trees, shelters, clubs }: { alerts: PublicAlert[]; trees: MapTree[]; shelters: ShelterView[]; clubs: MapClub[] }) {
  const [layers, setLayers] = useState<Layers>({ alerts: true, skills: true, trees: true, shelters: true, clubs: true });
  const skillCount = alerts.filter((a) => a.requiredSkills.length > 0).length;
  const items: { key: keyof Layers; label: string; count: number; icon: React.ElementType; color: string }[] = [
    { key: "alerts", label: "النداءات الموثّقة", count: alerts.length - skillCount, icon: ShieldCheck, color: "bg-red-500" },
    { key: "skills", label: "طلبات المهارات", count: skillCount, icon: Wrench, color: "bg-teal-600" },
    { key: "trees", label: "أشجار غابة إيثار", count: trees.length, icon: TreePine, color: "bg-green-600" },
    { key: "clubs", label: "نوادي دور الشباب", count: clubs.length, icon: Building2, color: "bg-violet-600" },
    { key: "shelters", label: "مراكز الإيواء المفتوحة", count: shelters.length, icon: Home, color: "bg-rose-700" },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-4">
      <header>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">خريطة إيثار</h1>
        <p className="mt-1 text-sm text-slate-600">كل ما يحدث على المنصة في خريطة واحدة. مواقع الأشخاص تقريبية (مقر الولاية) — لا ننشر أي عنوان.</p>
      </header>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="طبقات الخريطة">
        {items.map(({ key, label, count, icon: Icon, color }) => (
          <button key={key} onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))} aria-pressed={layers[key]}
            className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition",
              layers[key] ? "border-slate-900 bg-white text-slate-900 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-400")}>
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-white", layers[key] ? color : "bg-slate-300")}><Icon className="h-3 w-3" aria-hidden /></span>
            {label}<span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">{count}</span>
          </button>
        ))}
      </div>
      <div className="relative h-[calc(100vh-260px)] min-h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
        <AtharMap alerts={alerts} trees={trees} shelters={shelters} clubs={clubs} layers={layers} />
      </div>
    </div>
  );
}
