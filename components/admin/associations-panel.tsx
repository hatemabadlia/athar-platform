"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { findWilaya } from "@/lib/wilayas";
import { reviewAssociation } from "@/app/actions/modules";
import { formatDate } from "@/lib/utils";

type A = { id: string; name: string; approval_number: string; wilaya_code: number; description: string; status: string; created_at: string; docs: { path: string; url: string | null }[] };

export function AssociationsPanel({ items }: { items: A[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  if (!items.length) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">لا طلبات اعتماد في نطاقك.</div>;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white divide-y divide-slate-100">
      {msg && <p role="status" className="p-3 text-xs font-bold">{msg}</p>}
      {items.map((a) => (
        <div key={a.id} className="p-4 text-sm space-y-1">
          <div className="flex flex-wrap justify-between gap-2"><b>{a.name}</b><span className="rounded bg-slate-100 px-2 text-xs">{a.status}</span></div>
          <div className="text-xs text-slate-500">رقم الاعتماد {a.approval_number} · {findWilaya(a.wilaya_code)?.nameAr} · {formatDate(a.created_at)}</div>
          {a.description && <p className="text-xs">{a.description}</p>}
          <div className="flex flex-wrap gap-2 text-xs">{a.docs.map((d, i) => d.url ? <a key={d.path} href={d.url} target="_blank" rel="noopener noreferrer" className="underline">وثيقة {i + 1}</a> : <span key={d.path}>وثيقة {i + 1} (غير متاحة)</span>)}</div>
          <p className="text-[11px] text-amber-700">تحقق من رقم الاعتماد لدى المصالح المختصة قبل الاعتماد.</p>
          {a.status === "pending" && (
            <div className="flex flex-wrap gap-2">
              <label htmlFor={`n-${a.id}`} className="sr-only">ملاحظة</label>
              <input id={`n-${a.id}`} placeholder="ملاحظة (اختيارية)" value={note[a.id] ?? ""} onChange={(e) => setNote({ ...note, [a.id]: e.target.value })} className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
              <button disabled={pending} onClick={() => start(async () => { const r = await reviewAssociation(a.id, true, note[a.id]); setMsg(r.ok ? "اعتُمدت" : r.error); router.refresh(); })} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">اعتماد</button>
              <button disabled={pending} onClick={() => start(async () => { const r = await reviewAssociation(a.id, false, note[a.id]); setMsg(r.ok ? "رُفضت" : r.error); router.refresh(); })} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold">رفض</button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
