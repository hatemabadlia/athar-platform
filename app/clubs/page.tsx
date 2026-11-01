"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trophy, Users, CalendarDays, MapPin, Plus, Building2, Flame, Medal, Quote, Sparkles, ScanLine, CheckCircle2 } from "lucide-react";
import { QrCode } from "@/components/qr-code";
import { sleep } from "@/lib/utils";
import { useAthar } from "@/lib/store";
import { CATEGORY_META, IMPACT_STORIES } from "@/lib/mock-data";
import { WILAYAS } from "@/lib/wilayas";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn, formatDate } from "@/lib/utils";

export default function ClubsPage() {
  const { clubs, profile, joinClub, createClub, confirmAttendance } = useAthar();
  const [scanClub, setScanClub] = useState<string | null>(null);
  const [wilaya, setWilaya] = useState<number | "all">("all");
  const [open, setOpen] = useState(false);

  const ranked = useMemo(() => [...clubs].sort((a, b) => b.points - a.points), [clubs]);
  const visible = ranked.filter((c) => wilaya === "all" || c.wilayaCode === wilaya);
  const totals = useMemo(
    () => ({
      members: clubs.reduce((s, c) => s + c.members, 0),
      activities: clubs.reduce((s, c) => s + c.activitiesThisMonth, 0),
      institutions: new Set(clubs.map((c) => c.institution)).size,
    }),
    [clubs]
  );
  const wilayasWithClubs = [...new Set(clubs.map((c) => c.wilayaCode))].map((c) => WILAYAS.find((w) => w.code === c)!);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-700 via-violet-700 to-slate-900 p-6 sm:p-8 text-white">
        <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              <Building2 className="h-3.5 w-3.5" /> مؤسسات الشباب فضاءات للابتكار والتطوع
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-black leading-tight">نوادي التطوع في دور الشباب</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">
              كل دار شباب تصبح مركز قيادة تطوعي: النادي يستقبل النداءات الموثّقة في محيطه، ينظّم أعضاءه، ويتنافس
              في الترتيب الولائي والوطني. نقاط، شارات، وشهادات — لتحفيز الشباب على المشاركة والاستمرار.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" className="bg-white text-indigo-800 hover:bg-indigo-50" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> أنشئ نادياً في دار شبابك
              </Button>
              {!profile && (
                <Link href="/profile" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 h-10 text-sm font-semibold hover:bg-white/10">
                  <Sparkles className="h-4 w-4" /> سجّل كمتطوع أولاً
                </Link>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat v={clubs.length} l="نادٍ نشط" />
            <Stat v={totals.members} l="شاب متطوع" />
            <Stat v={totals.activities} l="نشاط هذا الشهر" />
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        {/* Leaderboard */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-black text-slate-900"><Trophy className="h-5 w-5 text-amber-500" /> الترتيب الوطني</h2>
            <span className="text-xs text-slate-500">حسب نقاط الأثر</span>
          </div>
          <ol className="space-y-2">
            {ranked.slice(0, 8).map((c, i) => {
              const mine = profile?.joinedClubs.includes(c.id);
              return (
                <li key={c.id} className={cn("flex items-center gap-3 rounded-2xl border p-2.5", mine ? "border-indigo-300 bg-indigo-50" : "border-slate-100")}>
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                    i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-600")}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">{c.name}</div>
                    <div className="truncate text-[11px] text-slate-500">{c.institution} · {c.wilaya}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-indigo-700 tabular-nums">{c.points.toLocaleString("en-US")}</div>
                    <div className="text-[10px] text-slate-400">نقطة</div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            🏆 النادي الأول ولائياً يمثّل ولايته في <b>الأسبوع الوطني للتطوع</b> ويحصل على تجهيزات لدار الشباب.
          </div>
        </div>

        {/* Clubs grid */}
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={wilaya === "all"} onClick={() => setWilaya("all")}>كل الولايات</Chip>
            {wilayasWithClubs.map((w) => (
              <Chip key={w.code} active={wilaya === w.code} onClick={() => setWilaya(w.code)}>{w.nameAr}</Chip>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {visible.map((c) => {
              const joined = profile?.joinedClubs.includes(c.id);
              const rank = ranked.findIndex((x) => x.id === c.id) + 1;
              return (
                <div key={c.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 truncate">{c.name}</h3>
                        {rank <= 3 && <Medal className="h-4 w-4 text-amber-500 shrink-0" />}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Building2 className="h-3.5 w-3.5" /> {c.institution}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /> {c.wilaya} · {c.baladiya}</div>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-indigo-50 px-3 py-2 text-center">
                      <div className="text-lg font-black text-indigo-700 tabular-nums leading-none">#{rank}</div>
                      <div className="text-[10px] text-indigo-500 mt-0.5">وطنياً</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.focus.map((f: Category) => (
                      <span key={f} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_META[f].bg} ${CATEGORY_META[f].color}`}>
                        {CATEGORY_META[f].emoji} {CATEGORY_META[f].labelAr}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <Mini icon={Users} v={c.members} l="عضو" />
                    <Mini icon={Flame} v={c.activitiesThisMonth} l="نشاط/شهر" />
                    <Mini icon={Trophy} v={c.points} l="نقطة" />
                  </div>
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs">
                    <div className="flex items-center gap-1 font-bold text-slate-700"><CalendarDays className="h-3.5 w-3.5 text-indigo-600" /> النشاط القادم</div>
                    <div className="mt-0.5 text-slate-600">{c.nextActivity.title}</div>
                    <div className="text-[10px] text-slate-400">{formatDate(c.nextActivity.date)} · المسؤول: {c.lead}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={joined ? "success" : "outline"}
                    className="mt-3 w-full"
                    disabled={joined}
                    onClick={() => (profile ? joinClub(c.id) : (window.location.href = "/profile"))}
                  >
                    {joined ? "أنت عضو في هذا النادي ✓" : profile ? "انضم إلى النادي (+30 نقطة)" : "سجّل للانضمام"}
                  </Button>
                  {joined && (
                    <button onClick={() => setScanClub(c.id)} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
                      <ScanLine className="h-3.5 w-3.5" /> تأكيد الحضور بمسح QR (وضع مسؤول النادي)
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Impact stories — قيم المواطنة والتضامن */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-900 mb-3">جدار الأثر — قصص من الميدان</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {IMPACT_STORIES.map((s) => (
                <div key={s.id} className="rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 p-4">
                  <Quote className="h-4 w-4 text-indigo-400" />
                  <p className="mt-2 text-xs leading-relaxed text-slate-700">{s.text}</p>
                  <div className="mt-3 text-[11px] font-bold text-slate-800">{s.name}</div>
                  <div className="text-[10px] text-indigo-600">{s.club}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CreateClubModal open={open} onClose={() => setOpen(false)} onCreate={createClub} hasProfile={!!profile} />
      <ScanModal club={clubs.find((c) => c.id === scanClub) ?? null} onClose={() => setScanClub(null)} profileName={profile?.name ?? ""} seed={(profile?.name ?? "") + (profile?.phone ?? "")} onConfirm={() => confirmAttendance(20)} />
    </div>
  );
}

function CreateClubModal({ open, onClose, onCreate, hasProfile }: { open: boolean; onClose: () => void; onCreate: ReturnType<typeof useAthar>["createClub"]; hasProfile: boolean }) {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [wilayaCode, setWilayaCode] = useState(16);
  const [lead, setLead] = useState("");
  const [focus, setFocus] = useState<Category[]>(["relief"]);
  const [done, setDone] = useState(false);
  const input = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = WILAYAS.find((x) => x.code === wilayaCode)!;
    onCreate({ name, institution, wilayaCode, wilaya: w.nameAr, baladiya: w.nameAr, focus, lead, nextActivity: { title: "الاجتماع التأسيسي للنادي", date: new Date(Date.now() + 7 * 864e5).toISOString() } });
    setDone(true);
  };
  const close = () => { setDone(false); setName(""); setInstitution(""); setLead(""); onClose(); };

  return (
    <Modal open={open} onClose={close} title="🏛️ إنشاء نادي تطوع في مؤسسة شباب">
      {!hasProfile ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-slate-600">لإنشاء نادٍ، سجّل أولاً كمتطوع.</p>
          <Link href="/profile" className="inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">إنشاء ملف متطوع</Link>
        </div>
      ) : done ? (
        <div className="text-center py-4 space-y-2 animate-fade-up">
          <div className="text-4xl">🎉</div>
          <h4 className="text-lg font-black">تم إنشاء النادي!</h4>
          <p className="text-sm text-slate-600">أُرسل طلب الاعتماد إلى مديرية الشباب والرياضة والترفيه. حصلت على +50 نقطة وشارة «عضو نادٍ».</p>
          <Button onClick={close} className="mt-2">رائع</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div><label className="mb-1 block text-sm font-semibold">اسم النادي</label><input required value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="مثال: نادي الأمل للتطوع" /></div>
          <div><label className="mb-1 block text-sm font-semibold">مؤسسة الشباب الحاضنة</label><input required value={institution} onChange={(e) => setInstitution(e.target.value)} className={input} placeholder="دار الشباب / مركز الشباب …" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-semibold">الولاية</label>
              <select value={wilayaCode} onChange={(e) => setWilayaCode(+e.target.value)} className={input}>
                {WILAYAS.map((w) => <option key={w.code} value={w.code}>{w.code} - {w.nameAr}</option>)}
              </select></div>
            <div><label className="mb-1 block text-sm font-semibold">المسؤول</label><input required value={lead} onChange={(e) => setLead(e.target.value)} className={input} /></div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">مجالات النشاط</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                <button type="button" key={c} onClick={() => setFocus((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]))}
                  className={cn("rounded-full border px-3 py-1 text-xs font-bold", focus.includes(c) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 text-slate-700")}>
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].labelAr}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">إرسال طلب الاعتماد</Button>
        </form>
      )}
    </Modal>
  );
}

function Stat({ v, l }: { v: number; l: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur">
      <div className="text-2xl font-black tabular-nums">{v.toLocaleString("en-US")}</div>
      <div className="text-[10px] font-semibold text-white/75">{l}</div>
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold", active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700")}>
      {children}
    </button>
  );
}
function Mini({ icon: Icon, v, l }: { icon: React.ElementType; v: number; l: string }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <Icon className="mx-auto h-3.5 w-3.5 text-slate-400" />
      <div className="font-black text-slate-900 tabular-nums">{v.toLocaleString("en-US")}</div>
      <div className="text-[10px] text-slate-500">{l}</div>
    </div>
  );
}

function ScanModal({ club, onClose, profileName, seed, onConfirm }: { club: ReturnType<typeof useAthar>["clubs"][number] | null; onClose: () => void; profileName: string; seed: string; onConfirm: () => void }) {
  const [stage, setStage] = useState<"idle" | "scanning" | "done">("idle");
  const run = async () => { setStage("scanning"); await sleep(1800); onConfirm(); setStage("done"); };
  const close = () => { setStage("idle"); onClose(); };
  if (!club) return null;
  return (
    <Modal open={!!club} onClose={close} title={`📷 تأكيد الحضور — ${club.institution}`}>
      <p className="text-xs text-slate-500 mb-3">مسؤول النادي يمسح بطاقة المتطوع عند الوصول. النقاط المؤكدة بالحضور فقط تُحتسب في الشهادة والترتيب — لا نقاط بالنقر من البيت.</p>
      <div className="relative mx-auto w-fit rounded-2xl border-2 border-indigo-300 p-3 bg-slate-50 overflow-hidden">
        <QrCode seed={seed} size={160} />
        {stage === "scanning" && <div className="absolute inset-x-0 h-1 bg-indigo-500 shadow-[0_0_12px_#6366f1] animate-scan" />}
        {stage === "done" && <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/90 text-white animate-fade-up"><CheckCircle2 className="h-14 w-14" /></div>}
      </div>
      <div className="mt-3 text-center text-sm">
        {stage === "idle" && <span className="text-slate-600">{profileName} — النشاط: {club.nextActivity.title}</span>}
        {stage === "scanning" && <span className="font-bold text-indigo-700 animate-pulse">جارٍ المسح والتحقق من الهوية…</span>}
        {stage === "done" && <span className="font-black text-emerald-700">✓ تم تأكيد حضور {profileName} · +20 نقطة مؤكدة · أُضيفت لرصيد {club.name}</span>}
      </div>
      <Button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700" onClick={stage === "done" ? close : run} disabled={stage === "scanning"}>
        {stage === "done" ? "تم" : "مسح البطاقة"}
      </Button>
    </Modal>
  );
}
