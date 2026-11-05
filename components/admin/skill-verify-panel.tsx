"use client";

import { useState, useTransition } from "react";
import { Loader2, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifySkillByEmail } from "@/app/actions/admin";
import { SKILLS, SKILL_META } from "@/lib/reference/meta";

const REGULATED = SKILLS.filter((s) => SKILL_META[s].regulated);

/**
 * Regulated professions (doctor, lawyer, psychologist) are only matched once a moderator of the volunteer's wilaya
 * (or the ministry) has checked a professional document (order registration, licence…). The check is recorded in
 * the audit log; ATHAR stores no document here.
 */
export function SkillVerifyPanel() {
  const [email, setEmail] = useState("");
  const [skill, setSkill] = useState<string>(REGULATED[0]);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = (approve: boolean) => start(async () => {
    const r = await verifySkillByEmail(email, skill, approve, note);
    setMsg(r.ok ? { ok: true, text: approve ? "وُثّقت المهارة" : "سُحب التوثيق" } : { ok: false, text: r.error ?? "خطأ" });
    if (r.ok) { setEmail(""); setNote(""); }
  });
  return (
    <section className="rounded-3xl border border-teal-200 bg-white p-5 space-y-3">
      <div>
        <h2 className="flex items-center gap-2 font-black text-slate-900"><BadgeCheck className="h-5 w-5 text-teal-600" aria-hidden /> توثيق مهارة مهنية</h2>
        <p className="text-xs text-slate-500">الطبيب والمحامي والأخصائي النفساني لا يُقترحون على النداءات إلا بعد توثيق صفتهم (رقم التسجيل في الهيئة/النقابة أو وثيقة رسمية تطّلع عليها). الاستشارات تُقدَّم في إطار جمعية أو مؤسسة معتمدة، وهي توجيه وليست تشخيصاً أو وصفة.</p>
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); submit(true); }}>
        <label htmlFor="sv-e" className="sr-only">البريد</label>
        <input id="sv-e" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="volunteer@example.dz" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <label htmlFor="sv-s" className="sr-only">المهارة</label>
        <select id="sv-s" value={skill} onChange={(e) => setSkill(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">{REGULATED.map((s) => <option key={s}>{s}</option>)}</select>
        <label htmlFor="sv-n" className="sr-only">ملاحظة</label>
        <input id="sv-n" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="مرجع الوثيقة (اختياري)" className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <Button size="sm" type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} توثيق</Button>
        <Button size="sm" type="button" variant="outline" disabled={pending || !email} onClick={() => submit(false)}>سحب التوثيق</Button>
      </form>
      {msg && <p role="status" className={msg.ok ? "text-xs font-bold text-emerald-700" : "text-xs font-bold text-red-700"}>{msg.text}</p>}
    </section>
  );
}
