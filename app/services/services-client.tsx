"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wrench, Wifi, Sparkles, UserCog, BadgeCheck, Send } from "lucide-react";
import type { PublicAlert } from "@/lib/types";
import { AlertCard } from "@/components/public/alert-card";
import { HelpModal } from "@/components/public/help-modal";
import { ShareCard } from "@/components/public/share-card";
import { SKILLS, SKILL_META } from "@/lib/reference/meta";
import { usableSkills } from "@/lib/matching";
import { cn } from "@/lib/utils";

type Me = { wilayaCode: number | null; skills: string[]; verifiedSkills: string[]; remoteOk: boolean } | null;
type Supply = { skill: string; regulated: boolean; remote: boolean; volunteers: number; requests: number };

const EXAMPLES = ["طبيب يقدّم استشارة توجيهية عبر جمعية", "مصمم يصمّم منشورات لحملة", "مبرمج يساعد جمعية في موقعها", "سائق يوصل التبرعات", "مترجم يرافق عائلة في الإجراءات", "أستاذ يقدّم دروس دعم مجانية"];

export function ServicesClient({ alerts, signedIn, me, supply }: { alerts: PublicAlert[]; signedIn: boolean; me: Me; supply: Supply[] }) {
  const [skill, setSkill] = useState<string | null>(null);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [helpTarget, setHelpTarget] = useState<PublicAlert | null>(null);
  const [shareTarget, setShareTarget] = useState<PublicAlert | null>(null);

  // Same rule as the matching engine: a skill counts if I have it (and it is verified when regulated),
  // and the request is in my wilaya or both of us accept remote help.
  const fitsMe = useMemo(() => {
    const m = new Map<string, string[]>();
    if (!me) return m;
    for (const a of alerts) {
      const mine = usableSkills(me, a.requiredSkills);
      const place = (me.wilayaCode && a.wilayaCode === me.wilayaCode) || (a.remoteOk && me.remoteOk);
      if (mine.length && place) m.set(a.id, mine);
    }
    return m;
  }, [alerts, me]);

  const visible = alerts
    .filter((a) => !skill || a.requiredSkills.includes(skill))
    .filter((a) => !remoteOnly || a.remoteOk)
    .filter((a) => !mineOnly || fitsMe.has(a.id))
    .sort((x, y) => Number(fitsMe.has(y.id)) - Number(fitsMe.has(x.id)));
  const counts = useMemo(() => new Map(supply.map((s) => [s.skill, s])), [supply]);
  const gaps = supply.filter((s) => s.requests > s.volunteers).sort((a, b) => (b.requests - b.volunteers) - (a.requests - a.volunteers));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-teal-700 to-slate-900 p-6 sm:p-10 text-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold ring-1 ring-white/15"><Wrench className="h-3.5 w-3.5" aria-hidden /> تطوّع بمهارتك</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">ماشي كل مساعدة مادية.</h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">وقتك ومهارتك قد يساويان أكثر من أي تبرّع. إيثار يفهم من النداء المهارة المطلوبة، ويقترحه على من يملكها في ولايته — أو عن بُعد.</p>
        <ul className="mt-4 flex flex-wrap gap-2">{EXAMPLES.map((e) => <li key={e} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 ring-1 ring-white/10">{e}</li>)}</ul>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <main className="space-y-4 min-w-0">
          <div className="flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="تصفية حسب المهارة">
            <button onClick={() => setSkill(null)} aria-pressed={!skill} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold", !skill ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700")}>كل المهارات ({alerts.length})</button>
            {SKILLS.filter((s) => (counts.get(s)?.requests ?? 0) > 0).map((s) => (
              <button key={s} onClick={() => setSkill(skill === s ? null : s)} aria-pressed={skill === s}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold", skill === s ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-700")}>
                {s} ({counts.get(s)?.requests ?? 0})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} /> <Wifi className="h-3.5 w-3.5" aria-hidden /> عن بُعد فقط</label>
            {me && <label className="flex items-center gap-1.5"><input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden /> المناسبة لمهاراتي فقط ({fitsMe.size})</label>}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              لا توجد طلبات مهارات معتمدة بهذه التصفية حالياً.
              <Link href="/submit" className="mt-3 flex items-center justify-center gap-1 font-bold text-teal-700 underline"><Send className="h-4 w-4" aria-hidden /> جمعيتك تحتاج مهارة؟ أرسل طلباً</Link>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {visible.map((a) => (
                <div key={a.id}>
                  <AlertCard alert={a} suggested={fitsMe.has(a.id)} onSelect={() => setHelpTarget(a)} onHelp={() => setHelpTarget(a)} onShare={() => setShareTarget(a)} />
                  {fitsMe.has(a.id) && <div className="px-3 pt-1 text-[10px] text-amber-700">مهارتك مطلوبة: {fitsMe.get(a.id)!.join("، ")}{a.remoteOk && a.wilayaCode !== me?.wilayaCode ? " · عن بُعد" : ""}</div>}
                </div>
              ))}
            </div>
          )}
        </main>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 font-black text-slate-900"><UserCog className="h-4 w-4 text-teal-600" aria-hidden /> مهاراتي</h2>
            {!signedIn ? (
              <p className="mt-2 text-xs text-slate-600"><Link href="/login?next=/services" className="font-bold text-teal-700 underline">سجّل الدخول</Link> وأضف مهاراتك ليقترح عليك إيثار الطلبات المناسبة.</p>
            ) : !me || me.skills.length === 0 ? (
              <p className="mt-2 text-xs text-slate-600">لم تضف أي مهارة بعد. <Link href="/profile" className="font-bold text-teal-700 underline">أضف مهاراتك</Link></p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-1">
                  {me.skills.map((s) => {
                    const reg = (SKILL_META as Record<string, { regulated: boolean }>)[s]?.regulated;
                    const ok = !reg || me.verifiedSkills.includes(s);
                    return <span key={s} className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", ok ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800")}>{reg && ok && <BadgeCheck className="h-3 w-3" aria-hidden />}{s}{!ok && " · بانتظار التوثيق"}</span>;
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">{me.remoteOk ? "تقبل المساعدة عن بُعد ✓" : "لا تقبل المساعدة عن بُعد حالياً"} · <Link href="/profile" className="underline">تعديل</Link></p>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="font-black text-slate-900">العرض والطلب على المهارات</h2>
            <p className="mt-1 text-[11px] text-slate-500">أعداد فقط، دون أي أسماء. المهن المنظَّمة تُحتسب بعد توثيقها.</p>
            <ul className="mt-3 space-y-1.5 text-xs">
              {supply.filter((s) => s.volunteers > 0 || s.requests > 0).map((s) => (
                <li key={s.skill} className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-700">{s.skill}{s.remote && <Wifi className="ms-1 inline h-3 w-3 text-sky-600" aria-label="عن بُعد" />}</span>
                  <span className="shrink-0 tabular-nums text-slate-500"><b className={s.requests > s.volunteers ? "text-rose-600" : "text-slate-900"}>{s.requests}</b> طلب · <b className="text-slate-900">{s.volunteers}</b> متطوع</span>
                </li>
              ))}
            </ul>
            {gaps.length > 0 && (
              <p className="mt-3 rounded-xl bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-800">
                نقص في: {gaps.slice(0, 3).map((g) => g.skill).join("، ")} — إن كنت تملك هذه المهارة، أضفها لملفك.
              </p>
            )}
          </section>
        </aside>
      </div>

      <HelpModal alert={helpTarget} onClose={() => setHelpTarget(null)} signedIn={signedIn} />
      <ShareCard alert={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}
