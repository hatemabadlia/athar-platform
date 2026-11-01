"use client";

import { Recycle, ShieldCheck, GitMerge, Inbox, CheckCircle2 } from "lucide-react";
import { useAthar } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

const ICON = {
  recycled: { I: Recycle, c: "bg-fuchsia-100 text-fuchsia-700", t: "تمت تصفية منشور قديم" },
  merged: { I: GitMerge, c: "bg-indigo-100 text-indigo-700", t: "تم دمج منشور مكرر" },
  approved: { I: ShieldCheck, c: "bg-emerald-100 text-emerald-700", t: "نداء موثّق ومنشور" },
  pending: { I: Inbox, c: "bg-slate-100 text-slate-700", t: "نداء جديد بانتظار المراجعة" },
  resolved: { I: CheckCircle2, c: "bg-sky-100 text-sky-700", t: "تم حل النداء" },
  rejected: { I: Inbox, c: "bg-red-100 text-red-700", t: "تم رفض المنشور" },
};

export function ActivityFeed() {
  const { alerts } = useAthar();
  const items = [...alerts].sort((a, b) => +new Date(b.postedAt) - +new Date(a.postedAt)).slice(0, 7);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-black text-slate-900 mb-4">آخر نشاط المحرك</h3>
      <ul className="space-y-3">
        {items.map((a) => {
          const { I, c, t } = ICON[a.status];
          return (
            <li key={a.id} className="flex gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${c}`}><I className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800">{t}</div>
                <div className="text-xs text-slate-500 truncate">{a.title}</div>
                <div className="text-[10px] text-slate-400">{a.wilaya} · {timeAgo(a.postedAt)}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
