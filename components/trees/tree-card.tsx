"use client";

import { Heart, MessageCircle, Share2, MapPin, BadgeCheck, Clock, Building2 } from "lucide-react";
import type { TreePost } from "@/lib/types";
import { TreePhoto } from "./tree-photo";
import { TREE_SPECIES, CO2_PER_TREE_KG } from "@/lib/mock-data";
import { cn, timeAgo } from "@/lib/utils";

export function TreeCard({ tree, onLike, onLocate, active }: { tree: TreePost; onLike: () => void; onLocate?: () => void; active?: boolean }) {
  const sp = TREE_SPECIES.find((s) => s.name === tree.species);
  return (
    <article className={cn("overflow-hidden rounded-3xl border bg-white shadow-sm animate-fade-up", active ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200")}>
      <header className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black">{tree.userName.charAt(0)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 truncate">{tree.userName}{tree.status === "approved" && <BadgeCheck className="h-4 w-4 text-emerald-600" />}</div>
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500"><span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {tree.wilaya} · {tree.place}</span><span>{timeAgo(tree.createdAt)}</span></div>
        </div>
        {tree.status === "pending" ? (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"><Clock className="h-3 w-3" /> قيد المراجعة</span>
        ) : tree.status === "rejected" ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">مرفوض</span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">+{tree.points} نقطة</span>
        )}
      </header>
      <div className="relative aspect-[4/3] bg-slate-100">
        <TreePhoto photo={tree.photo} species={tree.species} wilaya={tree.wilaya} />
        <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-slate-800 shadow">{sp?.emoji} {tree.species}</span>
        {tree.status === "approved" && <span className="absolute bottom-2 left-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white">🌍 ≈{CO2_PER_TREE_KG} كغ CO₂/سنة</span>}
      </div>
      <div className="p-3">
        {tree.note && <p className="text-sm text-slate-800 leading-relaxed">{tree.note}</p>}
        {tree.club && <div className="mt-1 flex items-center gap-1 text-[11px] text-indigo-700 font-semibold"><Building2 className="h-3 w-3" /> {tree.club}</div>}
        <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
          <button onClick={onLike} disabled={tree.status !== "approved"} className={cn("flex items-center gap-1.5 font-semibold transition-transform active:scale-125 disabled:opacity-40", tree.likedByMe && "text-rose-600")}>
            <Heart className={cn("h-5 w-5", tree.likedByMe && "fill-current")} /> {tree.likes}
          </button>
          <span className="flex items-center gap-1.5"><MessageCircle className="h-5 w-5" /> {tree.comments}</span>
          <button onClick={onLocate} className="flex items-center gap-1 mr-auto rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"><MapPin className="h-3.5 w-3.5" /> على الخريطة</button>
          <span className="text-slate-400"><Share2 className="h-4 w-4" /></span>
        </div>
      </div>
    </article>
  );
}
