"use client";
import { modeLabel } from "@/lib/pipeline/types";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, CheckCircle2, GitMerge, Recycle, RotateCcw, Phone, Loader2, Search, AlertTriangle } from "lucide-react";
import type { ModerationAlert, Category, Urgency, BloodType } from "@/lib/types";
import { CATEGORY_META, URGENCY_META, STATUS_META, BLOOD_TYPES } from "@/lib/reference/meta";
import { WILAYAS } from "@/lib/wilayas";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ScoreRing } from "@/components/ui/score-ring";
import { reviewAlert, correctAlert, getAlertContact, confirmVolunteer } from "@/app/actions/alerts";
import { submitReport } from "@/app/actions/clubs";
import { notifyDonors, donorCount } from "@/app/actions/modules";
import { formatPhone } from "@/lib/pipeline/text";
import { cn, timeAgo } from "@/lib/utils";

type Participant = { alertId: string; userId: string; status: string; hours: number | null; name: string };
const STATUSES = ["pending", "approved", "resolved", "rejected", "recycled", "merged", "all"] as const;
const VERDICT_AR: Record<string, string> = { fresh: "جديد", recycled: "قديم محتمل", duplicate: "مكرر محتمل", "low-confidence": "مصداقية منخفضة" };

export function ModerationQueue({ alerts, status, q, openId, participants }: { alerts: ModerationAlert[]; status: string; q: string; openId: string | null; participants: Participant[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<ModerationAlert | null>(alerts.find((a) => a.id === openId) ?? null);
  const [search, setSearch] = useState(q);
  const go = (s: string, query = search) => router.push(`/admin?tab=queue&status=${s}${query ? `&q=${encodeURIComponent(query)}` : ""}`);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
        <div className="flex gap-1 overflow-x-auto">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => go(s)} aria-pressed={status === s} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-bold", status === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600")}>
              {s === "all" ? "الكل" : STATUS_META[s].labelAr}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); go(status); }} className="mr-auto flex items-center gap-1">
          <label htmlFor="mq" className="sr-only">بحث</label>
          <input id="mq" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في العناوين" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm" />
          <button className="rounded-xl bg-slate-100 p-2" aria-label="بحث"><Search className="h-4 w-4" /></button>
        </form>
      </div>
      {alerts.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">لا توجد نداءات في هذه الحالة ضمن نطاقك.{status === "pending" && " تصل النداءات الجديدة من الاستمارة وقنوات الاستقبال تلقائياً."}</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {alerts.map((a) => {
            const cat = CATEGORY_META[a.category]; const urg = URGENCY_META[a.urgency]; const st = STATUS_META[a.status];
            return (
              <li key={a.id}>
                <button onClick={() => setOpen(a)} className="flex w-full items-start gap-3 p-4 text-right hover:bg-slate-50">
                  <ScoreRing score={a.credibilityScore ?? 0} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.bg} ${st.color}`}>{st.labelAr}</span>
                      {a.verdict && a.verdict !== "fresh" && <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold text-fuchsia-800">{VERDICT_AR[a.verdict]}</span>}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{a.aiMode === "manual" ? "يدوي" : modeLabel(a.aiMode)}</span>
                      {a.sourceCount > 1 && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{a.sourceCount} مصادر</span>}
                    </div>
                    <div className="mt-1 font-bold text-slate-900 truncate">{a.title}</div>
                    <div className="text-[11px] text-slate-500">{a.wilaya} · {timeAgo(a.createdAt)} · {a.volunteersJoined} متطوع</div>
                    {a.needsReview.length > 0 && a.status === "pending" && <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700"><AlertTriangle className="h-3 w-3" aria-hidden /> {a.needsReview[0]}</div>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && <AlertDetail alert={open} participants={participants.filter((p) => p.alertId === open.id)} onClose={() => setOpen(null)} />}
    </section>
  );
}

function AlertDetail({ alert: a, participants, onClose }: { alert: ModerationAlert; participants: Participant[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [phone, setPhone] = useState<string | null | undefined>(undefined);
  const [mergeTarget, setMergeTarget] = useState("");
  const [f, setF] = useState({
    title: a.title, summary: a.summary, category: a.category as Category, urgency: a.urgency as Urgency, wilaya_code: a.wilayaCode,
    baladiya_name: a.baladiya, institution_name: a.institution, blood_type: a.bloodType as BloodType | null, volunteers_needed: a.volunteersNeeded,
    deadline: a.deadline ? a.deadline.slice(0, 16) : "", contact_name: a.contactName,
  });
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, close = false) => start(async () => {
    const r = await fn();
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "خطأ" });
    if (r.ok) { router.refresh(); if (close) onClose(); }
  });
  const act = (action: "approve" | "reject" | "resolve" | "merge" | "reopen" | "mark_recycled") =>
    run(() => reviewAlert({ id: a.id, action, mergeTarget: action === "merge" ? mergeTarget : undefined }), "تم", true);
  const save = () => run(() => correctAlert({ id: a.id, ...f, deadline: f.deadline ? new Date(f.deadline).toISOString() : null,
    baladiya_name: f.baladiya_name || null, institution_name: f.institution_name || null, contact_name: f.contact_name || null }), "حُفظت التصحيحات");
  const input = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  return (
    <Modal open onClose={onClose} title="مراجعة النداء" className="sm:max-w-4xl">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-[10px] font-bold text-slate-400 mb-1">النص الأصلي (لا يُعدَّل)</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800" dir="auto">{a.originalText}</p>
          </div>
          {a.normalizedText && a.normalizedText !== a.originalText && (
            <div className="rounded-2xl bg-emerald-50 p-3">
              <div className="text-[10px] font-bold text-emerald-600 mb-1">بالعربية الفصحى ({modeLabel(a.aiMode)})</div>
              <p className="text-sm text-slate-800">{a.normalizedText}</p>
            </div>
          )}
          {a.needsReview.length > 0 && <ul className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 space-y-1">{a.needsReview.map((r, i) => <li key={i}>• {r}</li>)}</ul>}
          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="text-[10px] font-bold text-slate-400 mb-1">أسباب درجة المصداقية ({a.credibilityScore ?? "—"}/100) — أداة فرز، ليست دليلاً</div>
            <ul className="space-y-0.5 text-xs">{a.credibilityReasons.filter((r) => r.delta !== 0).map((r, i) => <li key={i} className="flex justify-between gap-2"><span>{r.label}</span><b className={r.delta > 0 ? "text-emerald-700" : "text-red-700"}>{r.delta > 0 ? "+" : ""}{r.delta}</b></li>)}</ul>
            {a.firstSeenAt && <div className="mt-1 text-[11px] text-fuchsia-700">محتوى مشابه رُصد أول مرة: {a.firstSeenAt.slice(0, 10)}</div>}
          </div>
          <div className="rounded-2xl border border-slate-200 p-3 text-sm">
            <div className="flex items-center justify-between"><span className="font-bold">رقم الاتصال</span>
              {phone === undefined ? <button onClick={() => start(async () => { const r = await getAlertContact(a.id); setPhone(r.ok ? r.data ?? null : null); })} className="flex items-center gap-1 text-xs font-bold text-brand-700"><Phone className="h-3.5 w-3.5" aria-hidden /> إظهار (يُسجَّل في السجل)</button>
                : <span dir="ltr" className="font-mono">{phone ? formatPhone(phone) : "لا يوجد"}</span>}
            </div>
          </div>
          {participants.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-3">
              <div className="text-xs font-bold mb-2">المتطوعون ({participants.length}) — أكّد الحضور الفعلي لاحتساب النقاط</div>
              <ul className="space-y-1.5">{participants.map((p) => <ParticipantRow key={p.userId} alertId={a.id} p={p} />)}</ul>
            </div>
          )}
          {a.category === "blood" && a.status === "approved" && <DonorNotify alertId={a.id} />}
          {(a.status === "approved" || a.status === "resolved") && <AlertReport alertId={a.id} />}
        </div>

        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-500">تصحيح الحقول المستخرجة</div>
          <div><label className="text-[11px] font-bold" htmlFor="f-title">العنوان</label><input id="f-title" className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label className="text-[11px] font-bold" htmlFor="f-sum">الملخص</label><textarea id="f-sum" rows={2} className={input} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[11px] font-bold" htmlFor="f-cat">الفئة</label><select id="f-cat" className={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>{(Object.keys(CATEGORY_META) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_META[c].labelAr}</option>)}</select></div>
            <div><label className="text-[11px] font-bold" htmlFor="f-urg">الاستعجال</label><select id="f-urg" className={input} value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value as Urgency })}>{(Object.keys(URGENCY_META) as Urgency[]).map((u) => <option key={u} value={u}>{URGENCY_META[u].labelAr}</option>)}</select></div>
            <div><label className="text-[11px] font-bold" htmlFor="f-w">الولاية</label><select id="f-w" className={input} value={f.wilaya_code ?? ""} onChange={(e) => setF({ ...f, wilaya_code: e.target.value ? +e.target.value : null })}><option value="">—</option>{WILAYAS.map((w) => <option key={w.code} value={w.code}>{w.code} - {w.nameAr}</option>)}</select></div>
            <div><label className="text-[11px] font-bold" htmlFor="f-b">البلدية</label><input id="f-b" className={input} value={f.baladiya_name ?? ""} onChange={(e) => setF({ ...f, baladiya_name: e.target.value })} /></div>
            <div><label className="text-[11px] font-bold" htmlFor="f-i">المؤسسة</label><input id="f-i" className={input} value={f.institution_name ?? ""} onChange={(e) => setF({ ...f, institution_name: e.target.value })} /></div>
            <div><label className="text-[11px] font-bold" htmlFor="f-bt">الفصيلة</label><select id="f-bt" className={input} value={f.blood_type ?? ""} onChange={(e) => setF({ ...f, blood_type: (e.target.value || null) as BloodType | null })}><option value="">—</option>{BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}</select></div>
            <div><label className="text-[11px] font-bold" htmlFor="f-n">المتطوعون المطلوبون</label><input id="f-n" type="number" min={0} className={input} value={f.volunteers_needed} onChange={(e) => setF({ ...f, volunteers_needed: +e.target.value })} /></div>
            <div><label className="text-[11px] font-bold" htmlFor="f-d">الموعد النهائي</label><input id="f-d" type="datetime-local" className={input} value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
          </div>
          <div><label className="text-[11px] font-bold" htmlFor="f-c">اسم جهة الاتصال</label><input id="f-c" className={input} value={f.contact_name ?? ""} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></div>
          <Button size="sm" variant="outline" onClick={save} disabled={pending}>حفظ التصحيحات</Button>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="text-xs font-bold text-slate-500">القرار</div>
            <div className="flex flex-wrap gap-2">
              {(a.status === "pending" || a.status === "recycled") && <>
                <Button size="sm" variant="success" onClick={() => act("approve")} disabled={pending}><Check className="h-4 w-4" aria-hidden /> اعتماد ونشر</Button>
                <Button size="sm" variant="danger" onClick={() => act("reject")} disabled={pending}><X className="h-4 w-4" aria-hidden /> رفض</Button>
                {a.status === "pending" && <Button size="sm" variant="outline" onClick={() => act("mark_recycled")} disabled={pending}><Recycle className="h-4 w-4" aria-hidden /> منشور قديم</Button>}
              </>}
              {a.status === "approved" && <>
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={() => act("resolve")} disabled={pending}><CheckCircle2 className="h-4 w-4" aria-hidden /> تم الحل</Button>
                <Button size="sm" variant="danger" onClick={() => act("reject")} disabled={pending}><X className="h-4 w-4" aria-hidden /> سحب</Button>
              </>}
              {["rejected", "recycled", "resolved", "expired"].includes(a.status) && <Button size="sm" variant="outline" onClick={() => act("reopen")} disabled={pending}><RotateCcw className="h-4 w-4" aria-hidden /> إعادة فتح</Button>}
            </div>
            {(a.status === "pending" || a.status === "approved") && (
              <div className="flex gap-2">
                <label htmlFor="mt" className="sr-only">معرّف النداء الهدف</label>
                <input id="mt" dir="ltr" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value.trim())} placeholder="معرّف النداء الأصلي للدمج" className="flex-1 rounded-lg border border-slate-300 px-2 py-1 font-mono text-[11px]" />
                <Button size="sm" variant="outline" onClick={() => act("merge")} disabled={pending || mergeTarget.length !== 36}><GitMerge className="h-4 w-4" aria-hidden /> دمج</Button>
              </div>
            )}
            <div className="text-[10px] text-slate-400 font-mono" dir="ltr">id: {a.id}</div>
          </div>
          {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          {msg && <p role="status" className={cn("rounded-lg px-2 py-1 text-xs font-bold", msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}>{msg.text}</p>}
        </div>
      </div>
    </Modal>
  );
}

function ParticipantRow({ alertId, p }: { alertId: string; p: Participant }) {
  const router = useRouter();
  const [hours, setHours] = useState(p.hours?.toString() ?? "2");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const set = (ok: boolean) => start(async () => { const r = await confirmVolunteer(alertId, p.userId, ok, ok && hours ? +hours : null); if (!r.ok) setErr(r.error); else router.refresh(); });
  return (
    <li className="flex flex-wrap items-center gap-2 text-xs">
      <span className="flex-1 font-semibold">{p.name || "متطوع"}</span>
      <span className="rounded bg-slate-100 px-1.5">{p.status}</span>
      <input aria-label="ساعات" type="number" min="0.5" max="24" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} className="w-14 rounded border border-slate-300 px-1" />
      <button disabled={pending} onClick={() => set(true)} className="rounded bg-emerald-600 px-2 py-0.5 font-bold text-white">حضر</button>
      <button disabled={pending} onClick={() => set(false)} className="rounded bg-slate-200 px-2 py-0.5 font-bold">لم يحضر</button>
      {err && <span role="alert" className="w-full text-red-600">{err}</span>}
    </li>
  );
}

function AlertReport({ alertId }: { alertId: string }) {
  const [outcome, setOutcome] = useState(""); const [att, setAtt] = useState("0"); const [hrs, setHrs] = useState("0");
  const [pending, start] = useTransition(); const [msg, setMsg] = useState<string | null>(null);
  return (
    <details className="rounded-2xl border border-slate-200 p-3 text-xs">
      <summary className="cursor-pointer font-bold">تقرير ما بعد النشاط</summary>
      <div className="mt-2 space-y-2">
        <textarea aria-label="النتيجة" rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="ما الذي تحقق؟" className="w-full rounded-lg border border-slate-300 px-2 py-1" />
        <div className="flex gap-2"><input aria-label="الحضور" type="number" min="0" value={att} onChange={(e) => setAtt(e.target.value)} className="w-20 rounded border border-slate-300 px-1" /> حاضر <input aria-label="الساعات" type="number" min="0" value={hrs} onChange={(e) => setHrs(e.target.value)} className="w-20 rounded border border-slate-300 px-1" /> ساعة</div>
        <Button size="sm" disabled={pending || outcome.length < 5} onClick={() => start(async () => { const r = await submitReport({ alertId, outcome, attended: +att, hours: +hrs }); setMsg(r.ok ? "نُشر التقرير" : r.error); })}>حفظ</Button>
        {msg && <p role="status">{msg}</p>}
      </div>
    </details>
  );
}

function DonorNotify({ alertId }: { alertId: string }) {
  const [n, setN] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs space-y-2">
      <div className="font-bold text-rose-800">شبكة المتبرعين</div>
      {n == null ? <button disabled={pending} onClick={() => start(async () => { const r = await donorCount(alertId); if (r.ok) setN(r.data!); else setMsg(r.error); })} className="font-bold underline">عدّ المتبرعين المتوافقين في الولاية</button>
        : <div className="flex items-center gap-2"><span>{n} متبرع متوافق ومتاح</span>
            <button disabled={pending || n === 0} onClick={() => start(async () => { const r = await notifyDonors(alertId); setMsg(r.ok ? `أُخطر ${r.data} متبرع (إشعار داخل المنصة)` : r.error); })} className="rounded bg-rose-600 px-2 py-0.5 font-bold text-white">إخطارهم</button></div>}
      {msg && <p role="status">{msg}</p>}
      <p className="text-[10px] text-slate-500">لا تُكشف هويات المتبرعين. الأهلية الطبية يقررها مركز حقن الدم.</p>
    </div>
  );
}
