"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Siren, Loader2, Send, XCircle } from "lucide-react";
import type { CrisisType, CrisisView, ShelterView } from "@/lib/types";
import { CRISIS_META } from "@/lib/reference/meta";
import { WILAYAS } from "@/lib/wilayas";
import { Button } from "@/components/ui/button";
import { activateCrisis, closeCrisis, crisisAudience } from "@/app/actions/admin";
import { timeAgo } from "@/lib/utils";

export function CrisisPanel({ crises, shelters, adminWilayas, smsProvider, smsReal, counts }: {
  crises: CrisisView[]; shelters: ShelterView[]; adminWilayas: number[] | null; smsProvider: string; smsReal: boolean;
  counts: Record<string, { confirmed: number; sent: number; failed: number }>;
}) {
  const router = useRouter();
  const allowed = adminWilayas === null ? WILAYAS : WILAYAS.filter((w) => adminWilayas.includes(w.code));
  const [type, setType] = useState<Exclude<CrisisType, "other">>("flood");
  const [w, setW] = useState(allowed[0]?.code ?? 16);
  const [title, setTitle] = useState("");
  const [tpl, setTpl] = useState(CRISIS_META.flood.sms);
  const [hub, setHub] = useState("");
  const [sendSms, setSendSms] = useState(false);
  const [audience, setAudience] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [closing, setClosing] = useState<Record<string, string>>({});
  const openShelters = shelters.filter((s) => s.wilayaCode === w);

  if (!allowed.length) return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">تفعيل الطوارئ متاح لمدير المديرية الولائية (djsl_admin) أو الوزارة فقط.</div>;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <section className="rounded-3xl border-2 border-red-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-black text-slate-900"><Siren className="h-5 w-5 text-red-600" aria-hidden /> إعلان حالة طوارئ</h2>
        <p className="text-xs text-slate-500 mt-1">يظهر شريط تنبيه على الموقع لكل الزوار. الرسائل القصيرة اختيارية وتتطلب تأكيداً.</p>
        <div className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><label htmlFor="ct" className="text-xs font-bold">النوع</label>
              <select id="ct" value={type} onChange={(e) => { const t = e.target.value as Exclude<CrisisType, "other">; setType(t); setTpl(CRISIS_META[t].sms); }} className="w-full rounded-lg border border-slate-300 px-2 py-1.5">
                {(Object.keys(CRISIS_META) as Exclude<CrisisType, "other">[]).map((k) => <option key={k} value={k}>{CRISIS_META[k].emoji} {CRISIS_META[k].label}</option>)}
              </select></div>
            <div><label htmlFor="cw2" className="text-xs font-bold">الولاية</label>
              <select id="cw2" value={w} onChange={(e) => { setW(+e.target.value); setAudience(null); setHub(""); }} className="w-full rounded-lg border border-slate-300 px-2 py-1.5">{allowed.map((x) => <option key={x.code} value={x.code}>{x.code} - {x.nameAr}</option>)}</select></div>
          </div>
          <div><label htmlFor="ctt" className="text-xs font-bold">العنوان *</label><input id="ctt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${CRISIS_META[type].label} — …`} className="w-full rounded-lg border border-slate-300 px-2 py-1.5" /></div>
          <div><label htmlFor="ch" className="text-xs font-bold">نقطة التجمع (مركز مسجّل)</label>
            <select id="ch" value={hub} onChange={(e) => setHub(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5">
              <option value="">— لا شيء بعد —</option>{openShelters.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isOpen ? "" : " (مغلق)"}</option>)}
            </select>
            {!openShelters.length && <p className="mt-1 text-[11px] text-amber-700">لا توجد مراكز مسجلة لهذه الولاية. أضفها من تبويب «مراكز الإيواء».</p>}
          </div>
          <div><label htmlFor="cs" className="text-xs font-bold">نص الرسالة ({tpl.length}/320)</label><textarea id="cs" rows={3} maxLength={320} value={tpl} onChange={(e) => setTpl(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5" /></div>
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={sendSms} onChange={(e) => { setSendSms(e.target.checked); if (e.target.checked) start(async () => { const r = await crisisAudience(w); setAudience(r.ok ? r.data! : null); }); }} className="mt-0.5" />
            <span>إرسال SMS للمتطوعين الموافقين في الولاية {audience != null && <b>({audience} مستلم)</b>} — المزوّد: <b>{smsProvider}</b>{!smsReal && " (وضع التطوير: لا تُرسل رسائل حقيقية)"}</span>
          </label>
          {msg && <p role="status" className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold">{msg}</p>}
          <Button variant="danger" className="w-full" disabled={pending || title.trim().length < 3}
            onClick={() => {
              if (sendSms && smsReal && !window.confirm(`سيتم إرسال ${audience ?? "?"} رسالة SMS حقيقية. تأكيد؟`)) return;
              start(async () => {
                const r = await activateCrisis({ type, wilayaCode: w, title, smsTemplate: tpl, hubShelterId: hub || undefined, sendSms, confirmCount: audience ?? undefined });
                setMsg(r.ok ? `فُعّل. ${sendSms ? `رسائل: ${r.data!.sent} مُرسلة، ${r.data!.failed} فاشلة (${r.data!.provider}).` : ""}` : r.error);
                if (r.ok) router.refresh();
              });
            }}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" aria-hidden />} تفعيل
          </Button>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-900 mb-3">الحالات النشطة</h2>
        {crises.length === 0 ? <p className="text-sm text-slate-500">لا توجد حالة طوارئ نشطة.</p> : crises.map((c) => {
          const k = counts[c.id] ?? { confirmed: 0, sent: 0, failed: 0 };
          return (
            <div key={c.id} className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="font-bold text-slate-900">{c.title} — {c.wilaya}</div>
              <div className="text-[11px] text-slate-500">منذ {timeAgo(c.startedAt)}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white p-2"><div className="font-black">{k.sent}</div>SMS مُرسل</div>
                <div className="rounded-xl bg-white p-2"><div className="font-black">{k.failed}</div>فاشل</div>
                <div className="rounded-xl bg-white p-2"><div className="font-black text-emerald-700">{k.confirmed}</div>أكّدوا التوفر</div>
              </div>
              {(adminWilayas === null || adminWilayas.includes(c.wilayaCode)) && (
                <div className="mt-3 space-y-2">
                  <label htmlFor={`cr-${c.id}`} className="text-xs font-bold">تقرير الإغلاق</label>
                  <textarea id={`cr-${c.id}`} rows={2} value={closing[c.id] ?? ""} onChange={(e) => setClosing({ ...closing, [c.id]: e.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                  <Button size="sm" variant="outline" disabled={pending || (closing[c.id] ?? "").length < 5}
                    onClick={() => start(async () => { const r = await closeCrisis(c.id, closing[c.id] ?? ""); setMsg(r.ok ? "أُغلقت الحالة" : r.error); if (r.ok) router.refresh(); })}>
                    <XCircle className="h-4 w-4" aria-hidden /> إغلاق الحالة
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
