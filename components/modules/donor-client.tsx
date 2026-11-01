"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { WILAYAS } from "@/lib/wilayas";
import { Button } from "@/components/ui/button";
import { saveDonor, leaveDonorRegistry, logDonation } from "@/app/actions/modules";
import { formatDate } from "@/lib/utils";

export function DonorClient({ bloodType, defaultWilaya, donor, donations, interval }: {
  bloodType: string | null; defaultWilaya: number;
  donor: { wilayaCode: number; available: boolean; lastDonationOn: string | null } | null;
  donations: { id: number; on: string; institution: string | null; confirmed: boolean }[];
  interval: { days: number; source: string } | null;
}) {
  const router = useRouter();
  const [w, setW] = useState(donor?.wilayaCode ?? defaultWilaya);
  const [available, setAvailable] = useState(donor?.available ?? true);
  const [last, setLast] = useState(donor?.lastDonationOn ?? "");
  const [consent, setConsent] = useState(!!donor);
  const [dOn, setDOn] = useState(""); const [dInst, setDInst] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => start(async () => { const r = await fn(); setMsg(r.ok ? ok : r.error ?? "خطأ"); if (r.ok) router.refresh(); });
  const next = interval && donor?.lastDonationOn ? new Date(new Date(donor.lastDonationOn).getTime() + interval.days * 864e5) : null;

  if (!bloodType) return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm">أضف فصيلة دمك (بموافقتك) في <Link href="/profile" className="font-bold underline">ملفك</Link> أولاً.</div>
  );
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
        <h2 className="font-black">{donor ? "تسجيلي في الشبكة" : "التسجيل كمتبرع"} <span className="rounded bg-rose-100 px-2 text-rose-700">{bloodType}</span></h2>
        <div><label htmlFor="dw" className="text-xs font-bold">ولاية التبرع</label><select id="dw" value={w} onChange={(e) => setW(+e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5">{WILAYAS.map((x) => <option key={x.code} value={x.code}>{x.code} - {x.nameAr}</option>)}</select></div>
        <div><label htmlFor="dl" className="text-xs font-bold">آخر تبرع (اختياري)</label><input id="dl" type="date" value={last} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setLast(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5" /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> متاح حالياً لتلقي الإخطارات</label>
        <label className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" /> أوافق على استعمال فصيلتي وولايتي لإخطاري بنداءات متوافقة. لا تُكشف هويتي لأي جهة دون موافقتي.</label>
        <div className="flex gap-2">
          <Button disabled={pending || !consent} onClick={() => run(() => saveDonor({ wilayaCode: w, available, lastDonationOn: last || null, consent }), "حُفظ")}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button>
          {donor && <Button variant="outline" disabled={pending} onClick={() => run(leaveDonorRegistry, "خرجت من الشبكة")}>الخروج من الشبكة</Button>}
        </div>
        {interval ? (
          next && <p className="rounded-xl bg-slate-50 p-2 text-xs">حسب الإعداد المرجعي ({interval.days} يوماً — المصدر: {interval.source}): أقرب موعد تقريبي <b>{formatDate(next.toISOString())}</b>. القرار لمركز حقن الدم.</p>
        ) : <p className="text-[11px] text-slate-500">لا يحسب إيثار أهلية التبرع: لم يُضبط فاصل مرجعي موثّق بعد. اتبع تعليمات مركز حقن الدم.</p>}
        {msg && <p role="status" className="text-xs font-bold">{msg}</p>}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
        <h2 className="font-black">سجل تبرعاتي</h2>
        {donations.length === 0 ? <p className="text-slate-500">لا تبرعات مسجلة.</p> : (
          <ul className="divide-y divide-slate-100">{donations.map((d) => <li key={d.id} className="flex justify-between py-1.5"><span>{formatDate(d.on)}{d.institution ? ` · ${d.institution}` : ""}</span><span className="text-[11px]">{d.confirmed ? "مؤكد" : "مصرّح به"}</span></li>)}</ul>
        )}
        <div className="flex flex-wrap gap-2">
          <label htmlFor="don" className="sr-only">تاريخ التبرع</label><input id="don" type="date" max={new Date().toISOString().slice(0, 10)} value={dOn} onChange={(e) => setDOn(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1" />
          <label htmlFor="dinst" className="sr-only">المؤسسة</label><input id="dinst" placeholder="المؤسسة (اختياري)" value={dInst} onChange={(e) => setDInst(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-2 py-1" />
          <Button size="sm" disabled={pending || !dOn} onClick={() => run(() => logDonation(dOn, dInst), "سُجّل التبرع")}>إضافة</Button>
        </div>
        <p className="text-[11px] text-slate-500">التبرعات المصرّح بها ذاتياً لا تُحتسب في الشهادات حتى يؤكدها مركز أو مشرف.</p>
      </section>
    </div>
  );
}
