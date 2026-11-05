"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThumbsUp, Eye, Flag, MessageSquarePlus, Sparkles, Users, ShieldCheck, Send, CheckCircle2, Clock, Lock, MapPin, Share2 } from "lucide-react";
import type { CivicPublic } from "@/lib/data/civic";
import { CIVIC_CATEGORIES, CIVIC_SEVERITY, CIVIC_STATUS, CIVIC_TIMELINE, type CivicStatus } from "@/lib/civic";
import { supportCivic, commentCivic, flagCivic, replyCivicInfo } from "@/app/actions/civic";
import { cn } from "@/lib/utils";

const MiniMap = dynamic(() => import("@/components/civic/mini-map"), { ssr: false, loading: () => <div className="h-full w-full skeleton" /> });

type Ev = { id: number; kind: string; to_status: string | null; body: string | null; actor_role: string; created_at: string; photoUrl: string | null };
const ROLE: Record<string, string> = { reporter: "صاحب البلاغ", citizen: "مواطن", moderator: "مشرف الولاية", system: "النظام" };
const fmt = (d: string) => new Date(d).toLocaleString("ar-DZ", { dateStyle: "medium", timeStyle: "short" });

export function CivicReportView({ report: r, isPublic, mine, signedIn, photos, events, myVotes, duplicateRef }: {
  report: CivicPublic; isPublic: boolean; mine: boolean; signedIn: boolean; photos: string[]; events: Ev[]; myVotes: string[]; duplicateRef: string | null;
}) {
  const router = useRouter();
  const c = CIVIC_CATEGORIES[r.category] ?? CIVIC_CATEGORIES.other;
  const st = CIVIC_STATUS[r.status];
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [votes, setVotes] = useState(myVotes);
  const [counts, setCounts] = useState({ support: r.supporters, still: r.confirmations });
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"comment" | "flag" | "reply" | null>(r.status === "needs_info" && mine ? "reply" : null);
  const [photo, setPhoto] = useState(0);
  const open = isPublic && r.status !== "closed";
  const reached = new Set<string>([r.status, ...events.map((e) => e.to_status).filter(Boolean) as string[]]);

  const vote = (kind: "support" | "still_exists") => start(async () => {
    const res = await supportCivic(r.id, kind);
    if (!res.ok) { setMsg({ ok: false, t: res.error }); return; }
    setVotes((v) => [...new Set([...v, kind])]);
    setCounts((x) => kind === "support" ? { ...x, support: res.data! } : { ...x, still: res.data! });
    setMsg({ ok: true, t: kind === "support" ? "سُجّل دعمك. شكراً!" : "شكراً — سُجّل أن المشكل ما زال قائماً." });
  });
  const submitText = () => start(async () => {
    const res = mode === "flag" ? await flagCivic(r.id, text) : mode === "reply" ? await replyCivicInfo(r.id, text) : await commentCivic(r.id, text);
    if (!res.ok) { setMsg({ ok: false, t: res.error }); return; }
    setMsg({ ok: true, t: mode === "flag" ? "وصل تبليغك إلى المشرفين." : mode === "reply" ? "أُرسلت المعلومات، وعاد البلاغ للمراجعة." : "أُضيفت معلومتك." });
    setText(""); setMode(null); router.refresh();
  });
  const share = async () => {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: `صوّر وبلّغ — ${c.ar}`, url }); else { await navigator.clipboard.writeText(url); setMsg({ ok: true, t: "نُسخ الرابط." }); } } catch { /* cancelled */ }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4 min-w-0">
        <header className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold">{c.emoji} {c.ar}</span>
            <span className={cn("rounded-full px-2.5 py-1 font-bold", CIVIC_SEVERITY[r.severity].cls)}>{CIVIC_SEVERITY[r.severity].ar}</span>
            <span className="rounded-full px-2.5 py-1 font-black text-white" style={{ background: st.color }}>{st.ar}</span>
            <span dir="ltr" className="ms-auto font-mono text-slate-400">{r.ref}</span>
          </div>
          <h1 className="mt-3 text-xl sm:text-2xl font-black text-slate-900">{r.description}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" aria-hidden />{r.address ?? r.wilaya}{r.address && r.wilaya ? ` · ${r.wilaya}` : ""} · {fmt(r.createdAt)}</p>
          {!isPublic && <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-slate-50 p-2.5 text-xs font-semibold text-slate-600"><Lock className="h-4 w-4" aria-hidden /> هذا البلاغ ليس عمومياً بعد — يراه صاحبه ومشرفو الولاية فقط حتى يتحقق منه مشرف.</p>}
          {r.status === "duplicate" && duplicateRef && <p className="mt-3 text-xs font-bold text-fuchsia-800">مكرر للبلاغ <Link href={`/civic/r/${duplicateRef}`} className="underline" dir="ltr">{duplicateRef}</Link></p>}
        </header>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
          {photos.length ? (
            <>
              { }
              <img src={photos[photo]} alt={`صورة البلاغ ${photo + 1}`} className="max-h-[460px] w-full object-contain bg-slate-900" />
              {photos.length > 1 && <div className="flex gap-2 p-2">{photos.map((u, i) => (
                 
                <button key={u} onClick={() => setPhoto(i)} className={cn("h-14 w-14 overflow-hidden rounded-lg ring-2", i === photo ? "ring-slate-900" : "ring-transparent")}><img src={u} alt="" className="h-full w-full object-cover" /></button>
              ))}</div>}
            </>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-1 text-center text-xs text-slate-500"><Eye className="h-6 w-6" aria-hidden />الصورة غير منشورة للعموم بعد<br />(قد تحتوي وجوهاً أو لوحات سيارات أو ملكية خاصة — يقرّر المشرف).</div>
          )}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-slate-900">مسار البلاغ</h2>
          <ol className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            {CIVIC_TIMELINE.map((s) => {
              // only statuses this report actually went through (e.g. "forwarded" is never implied)
              const done = s === "pending_review" || reached.has(s);
              return <li key={s} className={cn("rounded-full px-2.5 py-1 font-bold", done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400")}>{CIVIC_STATUS[s].ar}</li>;
            })}
          </ol>
          {!r.forwardedAt && isPublic && <p className="mt-2 text-[11px] text-slate-500">لم يُسجَّل أي إحالة إلى جهة رسمية لهذا البلاغ. إيثار ليست جهة رسمية.</p>}
          <ul className="mt-4 space-y-3">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.to_status ? CIVIC_STATUS[e.to_status as CivicStatus]?.color : "#94a3b8" }} aria-hidden />
                <div className="min-w-0 text-sm">
                  <div className="font-bold text-slate-800">
                    {e.kind === "submitted" ? "أُرسل البلاغ" : e.kind === "status" ? `الحالة: ${CIVIC_STATUS[e.to_status as CivicStatus]?.ar}` : e.kind === "resolution" ? "دليل الإصلاح" : e.kind === "info_reply" ? "ردّ صاحب البلاغ" : "معلومة من مواطن"}
                    <span className="ms-2 text-[11px] font-semibold text-slate-400">{ROLE[e.actor_role] ?? ""} · {fmt(e.created_at)}</span>
                  </div>
                  {e.body && <p className="mt-0.5 text-slate-600">{e.body}</p>}
                  { }
                  {e.photoUrl && <img src={e.photoUrl} alt="دليل الإصلاح" className="mt-2 max-h-48 rounded-xl" />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="h-52 overflow-hidden rounded-3xl border border-slate-200"><MiniMap lat={r.lat} lng={r.lng} emoji={c.emoji} color={c.color} /></div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-slate-900">مستويات الثقة</h2>
          <ul className="mt-3 space-y-2 text-xs">
            <li className="flex items-center gap-2 text-slate-600"><Sparkles className="h-4 w-4 text-amber-500" aria-hidden /> اقتراح آلي للفئة (ليس دليلاً)</li>
            <li className="flex items-center gap-2 text-slate-600"><Users className="h-4 w-4 text-sky-600" aria-hidden /> {counts.support} دعم · {counts.still} تأكيد أن المشكل ما زال قائماً</li>
            <li className={cn("flex items-center gap-2", r.verifiedAt ? "font-bold text-emerald-700" : "text-slate-400")}><ShieldCheck className="h-4 w-4" aria-hidden /> {r.verifiedAt ? `تحقق منه مشرف · ${fmt(r.verifiedAt)}` : "لم يتحقق منه مشرف بعد"}</li>
            <li className={cn("flex items-center gap-2", r.forwardedAt ? "font-bold text-sky-700" : "text-slate-400")}><Send className="h-4 w-4" aria-hidden /> {r.forwardedAt ? `أُحيل إلى: ${r.forwardedTo}` : "لا إحالة رسمية مسجّلة"}</li>
            <li className={cn("flex items-center gap-2", r.resolvedAt ? "font-bold text-green-700" : "text-slate-400")}><CheckCircle2 className="h-4 w-4" aria-hidden /> {r.resolvedAt ? `سُجّل الحلّ · ${fmt(r.resolvedAt)}` : "لم يُسجَّل حلّ بعد"}</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-2">
          {!signedIn ? (
            <Link href={`/login?next=/civic/r/${r.ref}`} className="block rounded-2xl bg-slate-900 py-3 text-center text-sm font-black text-white">سجّل الدخول للدعم أو الإضافة</Link>
          ) : mine ? (
            <p className="text-xs text-slate-600">هذا بلاغك. ستصلك إشعارات بكل تحديث.</p>
          ) : open ? (
            <>
              <button disabled={pending || votes.includes("support")} onClick={() => vote("support")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white disabled:bg-emerald-100 disabled:text-emerald-800">
                <ThumbsUp className="h-4 w-4" aria-hidden /> {votes.includes("support") ? "دعمت هذا البلاغ" : `أدعم هذا البلاغ (${counts.support})`}
              </button>
              <button disabled={pending || votes.includes("still_exists")} onClick={() => vote("still_exists")} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-60">
                <Clock className="h-4 w-4" aria-hidden /> {votes.includes("still_exists") ? "أكّدت أن المشكل قائم" : "المشكل ما زال قائماً"}
              </button>
              <button onClick={() => setMode(mode === "comment" ? null : "comment")} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700"><MessageSquarePlus className="h-4 w-4" aria-hidden /> أضف معلومة مفيدة</button>
            </>
          ) : <p className="text-xs text-slate-500">لا يمكن الدعم في هذه المرحلة.</p>}
          {signedIn && !mine && <button onClick={() => setMode(mode === "flag" ? null : "flag")} className="flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-bold text-slate-400 hover:text-red-600"><Flag className="h-3.5 w-3.5" aria-hidden /> الإبلاغ عن محتوى غير لائق</button>}
          <button onClick={share} className="flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-bold text-slate-500"><Share2 className="h-3.5 w-3.5" aria-hidden /> مشاركة الرابط</button>
          {mode && (
            <div className="space-y-2 pt-1">
              {mode === "reply" && <p className="rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-900">طلب المشرف معلومات إضافية — أجب هنا ليعود بلاغك للمراجعة.</p>}
              <label htmlFor="civic-text" className="sr-only">النص</label>
              <textarea id="civic-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={mode === "flag" ? 300 : 500}
                placeholder={mode === "flag" ? "ما المشكل في هذا البلاغ؟" : mode === "reply" ? "المعلومات المطلوبة…" : "مثال: الحفرة اتسعت بعد مطر البارح"} className="w-full rounded-xl border border-slate-300 p-2 text-sm" />
              <button disabled={pending || text.trim().length < (mode === "flag" ? 3 : 5)} onClick={submitText} className="w-full rounded-xl bg-slate-900 py-2 text-xs font-black text-white disabled:bg-slate-300">إرسال</button>
            </div>
          )}
          {msg && <p role="status" className={cn("text-xs font-bold", msg.ok ? "text-emerald-700" : "text-red-700")}>{msg.t}</p>}
        </section>
      </aside>
    </div>
  );
}
