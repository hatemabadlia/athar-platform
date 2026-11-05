"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addContribution, addShift, toggleShift, registerBeneficiary } from "@/app/actions/modules";
import { formatDate } from "@/lib/utils";

type Shift = { id: string; starts_at: string; ends_at: string; location: string; capacity: number; taken: number | null; mine: boolean };
const REG: Record<string, string> = { registered: "✓ سُجّلت الأسرة", already_in_this_campaign: "مسجّلة مسبقاً في هذه الحملة", already_served_this_season: "⚠ استفادت هذا الموسم عبر جهة أخرى" };

export function CampaignClient({ campaignId, canManage, signedIn, unitLabel, shifts, contributions }: {
  campaignId: string; canManage: boolean; signedIn: boolean; unitLabel: string; shifts: Shift[]; contributions: { id: number; units: number; note: string | null; created_at: string }[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [units, setUnits] = useState(""); const [note, setNote] = useState("");
  const [sh, setSh] = useState({ s: "", e: "", loc: "", cap: "10" });
  const [ident, setIdent] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>, ok?: (d: unknown) => string) =>
    // server actions revalidate this page themselves; an extra router.refresh() inside the transition could leave it pending
    start(async () => { const r = await fn(); setMsg(r.ok ? (ok ? ok(r.data) : "تم") : r.error ?? "خطأ"); });
  const input = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <div className="space-y-5">
      {msg && <p role="status" className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">{msg}</p>}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-2">
        <h2 className="font-black">المناوبات التطوعية</h2>
        {shifts.length === 0 ? <p className="text-sm text-slate-500">لا مناوبات بعد.</p> : (
          <ul className="space-y-2">{shifts.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
              <div><b>{s.location}</b><div className="text-xs text-slate-500">{formatDate(s.starts_at)} · {new Date(s.starts_at).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}–{new Date(s.ends_at).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })} · السعة {s.capacity}{s.taken != null ? ` · المسجلون ${s.taken}` : ""}</div></div>
              {signedIn ? <Button size="sm" variant={s.mine ? "outline" : "primary"} disabled={pending || (!s.mine && s.taken != null && s.taken >= s.capacity)} onClick={() => run(() => toggleShift(s.id, !s.mine, campaignId), () => (s.mine ? "انسحبت" : "سُجّلت في المناوبة"))}>{s.mine ? "انسحاب" : "التسجيل"}</Button>
                : <a href={`/login?next=/campaigns/${campaignId}`} className="text-xs font-bold underline">سجّل الدخول</a>}
            </li>
          ))}</ul>
        )}
        {canManage && (
          <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <div><label htmlFor="ss" className="block text-[11px] font-bold">البداية</label><input id="ss" type="datetime-local" className={input} value={sh.s} onChange={(e) => setSh({ ...sh, s: e.target.value })} /></div>
            <div><label htmlFor="se" className="block text-[11px] font-bold">النهاية</label><input id="se" type="datetime-local" className={input} value={sh.e} onChange={(e) => setSh({ ...sh, e: e.target.value })} /></div>
            <div><label htmlFor="sl" className="block text-[11px] font-bold">المكان</label><input id="sl" className={input} value={sh.loc} onChange={(e) => setSh({ ...sh, loc: e.target.value })} /></div>
            <div><label htmlFor="sc" className="block text-[11px] font-bold">السعة</label><input id="sc" type="number" min={1} className={`${input} w-20`} value={sh.cap} onChange={(e) => setSh({ ...sh, cap: e.target.value })} /></div>
            <Button size="sm" disabled={pending || !sh.s || !sh.e || !sh.loc} onClick={() => run(() => addShift(campaignId, sh.s, sh.e, sh.loc, +sh.cap))}>إضافة مناوبة</Button>
          </div>
        )}
      </section>

      {canManage && (
        <section className="rounded-3xl border border-indigo-200 bg-white p-5 space-y-3">
          <h2 className="font-black">إدارة الحملة</h2>
          <div className="flex flex-wrap items-end gap-2">
            <div><label htmlFor="cu" className="block text-[11px] font-bold">{unitLabel} مُوزّعة/مجمّعة</label><input id="cu" type="number" min={1} className={`${input} w-28`} value={units} onChange={(e) => setUnits(e.target.value)} /></div>
            <div className="flex-1"><label htmlFor="cn" className="block text-[11px] font-bold">ملاحظة</label><input id="cn" className={`${input} w-full`} value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <Button size="sm" disabled={pending || !units} onClick={() => run(() => addContribution(campaignId, +units, note), () => { setUnits(""); setNote(""); return "سُجّل التقدّم"; })}>تسجيل</Button>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-3 space-y-2">
            <div className="flex items-center gap-1 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-indigo-600" aria-hidden /> فحص تكرار المستفيد (بين كل الجمعيات هذا الموسم)</div>
            <p className="text-[11px] text-slate-600">أدخل رقم التعريف الوطني (18 رقماً) أو رقم الهاتف. يُحوَّل على الخادم إلى بصمة مشفّرة بمفتاح سري، ولا يُخزّن ولا يُسجّل الرقم الأصلي. لا يُكشف اسم الجهة الأخرى. تُحذف البصمات بعد 90 يوماً من نهاية الحملة.</p>
            <div className="flex gap-2"><label htmlFor="bi" className="sr-only">المعرّف</label><input id="bi" dir="ltr" autoComplete="off" className={`${input} flex-1`} value={ident} onChange={(e) => setIdent(e.target.value)} />
              <Button size="sm" disabled={pending || ident.length < 9} onClick={() => run(() => registerBeneficiary(campaignId, ident), (d) => { setIdent(""); return REG[d as string] ?? String(d); })}>فحص وتسجيل</Button></div>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-black mb-2">سجل التقدّم</h2>
        {contributions.length === 0 ? <p className="text-sm text-slate-500">لم يُسجَّل تقدم بعد.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">{contributions.map((c) => <li key={c.id} className="flex justify-between py-1.5"><span>+{c.units} {unitLabel}{c.note ? ` — ${c.note}` : ""}</span><span className="text-xs text-slate-500">{formatDate(c.created_at)}</span></li>)}</ul>
        )}
      </section>
    </div>
  );
}
