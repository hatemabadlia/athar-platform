"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Award, Sparkles, MapPin, Droplets, Wrench, Clock, Building2, FileBadge, QrCode as QrIcon, Smartphone, ShieldCheck, Download, Trash2, Loader2, RefreshCw } from "lucide-react";
import { SKILLS, SKILL_META, BLOOD_TYPES, BADGES, CATEGORY_META, URGENCY_META } from "@/lib/reference/meta";
import { WILAYAS } from "@/lib/wilayas";
import type { BloodType, ProfileView, PublicAlert } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { HelpModal } from "@/components/public/help-modal";
import { saveProfile, issueQrToken, issueCertificate, requestDeletion, cancelDeletion } from "@/app/actions/profile";
import { levelOf, nextLevel } from "@/lib/badges";
import { cn, formatDate, timeAgo } from "@/lib/utils";

type Participation = { status: string; hours: number | null; joinedAt: string; alert: { id: string; title: string; category: string; urgency: string; status: string } | null };
const STATUS_AR: Record<string, string> = { joined: "مسجّل — بانتظار التأكيد", confirmed: "مؤكد ✓", no_show: "لم يحضر", cancelled: "ملغى" };

export function ProfileClient(props: {
  profile: ProfileView; badges: string[]; matches: { alert: PublicAlert; reasons: string[] }[];
  participations: Participation[]; attendance: { id: number; at: string; hours: number | null; title: string }[];
  clubs: { id: string; name: string; institution_name: string | null; role: string }[];
  certificates: { id: string; hours: number; activities: number; issued_at: string; revoked_at: string | null }[];
  deletionScheduledFor: string | null; treesApproved: number;
}) {
  const { profile } = props;
  const [editing, setEditing] = useState(!profile.displayName);
  const [helpTarget, setHelpTarget] = useState<PublicAlert | null>(null);
  if (editing) return <ProfileForm initial={profile} onDone={() => setEditing(false)} canCancel={!!profile.displayName} />;

  const lvl = levelOf(profile.points);
  const nxt = nextLevel(profile.points);
  const pct = nxt ? Math.round(((profile.points - lvl.min) / (nxt.min - lvl.min)) * 100) : 100;
  const wilaya = WILAYAS.find((w) => w.code === profile.wilayaCode);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <section className="rounded-3xl bg-ink pattern-zellige p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-3xl font-black" aria-hidden>{profile.displayName.trim().charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black">{profile.displayName}</h1>
              <span className={cn("rounded-full bg-white px-2.5 py-0.5 text-xs font-black", lvl.color)}>{lvl.name}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden /> {wilaya?.nameAr ?? "—"}</span>
              {profile.bloodType && <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" aria-hidden /> {profile.bloodType} (خاص)</span>}
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> {{ weekends: "نهاية الأسبوع", evenings: "مساءً", anytime: "متاح دائماً" }[profile.availability]}</span>
              <span className="flex items-center gap-1"><Wrench className="h-3.5 w-3.5" aria-hidden /> {profile.skills.length ? profile.skills.map((s) => (SKILL_META as Record<string, { regulated: boolean }>)[s]?.regulated ? `${s}${profile.verifiedSkills.includes(s) ? " ✓" : " (غير موثّقة)"}` : s).join("، ") : "بدون مهارات محددة"}{profile.remoteOk ? " · عن بُعد" : ""}</span>
              <Link href="/trees" className="font-bold text-emerald-200">🌳 {props.treesApproved} شجرة موثّقة</Link>
            </div>
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold">{profile.points} نقطة مؤكدة <span className="text-white/60 font-normal">· {profile.hours} ساعة</span></span>
                <span className="text-white/70">{nxt ? `${nxt.min - profile.points} للمستوى: ${nxt.name}` : "أعلى مستوى"}</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>
          <div className="flex md:flex-col gap-2">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setEditing(true)}>تعديل الملف</Button>
            <CertificateButton hours={profile.hours} />
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-slate-900 mb-1"><Sparkles className="h-5 w-5 text-brand-600" aria-hidden /> نداءات مناسبة لك</h2>
            <p className="text-xs text-slate-500 mb-4">حسب الولاية، توافق فصيلة الدم (جدول ABO/Rh)، المهارات والاستعجال — مع سبب كل اقتراح.</p>
            {props.matches.length === 0 && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">لا توجد نداءات معتمدة مطابقة حالياً. <Link href="/" className="text-brand-700 font-bold">تصفح الخريطة</Link></div>}
            <div className="grid sm:grid-cols-2 gap-3">
              {props.matches.map(({ alert: a, reasons }) => {
                const cat = CATEGORY_META[a.category]; const urg = URGENCY_META[a.urgency];
                return (
                  <div key={a.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span>
                    </div>
                    <div className="font-bold text-sm text-slate-900">{a.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{a.wilaya} · {timeAgo(a.createdAt)}</div>
                    <div className="mt-2 flex flex-wrap gap-1">{reasons.map((r) => <span key={r} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">✓ {r}</span>)}</div>
                    <Button size="sm" className="mt-2 w-full" onClick={() => setHelpTarget(a)}>أستطيع المساعدة</Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-900 mb-3">مشاركاتي ({props.participations.length})</h2>
            {props.participations.length === 0 ? <p className="text-sm text-slate-500">لم تشارك بعد — ابدأ من النداءات المقترحة.</p> : (
              <ul className="divide-y divide-slate-100">
                {props.participations.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0"><div className="font-semibold text-slate-800 truncate">{p.alert?.title ?? "نداء محذوف"}</div><div className="text-[11px] text-slate-500">{timeAgo(p.joinedAt)}{p.hours ? ` · ${p.hours} ساعة` : ""}</div></div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", p.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{STATUS_AR[p.status] ?? p.status}</span>
                  </li>
                ))}
              </ul>
            )}
            {props.attendance.length > 0 && (
              <>
                <h3 className="mt-4 mb-2 text-sm font-black text-slate-900">حضور مؤكد بـ QR ({props.attendance.length})</h3>
                <ul className="divide-y divide-slate-100 text-sm">
                  {props.attendance.map((a) => <li key={a.id} className="flex justify-between py-1.5"><span>{a.title}</span><span className="text-[11px] text-slate-500">{formatDate(a.at)}{a.hours ? ` · ${a.hours} س` : ""}</span></li>)}
                </ul>
              </>
            )}
          </div>

          <PrivacyCard scheduledFor={props.deletionScheduledFor} />
        </div>

        <div className="space-y-4">
          <QrCard />
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-sm">
            <div className="flex items-center gap-2 font-bold text-slate-800"><Smartphone className="h-4 w-4 text-brand-600" aria-hidden /> تنبيهات SMS للطوارئ: {profile.smsOptIn ? "مفعّلة" : "غير مفعّلة"}</div>
            <p className="mt-1 text-[11px] text-slate-500">تُرسل فقط عند إعلان حالة طوارئ في ولايتك، وتحتاج رقم هاتف. غيّرها من «تعديل الملف».</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-slate-900 mb-3"><Award className="h-5 w-5 text-amber-500" aria-hidden /> الشارات</h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(BADGES).map(([k, b]) => {
                const has = props.badges.includes(k);
                return (
                  <div key={k} title={b.desc} className={cn("rounded-2xl border p-2 text-center", has ? "border-amber-300 bg-amber-50" : "border-slate-100 opacity-40 grayscale")}>
                    <div className="text-2xl" aria-hidden>{b.emoji}</div>
                    <div className="text-[10px] font-bold text-slate-700 leading-tight mt-1">{b.label}{!has && <span className="sr-only"> (غير مكتسبة)</span>}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-slate-900 mb-3"><Building2 className="h-5 w-5 text-indigo-600" aria-hidden /> نواديّ</h2>
            {props.clubs.length === 0 ? <div className="text-sm text-slate-500">لست عضواً في أي نادٍ. <Link href="/clubs" className="font-bold text-indigo-700">اكتشف النوادي</Link></div>
              : props.clubs.map((c) => (
                <Link href={`/clubs?club=${c.id}`} key={c.id} className="block rounded-2xl bg-indigo-50 p-3 mb-2">
                  <div className="font-bold text-sm text-slate-900">{c.name}{c.role === "lead" && " · مسؤول"}</div>
                  <div className="text-[11px] text-slate-500">{c.institution_name ?? ""}</div>
                </Link>
              ))}
          </div>
          {props.certificates.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-black text-slate-900 mb-2">شهاداتي</h2>
              <ul className="space-y-1 text-sm">{props.certificates.map((c) => (
                <li key={c.id}><Link className="text-brand-700 underline" href={`/certificates/${c.id}`}>{formatDate(c.issued_at)} — {c.hours} ساعة{c.revoked_at ? " (ملغاة)" : ""}</Link></li>
              ))}</ul>
            </div>
          )}
        </div>
      </div>
      <HelpModal alert={helpTarget} onClose={() => setHelpTarget(null)} signedIn />
    </div>
  );
}

function CertificateButton({ hours }: { hours: number }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <Button size="sm" className="bg-amber-400 text-slate-900 hover:bg-amber-300" disabled={hours <= 0 || pending}
        title={hours <= 0 ? "تحتاج ساعات تطوع مؤكدة" : undefined}
        onClick={() => start(async () => { const r = await issueCertificate(); if (r.ok) window.location.assign(`/certificates/${r.data}`); else setErr(r.error); })}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBadge className="h-4 w-4" aria-hidden />} إصدار شهادة
      </Button>
      {err && <div role="alert" className="mt-1 text-[10px] text-amber-200">{err}</div>}
    </div>
  );
}

function QrCard() {
  const [svg, setSvg] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [exp, setExp] = useState<Date | null>(null);
  const [left, setLeft] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    setErr(null);
    const r = await issueQrToken();
    if (!r.ok) { setErr(r.error); return; }
    setSvg(await QRCode.toString(r.data!.token, { type: "svg", margin: 1, errorCorrectionLevel: "M" }));
    setToken(r.data!.token);
    setExp(new Date(r.data!.expiresAt));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!exp) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((exp.getTime() - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(t); load(); }
    }, 1000);
    return () => clearInterval(t);
  }, [exp]);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-black text-slate-900 mb-1"><QrIcon className="h-5 w-5 text-slate-700" aria-hidden /> بطاقة الحضور (QR)</h2>
      <p className="text-[11px] text-slate-500 mb-3">اعرضها لمسؤول النشاط عند وصولك. الرمز موقّع، صالح 5 دقائق ويُستخدم مرة واحدة — النقاط تُحتسب بعد المسح فقط.</p>
      <div className="flex items-center gap-4">
        {svg
          ? <div className="h-[140px] w-[140px] rounded-lg bg-white ring-1 ring-slate-200" aria-label="رمز QR للحضور" role="img" dangerouslySetInnerHTML={{ __html: svg }} />
          : <div className="h-[140px] w-[140px] rounded-lg skeleton" aria-hidden />}
        <div className="text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1 text-emerald-700 font-bold"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> موقّع من الخادم</div>
          {exp && <div>ينتهي خلال <b className="tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b></div>}
          <button onClick={load} className="flex items-center gap-1 text-brand-700 font-bold"><RefreshCw className="h-3 w-3" aria-hidden /> تحديث</button>
          {err && <div role="alert" className="text-red-600">{err}</div>}
        </div>
      </div>
      {token && (
        <details className="mt-3 text-[11px] text-slate-500">
          <summary className="cursor-pointer">عرض الرمز كنص (بدون كاميرا)</summary>
          <code data-testid="qr-token" dir="ltr" className="mt-1 block break-all rounded bg-slate-50 p-2 font-mono text-[10px] text-slate-700">{token}</code>
        </details>
      )}
    </div>
  );
}

function PrivacyCard({ scheduledFor }: { scheduledFor: string | null }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-900 mb-1">بياناتي وخصوصيتي</h2>
      <p className="text-xs text-slate-500 mb-3">حق الاطلاع والحذف (القانون 18-07). فصيلة الدم ورقم الهاتف لا يراهما أحد غيرك إلا عند الحاجة التشغيلية.</p>
      <div className="flex flex-wrap gap-2">
        <a href="/api/me/export" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"><Download className="h-4 w-4" aria-hidden /> تنزيل بياناتي (JSON)</a>
      </div>
      {scheduledFor ? (
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-800">
          سيُحذف حسابك نهائياً بتاريخ <b>{formatDate(scheduledFor)}</b>.
          <button disabled={pending} onClick={() => start(async () => { const r = await cancelDeletion(); setMsg(r.ok ? "أُلغي طلب الحذف." : r.error); })} className="mr-2 font-bold underline">إلغاء الطلب</button>
        </div>
      ) : (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer font-bold text-red-700">حذف حسابي</summary>
          <div className="mt-2 space-y-2">
            <p className="text-slate-600">يُحذف حسابك وبياناتك الشخصية بعد 14 يوماً (مهلة للتراجع). النداءات التي أرسلتها تبقى دون ربطها بك، والإحصاءات المجمّعة تبقى دون هوية.</p>
            <label htmlFor="del-reason" className="sr-only">السبب</label>
            <input id="del-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="السبب (اختياري)" className="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
            <Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => { const r = await requestDeletion(reason); setMsg(r.ok ? "سُجّل الطلب." : r.error); })}><Trash2 className="h-3.5 w-3.5" aria-hidden /> تأكيد طلب الحذف</Button>
          </div>
        </details>
      )}
      {msg && <p role="status" className="mt-2 text-xs text-slate-600">{msg}</p>}
    </div>
  );
}

function ProfileForm({ initial, onDone, canCancel }: { initial: ProfileView; onDone: () => void; canCancel: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(initial.displayName);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [wilayaCode, setWilayaCode] = useState(initial.wilayaCode ?? 16);
  const [bloodType, setBloodType] = useState<BloodType | null>(initial.bloodType);
  const [bloodConsent, setBloodConsent] = useState(!!initial.bloodType);
  const [smsOptIn, setSmsOptIn] = useState(initial.smsOptIn);
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [availability, setAvailability] = useState(initial.availability);
  const [remoteOk, setRemoteOk] = useState(initial.remoteOk);
  const [hideLb, setHideLb] = useState(initial.hideFromLeaderboard);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const input = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveProfile({ displayName: name, wilayaCode, skills, availability, remoteOk, hideFromLeaderboard: hideLb, phone: phone || undefined, bloodType, bloodConsent, smsOptIn });
      if (!r.ok) { setError(r.error); return; }
      router.refresh(); onDone();
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{canCancel ? "تعديل ملف المتطوع" : "أكمل ملفك التطوعي"}</h1>
        <p className="mt-1 text-sm text-slate-600">ليقترح عليك إيثار النداءات المناسبة لولايتك وفصيلتك ومهاراتك.</p>
      </div>
      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="pf-name" className="mb-1 block text-sm font-semibold">الاسم الظاهر *</label><input id="pf-name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={input} /></div>
          <div><label htmlFor="pf-phone" className="mb-1 block text-sm font-semibold">رقم الهاتف (خاص)</label><input id="pf-phone" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={cn(input, "text-right")} placeholder="05XX XX XX XX" /></div>
          <div><label htmlFor="pf-w" className="mb-1 block text-sm font-semibold">الولاية *</label>
            <select id="pf-w" value={wilayaCode} onChange={(e) => setWilayaCode(+e.target.value)} className={input}>{WILAYAS.map((w) => <option key={w.code} value={w.code}>{w.code} - {w.nameAr}</option>)}</select></div>
          <fieldset><legend className="mb-1 block text-sm font-semibold">فصيلة الدم (اختياري، خاص)</legend>
            <div className="flex flex-wrap gap-1.5">
              {BLOOD_TYPES.map((b) => <button type="button" key={b} aria-pressed={bloodType === b} onClick={() => setBloodType(bloodType === b ? null : b)} className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-bold", bloodType === b ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300 text-slate-700")}>{b}</button>)}
            </div></fieldset>
        </div>
        {bloodType && (
          <label className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-900">
            <input type="checkbox" checked={bloodConsent} onChange={(e) => setBloodConsent(e.target.checked)} className="mt-0.5" />
            <span>أوافق على حفظ فصيلة دمي (معلومة صحية حساسة) لاقتراح نداءات الدم المتوافقة. لا تظهر لأي مستخدم آخر، ويمكنني حذفها في أي وقت.</span>
          </label>
        )}
        <fieldset><legend className="mb-1 block text-sm font-semibold">مهاراتي — ماشي كل مساعدة مادية</legend>
          <p className="mb-2 text-[11px] text-slate-500">اختر ما تستطيع تقديمه بوقتك ومهارتك. المهن المنظَّمة (طبيب، محامٍ، أخصائي نفساني) لا تُقترح عليك إلا بعد توثيقها من مشرف ولايتك.</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => {
              const on = skills.includes(s);
              const regulated = SKILL_META[s].regulated;
              const verified = initial.verifiedSkills.includes(s);
              return (
                <button type="button" key={s} aria-pressed={on} onClick={() => setSkills((k) => (k.includes(s) ? k.filter((x) => x !== s) : [...k, s]))}
                  className={cn("rounded-full border px-3 py-1.5 text-xs font-bold", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-700")}>
                  {s}{regulated && <span className={cn("ms-1 text-[10px]", on ? "text-white/80" : verified ? "text-emerald-700" : "text-amber-700")}>{verified ? "✓ موثّقة" : "· تتطلب توثيقاً"}</span>}
                </button>
              );
            })}
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={remoteOk} onChange={(e) => setRemoteOk(e.target.checked)} className="mt-0.5" />
            <span>أستطيع المساعدة عن بُعد (تصميم، ترجمة، دروس، استشارة…) حتى خارج ولايتي.</span>
          </label></fieldset>
        <fieldset><legend className="mb-1 block text-sm font-semibold">التوفر</legend>
          <div className="grid grid-cols-3 gap-2">
            {([["weekends", "نهاية الأسبوع"], ["evenings", "مساءً"], ["anytime", "متاح دائماً"]] as const).map(([k, l]) => (
              <button type="button" key={k} aria-pressed={availability === k} onClick={() => setAvailability(k)} className={cn("rounded-xl border py-2 text-sm font-bold", availability === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700")}>{l}</button>
            ))}
          </div></fieldset>
        <label className="flex items-start gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={hideLb} onChange={(e) => setHideLb(e.target.checked)} className="mt-0.5" />
          <span>لا تُظهر اسمي في لوحة الشرف العامة (يبقى ترتيبي ظاهراً لي وحدي).</span>
        </label>
        <label className="flex items-start gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-0.5" />
          <span>أرغب في تلقي رسائل SMS عند إعلان حالة طوارئ في ولايتي (تتطلب رقم هاتف).</span>
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button type="submit" size="lg" className="flex-1" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button>
          {canCancel && <Button type="button" variant="outline" size="lg" onClick={onDone}>إلغاء</Button>}
        </div>
      </form>
    </div>
  );
}
