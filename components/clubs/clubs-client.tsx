"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Users, Trophy, Plus, CalendarDays, QrCode, Loader2, CheckCircle2, ClipboardList } from "lucide-react";
import type { ActivityView, Category, ClubView } from "@/lib/types";
import { CATEGORY_META } from "@/lib/reference/meta";
import { WILAYAS } from "@/lib/wilayas";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { createClub, joinClub, leaveClub, createActivity, checkIn, submitReport } from "@/app/actions/clubs";
import { cn, formatDate } from "@/lib/utils";

/** Soft router.refresh() after a server action was intermittently dropped (stale list); a reload is reliable. */
const reloadPage = () => window.location.reload();

const QrScanner = dynamic(() => import("./qr-scanner").then((m) => m.QrScanner), { ssr: false });
const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

export function ClubsClient({ clubs, activities, signedIn }: { clubs: ClubView[]; activities: ActivityView[]; signedIn: boolean }) {
  const [wilaya, setWilaya] = useState<number | "all">("all");
  const [creating, setCreating] = useState(false);
  const [scanFor, setScanFor] = useState<ActivityView | null>(null);
  const [reportFor, setReportFor] = useState<ActivityView | null>(null);
  const [newActFor, setNewActFor] = useState<ClubView | null>(null);
  const shown = useMemo(() => clubs.filter((c) => wilaya === "all" || c.wilayaCode === wilaya), [clubs, wilaya]);
  const leaderboard = useMemo(() => [...clubs].filter((c) => c.points > 0).sort((a, b) => b.points - a.points).slice(0, 10), [clubs]);
  const ledClubs = clubs.filter((c) => c.myRole === "lead");
  const ledActivities = activities.filter((a) => a.clubId && ledClubs.some((c) => c.id === a.clubId));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <section className="rounded-3xl bg-gradient-to-l from-indigo-700 to-slate-900 p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">نوادي التطوع</h1>
            <p className="mt-1 text-sm text-white/80 max-w-xl">نوادٍ يؤسسها الشباب (في دور الشباب أو غيرها). الترتيب يعتمد على الحضور المؤكد بـ QR فقط.</p>
          </div>
          {signedIn ? <Button onClick={() => setCreating(true)} className="bg-white text-indigo-800 hover:bg-indigo-50"><Plus className="h-4 w-4" aria-hidden /> تأسيس نادٍ</Button>
            : <Link href="/login?next=/clubs" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-indigo-800">سجّل الدخول للانضمام</Link>}
        </div>
      </section>

      {ledClubs.length > 0 && (
        <section className="rounded-3xl border-2 border-indigo-200 bg-indigo-50 p-5">
          <h2 className="font-black text-slate-900 mb-3 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-600" aria-hidden /> لوحة مسؤول النادي</h2>
          <div className="flex flex-wrap gap-2 mb-3">{ledClubs.map((c) => <Button key={c.id} size="sm" variant="outline" onClick={() => setNewActFor(c)}><CalendarDays className="h-4 w-4" aria-hidden /> نشاط جديد — {c.name}</Button>)}</div>
          {ledActivities.length === 0 ? <p className="text-sm text-slate-600">لا أنشطة بعد. أنشئ نشاطاً ثم امسح بطاقات الحاضرين.</p> : (
            <ul className="space-y-2">
              {ledActivities.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3">
                  <div><div className="font-bold text-sm">{a.title}</div><div className="text-[11px] text-slate-500">{formatDate(a.startsAt)}{a.location ? ` · ${a.location}` : ""} · {a.status}</div></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setScanFor(a)} className="bg-indigo-600 hover:bg-indigo-700"><QrCode className="h-4 w-4" aria-hidden /> تسجيل الحضور</Button>
                    <Button size="sm" variant="outline" onClick={() => setReportFor(a)}>تقرير</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="cw" className="text-sm font-bold text-slate-700">الولاية</label>
            <select id="cw" value={wilaya} onChange={(e) => setWilaya(e.target.value === "all" ? "all" : +e.target.value)} className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm">
              <option value="all">كل الولايات</option>{WILAYAS.map((w) => <option key={w.code} value={w.code}>{w.code} - {w.nameAr}</option>)}
            </select>
          </div>
          {shown.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              <Building2 className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
              <div className="mt-2 font-bold text-slate-700">لا توجد نوادٍ مسجلة {wilaya !== "all" ? "في هذه الولاية" : "بعد"}</div>
              <p>كن أول من يؤسس نادياً تطوعياً في دار شبابك.</p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {shown.map((c) => <ClubCard key={c.id} club={c} signedIn={signedIn} activities={activities.filter((a) => a.clubId === c.id && a.status !== "cancelled")} />)}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-slate-900 mb-3"><Trophy className="h-5 w-5 text-amber-500" aria-hidden /> الترتيب الوطني</h2>
            {leaderboard.length === 0 ? <p className="text-xs text-slate-500">يظهر الترتيب بعد أول حضور مؤكد.</p> : (
              <ol className="space-y-2">{leaderboard.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between text-sm"><span><b className="text-slate-400">{i + 1}.</b> {c.name} <span className="text-[10px] text-slate-500">({c.wilaya})</span></span><b className="tabular-nums">{c.points}</b></li>
              ))}</ol>
            )}
          </div>
        </aside>
      </div>

      {creating && <CreateClubModal onClose={() => setCreating(false)} />}
      {newActFor && <NewActivityModal club={newActFor} onClose={() => setNewActFor(null)} />}
      {scanFor && <ScanModal activity={scanFor} onClose={() => setScanFor(null)} />}
      {reportFor && <ReportModal activity={reportFor} onClose={() => setReportFor(null)} />}
    </div>
  );
}

function ClubCard({ club, signedIn, activities }: { club: ClubView; signedIn: boolean; activities: ActivityView[] }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const next = activities.find((a) => new Date(a.startsAt) > new Date());
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="font-black text-slate-900">{club.name}</div>
      <div className="text-[11px] text-slate-500">{club.institutionName ? `${club.institutionName} · ` : ""}{club.wilaya}</div>
      {club.description && <p className="mt-1 text-xs text-slate-600 line-clamp-2">{club.description}</p>}
      <div className="mt-2 flex flex-wrap gap-1">{club.focus.map((f: Category) => <span key={f} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_META[f].bg} ${CATEGORY_META[f].color}`}>{CATEGORY_META[f].emoji} {CATEGORY_META[f].labelAr}</span>)}</div>
      <div className="mt-2 flex gap-3 text-[11px] text-slate-500"><span className="flex items-center gap-1"><Users className="h-3 w-3" aria-hidden /> {club.members} عضو</span><span>{club.activities30d} نشاط (30 يوماً)</span><span>{club.points} نقطة</span></div>
      {next && <div className="mt-2 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] text-indigo-800">القادم: {next.title} — {formatDate(next.startsAt)}</div>}
      {err && <p role="alert" className="mt-2 text-[11px] text-red-600">{err}</p>}
      {signedIn && club.myRole !== "lead" && (
        <Button size="sm" variant={club.myRole ? "outline" : "primary"} className="mt-3 w-full" disabled={pending}
          onClick={() => start(async () => { const r = club.myRole ? await leaveClub(club.id) : await joinClub(club.id); if (!r.ok) setErr(r.error); })}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{club.myRole ? "مغادرة النادي" : "الانضمام"}
        </Button>
      )}
      {club.myRole === "lead" && <div className="mt-3 rounded-lg bg-amber-50 px-2 py-1 text-center text-[11px] font-bold text-amber-800">أنت مسؤول هذا النادي</div>}
    </div>
  );
}

function CreateClubModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [inst, setInst] = useState("");
  const [w, setW] = useState(16); const [focus, setFocus] = useState<Category[]>([]);
  const [pending, start] = useTransition(); const [err, setErr] = useState<string | null>(null);
  return (
    <Modal open onClose={onClose} title="تأسيس نادٍ تطوعي">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await createClub({ name, description: desc, institutionName: inst || undefined, wilayaCode: w, focus });
        if (!r.ok) setErr(r.error); else { onClose(); reloadPage(); } }); }}>
        <div><label htmlFor="cn" className="text-xs font-bold">اسم النادي *</label><input id="cn" required minLength={3} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={input} /></div>
        <div><label htmlFor="ci" className="text-xs font-bold">المؤسسة المضيفة (مثلاً: دار الشباب …)</label><input id="ci" maxLength={120} value={inst} onChange={(e) => setInst(e.target.value)} className={input} /></div>
        <div><label htmlFor="cwil" className="text-xs font-bold">الولاية *</label><select id="cwil" value={w} onChange={(e) => setW(+e.target.value)} className={input}>{WILAYAS.map((x) => <option key={x.code} value={x.code}>{x.code} - {x.nameAr}</option>)}</select></div>
        <div><label htmlFor="cd" className="text-xs font-bold">الوصف</label><textarea id="cd" maxLength={1000} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} className={input} /></div>
        <fieldset><legend className="text-xs font-bold mb-1">المجالات</legend><div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_META) as Category[]).map((c) => <button type="button" key={c} aria-pressed={focus.includes(c)} onClick={() => setFocus((f) => f.includes(c) ? f.filter((x) => x !== c) : [...f, c])} className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", focus.includes(c) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300")}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].labelAr}</button>)}
        </div></fieldset>
        {err && <p role="alert" className="text-xs text-red-600">{err}</p>}
        <Button className="w-full" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} تأسيس (ستصبح مسؤول النادي)</Button>
      </form>
    </Modal>
  );
}

function NewActivityModal({ club, onClose }: { club: ClubView; onClose: () => void }) {
  const [title, setTitle] = useState(""); const [loc, setLoc] = useState(""); const [when, setWhen] = useState("");
  const [pending, start] = useTransition(); const [err, setErr] = useState<string | null>(null);
  return (
    <Modal open onClose={onClose} title={`نشاط جديد — ${club.name}`}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await createActivity({ clubId: club.id, title, location: loc || undefined, startsAt: new Date(when).toISOString() });
        if (!r.ok) setErr(r.error); else { onClose(); reloadPage(); } }); }}>
        <div><label htmlFor="at" className="text-xs font-bold">العنوان *</label><input id="at" required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)} className={input} /></div>
        <div><label htmlFor="al" className="text-xs font-bold">المكان</label><input id="al" value={loc} onChange={(e) => setLoc(e.target.value)} className={input} /></div>
        <div><label htmlFor="aw" className="text-xs font-bold">التاريخ والساعة *</label><input id="aw" type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className={input} /></div>
        {err && <p role="alert" className="text-xs text-red-600">{err}</p>}
        <Button className="w-full" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} إنشاء</Button>
      </form>
    </Modal>
  );
}

function ScanModal({ activity, onClose }: { activity: ActivityView; onClose: () => void }) {
  const [hours, setHours] = useState("2");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ ok: boolean; text: string }[]>([]);
  const submit = async (token: string) => {
    setBusy(true);
    const h = hours ? Number(hours) : null;
    const r = await checkIn(token, activity.id, h);
    setLog((l) => [{ ok: r.ok, text: r.ok ? (r.data!.status === "already_checked_in" ? "مسجّل من قبل" : `✓ حضور ${r.data!.name ?? "متطوع"}`) : r.error }, ...l].slice(0, 8));
    setBusy(false);
  };
  return (
    <Modal open onClose={onClose} title={`تسجيل الحضور — ${activity.title}`}>
      <p className="text-xs text-slate-500 mb-3">امسح بطاقة QR الحية من ملف المتطوع. كل رمز صالح 5 دقائق ولمرة واحدة؛ لا يمكنك تسجيل نفسك.</p>
      <div className="mb-3 flex items-center gap-2"><label htmlFor="hrs" className="text-xs font-bold">ساعات تُسجَّل لكل حاضر</label><input id="hrs" type="number" min="0.5" max="24" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm" /></div>
      <QrScanner onScan={submit} paused={busy} />
      <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold">لصق الرمز يدوياً</summary>
        <div className="mt-2 flex gap-2"><input value={manual} onChange={(e) => setManual(e.target.value)} dir="ltr" className="flex-1 rounded-lg border border-slate-300 px-2 py-1 font-mono text-[10px]" aria-label="الرمز" />
          <Button size="sm" disabled={busy || !manual} onClick={() => { submit(manual); setManual(""); }}>تحقق</Button></div>
      </details>
      <ul className="mt-3 space-y-1" aria-live="polite">{log.map((l, i) => <li key={i} className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold", l.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}>{l.ok && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}{l.text}</li>)}</ul>
    </Modal>
  );
}

function ReportModal({ activity, onClose }: { activity: ActivityView; onClose: () => void }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState(""); const [att, setAtt] = useState("0"); const [hrs, setHrs] = useState("0"); const [res, setRes] = useState("");
  const [pending, start] = useTransition(); const [msg, setMsg] = useState<string | null>(null);
  return (
    <Modal open onClose={onClose} title={`تقرير ما بعد النشاط — ${activity.title}`}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await submitReport({ activityId: activity.id, outcome, attended: +att, hours: +hrs, resources: res || undefined });
        if (!r.ok) setMsg(r.error); else { setMsg("أُرسل التقرير — يظهر للعموم بعد اعتماد مشرف."); router.refresh(); } }); }}>
        <div><label htmlFor="ro" className="text-xs font-bold">ما الذي تحقق؟ *</label><textarea id="ro" required minLength={5} rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)} className={input} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label htmlFor="ra" className="text-xs font-bold">عدد الحاضرين</label><input id="ra" type="number" min="0" value={att} onChange={(e) => setAtt(e.target.value)} className={input} /></div>
          <div><label htmlFor="rh" className="text-xs font-bold">مجموع الساعات</label><input id="rh" type="number" min="0" step="0.5" value={hrs} onChange={(e) => setHrs(e.target.value)} className={input} /></div>
        </div>
        <div><label htmlFor="rr" className="text-xs font-bold">الموارد المستعملة</label><input id="rr" value={res} onChange={(e) => setRes(e.target.value)} className={input} /></div>
        <p className="text-[11px] text-slate-500">التقرير وصفي؛ الساعات في الشهادات تأتي فقط من الحضور المؤكد بالمسح.</p>
        {msg && <p role="status" className="text-xs text-slate-700">{msg}</p>}
        <Button className="w-full" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} إرسال</Button>
      </form>
    </Modal>
  );
}
