"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Sparkles, MapPin, Droplets, Wrench, Clock, Building2, FileBadge, Star, ChevronLeft, QrCode as QrIcon, Smartphone, ShieldCheck } from "lucide-react";
import { useAthar } from "@/lib/store";
import { SKILLS, BLOOD_TYPES, BADGES, CATEGORY_META, URGENCY_META } from "@/lib/mock-data";
import { WILAYAS } from "@/lib/wilayas";
import type { Alert, VolunteerProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { QrCode } from "@/components/qr-code";
import { HelpModal } from "@/components/public/help-modal";
import { cn, formatDate, timeAgo } from "@/lib/utils";

const LEVELS = [
  { min: 0, name: "متطوع مبتدئ", color: "text-slate-600" },
  { min: 100, name: "متطوع نشط", color: "text-emerald-700" },
  { min: 300, name: "متطوع متميز", color: "text-indigo-700" },
  { min: 700, name: "سفير إيثار", color: "text-amber-600" },
];
const levelOf = (p: number) => [...LEVELS].reverse().find((l) => p >= l.min)!;
const nextLevel = (p: number) => LEVELS.find((l) => l.min > p);

export default function ProfilePage() {
  const { profile, saveProfile, matchedAlerts, joinedIds, alerts, clubs, setSmsAlerts, trees } = useAthar();
  const myTrees = trees.filter((t) => t.mine && t.status === "approved").length;
  const [editing, setEditing] = useState(false);
  const [helpTarget, setHelpTarget] = useState<Alert | null>(null);
  const [cert, setCert] = useState(false);

  if (!profile || editing) return <ProfileForm initial={profile} onSave={(p) => { saveProfile(p); setEditing(false); }} onCancel={profile ? () => setEditing(false) : undefined} />;

  const lvl = levelOf(profile.points);
  const nxt = nextLevel(profile.points);
  const pct = nxt ? Math.round(((profile.points - lvl.min) / (nxt.min - lvl.min)) * 100) : 100;
  const wilaya = WILAYAS.find((w) => w.code === profile.wilayaCode);
  const myAlerts = alerts.filter((a) => joinedIds.includes(a.id));
  const myClubs = clubs.filter((c) => profile.joinedClubs.includes(c.id));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* header */}
      <section className="rounded-3xl bg-gradient-to-l from-brand-700 to-slate-900 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-3xl font-black backdrop-blur">
            {profile.name.trim().charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black">{profile.name}</h1>
              <span className={cn("rounded-full bg-white px-2.5 py-0.5 text-xs font-black", lvl.color)}>{lvl.name}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {wilaya?.nameAr}</span>
              {profile.bloodType && <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> {profile.bloodType}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {{ weekends: "نهاية الأسبوع", evenings: "مساءً", anytime: "متاح دائماً" }[profile.availability]}</span>
              <span className="flex items-center gap-1"><Wrench className="h-3.5 w-3.5" /> {profile.skills.length ? profile.skills.join("، ") : "بدون مهارات محددة"}</span>
              <Link href="/trees" className="flex items-center gap-1 font-bold text-emerald-200">🌳 {myTrees} شجرة موثّقة</Link>
            </div>
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold">{profile.points} نقطة <span className="text-white/60 font-normal">· {profile.confirmedPoints ?? 0} مؤكدة بالحضور</span></span>
                <span className="text-white/70">{nxt ? `${nxt.min - profile.points} نقطة للمستوى التالي: ${nxt.name}` : "أعلى مستوى 🏆"}</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>
          <div className="flex md:flex-col gap-2">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setEditing(true)}>تعديل الملف</Button>
            <Button size="sm" className="bg-amber-400 text-slate-900 hover:bg-amber-300" onClick={() => setCert(true)} disabled={myAlerts.length === 0}>
              <FileBadge className="h-4 w-4" /> شهادة التطوع
            </Button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* matched */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="flex items-center gap-2 font-black text-slate-900"><Sparkles className="h-5 w-5 text-brand-600" /> نداءات مناسبة لك</h2>
              <span className="text-xs text-slate-500">مطابقة ذكية: الولاية · فصيلة الدم · المهارات</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">يرشّح إيثار النداءات الموثّقة الأقرب إليك والأنسب لقدراتك — بدل أن تبحث أنت.</p>
            {matchedAlerts.length === 0 && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">لا توجد نداءات مطابقة حالياً. <Link href="/" className="text-brand-700 font-bold">تصفح الخريطة</Link></div>}
            <div className="grid sm:grid-cols-2 gap-3">
              {matchedAlerts.map((a) => {
                const cat = CATEGORY_META[a.category]; const urg = URGENCY_META[a.urgency];
                const reasons = [
                  a.wilayaCode === profile.wilayaCode && "في ولايتك",
                  a.category === "blood" && profile.bloodType && a.aiTags.some((t) => t.includes(profile.bloodType!)) && `فصيلتك ${profile.bloodType}`,
                  a.urgency === "critical" && "حالة حرجة",
                ].filter(Boolean) as string[];
                const joined = joinedIds.includes(a.id);
                return (
                  <div key={a.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span>
                    </div>
                    <div className="font-bold text-sm text-slate-900">{a.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{a.wilaya} · {timeAgo(a.postedAt)}{a.hub && ` · 🏛️ ${a.hub}`}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {reasons.map((r) => <span key={r} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">✓ {r}</span>)}
                    </div>
                    <Button size="sm" variant={joined ? "success" : "primary"} className="mt-2 w-full" disabled={joined} onClick={() => setHelpTarget(a)}>
                      {joined ? "مسجَّل ✓" : "أستطيع المساعدة"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-900 mb-3">مشاركاتي ({myAlerts.length})</h2>
            {myAlerts.length === 0 ? <p className="text-sm text-slate-500">لم تشارك بعد — ابدأ من النداءات المقترحة أعلاه.</p> : (
              <ul className="divide-y divide-slate-100">
                {myAlerts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <div><div className="font-semibold text-slate-800">{a.title}</div><div className="text-[11px] text-slate-500">{a.wilaya} · {a.contactName}</div></div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">+{a.urgency === "critical" ? 100 : a.urgency === "medium" ? 60 : 40}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* badges + clubs */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-slate-900 mb-1"><QrIcon className="h-5 w-5 text-slate-700" /> بطاقة المتطوع (QR)</h2>
            <p className="text-[11px] text-slate-500 mb-3">اعرضها لمسؤول النادي عند الحضور في دار الشباب — يمسحها فتتحول نقاطك إلى <b>نقاط مؤكدة</b> تُحتسب في الشهادة والترتيب.</p>
            <div className="flex items-center gap-4">
              <QrCode seed={profile.name + profile.phone} size={110} />
              <div className="text-xs text-slate-600 space-y-1">
                <div className="font-mono font-bold text-slate-900" dir="ltr">ATH-{profile.createdAt.slice(2, 10).replace(/-/g, "")}</div>
                <div className="flex items-center gap-1 text-emerald-700 font-bold"><ShieldCheck className="h-3.5 w-3.5" /> {profile.confirmedPoints ?? 0} نقطة مؤكدة</div>
                <div className="text-[10px] text-slate-400">يمنع التلاعب بالنقاط ويثبت الحضور الفعلي</div>
              </div>
            </div>
          </div>
          <label className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm cursor-pointer">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Smartphone className="h-4 w-4 text-brand-600" /> تنبيهات SMS بدون إنترنت<div className="text-[10px] font-normal text-slate-500">نداءات حرجة وطوارئ في ولايتك عبر رسالة قصيرة</div></div>
            <button type="button" role="switch" aria-checked={!!profile.smsAlerts} onClick={() => setSmsAlerts(!profile.smsAlerts)} className={cn("relative h-6 w-11 rounded-full transition-colors", profile.smsAlerts ? "bg-brand-500" : "bg-slate-300")}>
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", profile.smsAlerts ? "left-0.5" : "left-[22px]")} />
            </button>
          </label>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-slate-900 mb-3"><Award className="h-5 w-5 text-amber-500" /> الشارات</h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(BADGES).map(([k, b]) => {
                const has = profile.badges.includes(k);
                return (
                  <div key={k} title={b.desc} className={cn("rounded-2xl border p-2 text-center", has ? "border-amber-300 bg-amber-50" : "border-slate-100 opacity-40 grayscale")}>
                    <div className="text-2xl">{b.emoji}</div>
                    <div className="text-[10px] font-bold text-slate-700 leading-tight mt-1">{b.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-slate-900 mb-3"><Building2 className="h-5 w-5 text-indigo-600" /> نواديّ</h2>
            {myClubs.length === 0 ? (
              <div className="text-sm text-slate-500">لست عضواً في أي نادٍ بعد. <Link href="/clubs" className="font-bold text-indigo-700">اكتشف نوادي دور الشباب <ChevronLeft className="inline h-3 w-3" /></Link></div>
            ) : myClubs.map((c) => (
              <div key={c.id} className="rounded-2xl bg-indigo-50 p-3 mb-2">
                <div className="font-bold text-sm text-slate-900">{c.name}</div>
                <div className="text-[11px] text-slate-500">{c.institution} · {c.members} عضو</div>
                <div className="text-[11px] text-indigo-700 mt-1">القادم: {c.nextActivity.title} — {formatDate(c.nextActivity.date)}</div>
              </div>
            ))}
          </div>
          <div className="rounded-3xl bg-slate-900 p-5 text-white">
            <Star className="h-5 w-5 text-amber-400" />
            <div className="mt-2 font-black">لماذا النقاط؟</div>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">النقاط تُحوَّل إلى شهادة تطوع معتمدة من مديرية الشباب والرياضة والترفيه، وتُحتسب في ترتيب ناديك ودار شبابك ولائياً ووطنياً.</p>
          </div>
        </div>
      </div>

      <HelpModal alert={helpTarget} onClose={() => setHelpTarget(null)} />
      <Certificate open={cert} onClose={() => setCert(false)} profile={profile} count={myAlerts.length} />
    </div>
  );
}

function Certificate({ open, onClose, profile, count }: { open: boolean; onClose: () => void; profile: VolunteerProfile; count: number }) {
  const w = WILAYAS.find((x) => x.code === profile.wilayaCode);
  return (
    <Modal open={open} onClose={onClose} title="شهادة مشاركة تطوعية" className="sm:max-w-2xl">
      <div className="rounded-2xl border-4 border-double border-amber-400 bg-gradient-to-b from-amber-50 to-white p-6 text-center">
        <div className="text-[11px] font-bold text-slate-500">الجمهورية الجزائرية الديمقراطية الشعبية</div>
        <div className="text-[11px] font-bold text-slate-500">وزارة الشباب · مديرية الشباب والرياضة والترفيه لولاية {w?.nameAr}</div>
        <div className="mt-4 text-3xl font-black text-slate-900">شهادة تطوع</div>
        <div className="mt-3 text-sm text-slate-600">تشهد منصة إيثار أن</div>
        <div className="mt-1 text-2xl font-black text-brand-700">{profile.name}</div>
        <div className="mt-2 text-sm text-slate-600 leading-relaxed">
          قد ساهم(ت) في <b>{count}</b> نداءً تطوعياً موثّقاً وجمع(ت) <b>{profile.points}</b> نقطة أثر،
          مجسّداً(ة) قيم المواطنة والتضامن والتكافل.
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span>رقم: ATH-{profile.createdAt.slice(2, 10).replace(/-/g, "")}-{profile.points}</span>
          <span>{formatDate(new Date().toISOString())}</span>
        </div>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">✓ قابلة للتحقق عبر رمز QR (نسخة الإنتاج)</div>
      </div>
      <Button className="mt-4 w-full" variant="secondary" onClick={() => window.print()}>طباعة / حفظ PDF</Button>
    </Modal>
  );
}

function ProfileForm({ initial, onSave, onCancel }: { initial: VolunteerProfile | null; onSave: (p: Omit<VolunteerProfile, "points" | "badges" | "joinedClubs" | "createdAt">) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [wilayaCode, setWilayaCode] = useState(initial?.wilayaCode ?? 16);
  const [bloodType, setBloodType] = useState(initial?.bloodType ?? "");
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [availability, setAvailability] = useState<VolunteerProfile["availability"]>(initial?.availability ?? "weekends");
  const input = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800"><Sparkles className="h-3.5 w-3.5" /> دقيقة واحدة</div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{initial ? "تعديل ملف المتطوع" : "أنشئ ملفك التطوعي"}</h1>
        <p className="mt-1 text-sm text-slate-600">سيقترح عليك إيثار النداءات المناسبة لموقعك وفصيلة دمك ومهاراتك، ويحفظ نقاطك وشاراتك وشهاداتك.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ name, phone, wilayaCode, bloodType: bloodType || undefined, skills, availability }); }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="mb-1 block text-sm font-semibold">الاسم الكامل</label><input required value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="ياسين بن عمر" /></div>
          <div><label className="mb-1 block text-sm font-semibold">رقم الهاتف</label><input required dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className={cn(input, "text-right")} placeholder="05 XX XX XX XX" /></div>
          <div><label className="mb-1 block text-sm font-semibold">الولاية</label>
            <select value={wilayaCode} onChange={(e) => setWilayaCode(+e.target.value)} className={input}>{WILAYAS.map((w) => <option key={w.code} value={w.code}>{w.code} - {w.nameAr}</option>)}</select></div>
          <div><label className="mb-1 block text-sm font-semibold">فصيلة الدم (اختياري)</label>
            <div className="flex flex-wrap gap-1.5">
              {BLOOD_TYPES.map((b) => <button type="button" key={b} onClick={() => setBloodType(bloodType === b ? "" : b)} className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-bold", bloodType === b ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300 text-slate-700")}>{b}</button>)}
            </div></div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">المهارات</label>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => <button type="button" key={s} onClick={() => setSkills((k) => (k.includes(s) ? k.filter((x) => x !== s) : [...k, s]))} className={cn("rounded-full border px-3 py-1.5 text-xs font-bold", skills.includes(s) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-700")}>{s}</button>)}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">التوفر</label>
          <div className="grid grid-cols-3 gap-2">
            {([["weekends", "نهاية الأسبوع"], ["evenings", "مساءً"], ["anytime", "متاح دائماً"]] as const).map(([k, l]) => (
              <button type="button" key={k} onClick={() => setAvailability(k)} className={cn("rounded-xl border py-2 text-sm font-bold", availability === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700")}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" size="lg" className="flex-1">{initial ? "حفظ التعديلات" : "إنشاء الملف وبدء التطوع"}</Button>
          {onCancel && <Button type="button" variant="outline" size="lg" onClick={onCancel}>إلغاء</Button>}
        </div>
      </form>
    </div>
  );
}
