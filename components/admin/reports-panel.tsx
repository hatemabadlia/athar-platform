"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { reviewReport } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";

type R = { id: string; outcome: string; attended: number; hours: number; resources: string | null; organization: string | null; status: string; createdAt: string; target: string };

export function ReportsPanel({ reports }: { reports: R[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  if (!reports.length) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">لا توجد تقارير بعد. يكتبها صاحب النداء أو مسؤول النادي بعد النشاط.</div>;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white divide-y divide-slate-100">
      {err && <p role="alert" className="p-3 text-xs text-red-700">{err}</p>}
      {reports.map((r) => (
        <div key={r.id} className="p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold">{r.target}</div>
            <span className="rounded bg-slate-100 px-2 text-xs">{r.status}</span>
          </div>
          <p className="mt-1 text-slate-700">{r.outcome}</p>
          <div className="mt-1 text-xs text-slate-500">{r.attended} حاضر · {r.hours} ساعة{r.resources ? ` · ${r.resources}` : ""}{r.organization ? ` · ${r.organization}` : ""} · {formatDate(r.createdAt)}</div>
          {r.status === "pending" && (
            <div className="mt-2 flex gap-2">
              <button disabled={pending} onClick={() => start(async () => { const x = await reviewReport(r.id, true); if (!x.ok) setErr(x.error); else router.refresh(); })} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">اعتماد ونشر</button>
              <button disabled={pending} onClick={() => start(async () => { const x = await reviewReport(r.id, false); if (!x.ok) setErr(x.error); else router.refresh(); })} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold">رفض</button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
