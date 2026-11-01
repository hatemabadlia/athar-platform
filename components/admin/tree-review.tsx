"use client";

import { Check, X, TreePine, MapPin, Clock, ZoomIn } from "lucide-react";
import { useState } from "react";
import { useAthar } from "@/lib/store";
import { TreePhoto } from "@/components/trees/tree-photo";
import { Modal } from "@/components/ui/modal";
import { timeAgo } from "@/lib/utils";

export function TreeReview() {
  const { trees, reviewTree } = useAthar();
  const pending = trees.filter((t) => t.status === "pending");
  const [zoom, setZoom] = useState<string | null>(null);
  const z = trees.find((t) => t.id === zoom);
  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 font-black text-slate-900"><TreePine className="h-5 w-5 text-emerald-600" /> مراجعة الأشجار — غابة إيثار</h3>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">{pending.length} بانتظار التحقق</span>
      </div>
      {pending.length === 0 ? <p className="text-sm text-slate-500">لا توجد أشجار بانتظار المراجعة ✓</p> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pending.map((t) => (
            <div key={t.id} className="overflow-hidden rounded-2xl border border-slate-200">
              <button onClick={() => setZoom(t.id)} className="relative block w-full aspect-[4/3] bg-slate-100">
                <TreePhoto photo={t.photo} species={t.species} wilaya={t.wilaya} />
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white"><ZoomIn className="h-3 w-3" /> تكبير</span>
                {!t.photo && <span className="absolute top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">بدون صورة</span>}
              </button>
              <div className="p-3 text-xs">
                <div className="font-bold text-slate-900">{t.userName} · {t.species}</div>
                <div className="flex items-center gap-1 text-slate-500"><MapPin className="h-3 w-3" /> {t.wilaya} · {t.place}</div>
                <div className="flex items-center gap-1 text-slate-400"><Clock className="h-3 w-3" /> {timeAgo(t.createdAt)}</div>
                {t.note && <p className="mt-1 text-slate-600 line-clamp-2">{t.note}</p>}
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => reviewTree(t.id, true)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 font-bold text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" /> اعتماد (+50)</button>
                  <button onClick={() => reviewTree(t.id, false)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 font-bold text-red-700 hover:bg-red-50"><X className="h-3.5 w-3.5" /> رفض</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!z} onClose={() => setZoom(null)} title={z ? `${z.species} — ${z.wilaya}` : ""} className="sm:max-w-2xl">
        {z && <div className="aspect-[4/3] overflow-hidden rounded-2xl"><TreePhoto photo={z.photo} species={z.species} wilaya={z.wilaya} /></div>}
      </Modal>
    </div>
  );
}
