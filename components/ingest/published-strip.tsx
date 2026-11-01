"use client";

import { Megaphone, Eye } from "lucide-react";
import { useAthar } from "@/lib/store";
import { BrandedCard } from "./branded-card";
import { CHANNELS } from "./publish-modal";
import { timeAgo } from "@/lib/utils";

export function PublishedStrip() {
  const { publishedPosts } = useAthar();
  if (publishedPosts.length === 0) return null;
  const reach = publishedPosts.reduce((s, p) => s + p.reach, 0);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="flex items-center gap-2 font-black text-slate-900"><Megaphone className="h-5 w-5 text-brand-600" /> منشورات إيثار المنشورة تلقائياً ({publishedPosts.length})</h2>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><Eye className="h-4 w-4" /> وصول تقديري: {reach.toLocaleString("en-US")}</div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {publishedPosts.map((p) => (
          <div key={p.id} className="w-44 shrink-0 animate-slide-in">
            <BrandedCard post={p} compact />
            <div className="mt-1.5 flex items-center justify-between px-0.5">
              <div className="flex gap-1">
                {CHANNELS.filter((c) => p.channels[c.key]).map((c) => <c.Icon key={c.key} className={`h-3.5 w-3.5 ${c.color}`} />)}
              </div>
              <span className="text-[10px] text-slate-400">{timeAgo(p.publishedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
