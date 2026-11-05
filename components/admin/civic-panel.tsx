"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, MapPin, Eye, EyeOff, Lock, Loader2, Camera, AlertTriangle, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { supabaseBrowser } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image";
import { CIVIC_CATEGORIES, CIVIC_CATEGORY_KEYS, CIVIC_SEVERITY, CIVIC_STATUS, CIVIC_TRANSITIONS, type CivicCategory, type CivicSeverity, type CivicStatus } from "@/lib/civic";
import { setCivicStatus, civicInternalNote, civicResolution, civicPhotoPublic } from "@/app/actions/civic";
import { findWilaya } from "@/lib/wilayas";
import { cn } from "@/lib/utils";

export type AdminCivic = {
  id: string; ref: string; category: CivicCategory; description: string; notes: string | null; severity: CivicSeverity; status: CivicStatus;
  lat: number; lng: number; address: string | null; wilayaCode: number | null; photoUrls: string[]; photoPublic: boolean; ai: Record<string, unknown>; aiMode: string;
  signals: Record<string, unknown>; forwardedTo: string | null; createdAt: string; resolvedAt: string | null; supporters: number; confirmations: number;
  flags: { reason: string; created_at: string }[];
  events: { id: number; kind: string; from_status: string | null; to_status: string | null; body: string | null; actor_role: string; is_internal: boolean; created_at: string; photoUrl: string | null }[];
};
export type CivicStats = { total: number; pending: number; verified: number; forwarded: number; in_progress: number; resolved: number; rejected: number;
  avg_resolution_hours: number | null; resolved_with_time: number; by_category: { key: string; n: number }[]; by_wilaya: { code: number; n: number }[] };

const fmt = (d: string) => new Date(d).toLocaleString("ar-DZ", { dateStyle: "short", timeStyle: "short" });

export function CivicPanel({ reports, stats, filters }: { reports: AdminCivic[]; stats: CivicStats; filters: { status: string; cat: string; w: string } }) {
  const [open, setOpen] = useState<AdminCivic | null>(null);
  const router = useRouter();
  const go = (k: string, v: string) => { const q = new URLSearchParams({ tab: "civic", cstatus: filters.status, ccat: filters.cat, cw: filters.w, [k]: v }); [...q.keys()].forEach((x) => !q.get(x) && q.delete(x)); router.push(`/admin?${q}`); };
  const maxCat = Math.max(1, ...stats.by_category.map((x) => x.n));
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {[["الكل", stats.total], ["بانتظار المراجعة", stats.pending], ["تحقق منه", stats.verified], ["أُحيل", stats.forwarded], ["قيد المعالجة", stats.in_progress], ["حُلّ", stats.resolved], ["مرفوض/مكرر", stats.rejected]].map(([l, v]) => (
          <div key={String(l)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2"><div className="text-xl font-black tabular-nums">{Number(v ?? 0)}</div><div className="text-[10px] text-slate-500">{l}</div></div>
        ))}
      </section>
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h3 className="text-sm font-black">الفئات الأكثر تبليغاً</h3>
          <ul className="mt-2 space-y-1.5">{stats.by_category.slice(0, 8).map((x) => {
            const c = CIVIC_CATEGORIES[x.key as CivicCategory] ?? CIVIC_CATEGORIES.other;
            return <li key={x.key} className="flex items-center gap-2 text-xs"><span className="w-40 truncate">{c.emoji} {c.ar}</span><span className="h-2 rounded-full" style={{ width: `${(x.n / maxCat) * 60}%`, background: c.color }} /><b className="tabular-nums">{x.n}</b></li>;
          })}</ul>
          {stats.by_category.length === 0 && <p className="text-xs text-slate-500">لا بيانات بعد.</p>}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-xs space-y-2">
          <h3 className="text-sm font-black">حسب الولاية</h3>
          {stats.by_wilaya.map((x) => <div key={x.code} className="flex justify-between"><span>{findWilaya(x.code)?.nameAr}</span><b>{x.n}</b></div>)}
          <div className="border-t border-slate-100 pt-2 text-slate-600">متوسط مدة الحلّ: {stats.avg_resolution_hours != null ? <b>{stats.avg_resolution_hours} ساعة</b> : "—"} <span className="text-[10px] text-slate-400">(من {stats.resolved_with_time} بلاغ بتاريخ حلّ فعلي)</span></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <select aria-label="الحالة" value={filters.status} onChange={(e) => go("cstatus", e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold">
          <option value="">كل الحالات</option>{(Object.keys(CIVIC_STATUS) as CivicStatus[]).map((k) => <option key={k} value={k}>{CIVIC_STATUS[k].ar}</option>)}
        </select>
        <select aria-label="الفئة" value={filters.cat} onChange={(e) => go("ccat", e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold">
          <option value="">كل الفئات</option>{CIVIC_CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CIVIC_CATEGORIES[k].ar}</option>)}
        </select>
        <input aria-label="الولاية" value={filters.w} onChange={(e) => go("cw", e.target.value.replace(/\D/g, ""))} placeholder="رمز الولاية" className="w-28 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs" />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {reports.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">لا بلاغات بهذه التصفية.</p> : (
          <ul className="divide-y divide-slate-100">{reports.map((r) => {
            const c = CIVIC_CATEGORIES[r.category] ?? CIVIC_CATEGORIES.other;
            const warn = !!r.signals.recycled_photo || r.signals.ai_people_or_plates === true || r.flags.length > 0;
            return (
              <li key={r.id}><button onClick={() => setOpen(r)} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-slate-50">
                <span className="text-2xl" aria-hidden>{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-900">{r.description}</div>
                  <div className="text-[11px] text-slate-500"><span dir="ltr" className="font-mono">{r.ref}</span> · {findWilaya(r.wilayaCode ?? 0)?.nameAr} · {fmt(r.createdAt)} · {r.supporters} دعم</div>
                </div>
                {warn && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="تنبيهات" />}
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", CIVIC_SEVERITY[r.severity].cls)}>{CIVIC_SEVERITY[r.severity].ar}</span>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black text-white" style={{ background: CIVIC_STATUS[r.status].color }}>{CIVIC_STATUS[r.status].ar}</span>
              </button></li>
            );
          })}</ul>
        )}
      </div>
      {open && <CivicDetail r={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CivicDetail({ r, onClose }: { r: AdminCivic; onClose: () => void }) {
  const router = useRouter();
  // Own busy flag (not useTransition): buttons must not stay disabled while the page refreshes in the background.
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [note, setNote] = useState("");
  const [forwardedTo, setForwardedTo] = useState("");
  const [dupRef, setDupRef] = useState("");
  const [internal, setInternal] = useState("");
  const [resText, setResText] = useState("");
  const [resFile, setResFile] = useState<File | null>(null);
  const c = CIVIC_CATEGORIES[r.category] ?? CIVIC_CATEGORIES.other;
  const ai = r.ai as { category?: string; description_ar?: string; severity?: string; safety_risks?: string[]; confidence?: number; moderator_notes?: string[]; is_public_issue?: boolean };
  const sig = r.signals as { exif_distance_m?: number; photo_age_days?: number; recycled_photo?: { ref: string; status: string; distance_m: number }[]; ai_people_or_plates?: boolean; ai_private_property?: boolean; location_source?: string; ai_category_changed_by_user?: boolean };
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => {
    setPending(true);
    try {
      const res = await fn(); setMsg(res.ok ? { ok: true, t: ok } : { ok: false, t: res.error ?? "خطأ" });
      if (res.ok) router.refresh();
    } finally { setPending(false); }
  };
  const transition = (s: CivicStatus) => run(() => setCivicStatus(r.id, s, note, forwardedTo, s === "duplicate" ? dupRef : undefined), `الحالة الآن: ${CIVIC_STATUS[s].ar}`);
  const addResolution = () => run(async () => {
    let path: string | undefined;
    if (resFile) {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      path = `${user!.id}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("civic-photos").upload(path, await resizeImage(resFile, 1280), { contentType: "image/jpeg" });
      if (up.error) return { ok: false, error: "تعذّر رفع الصورة" };
    }
    return civicResolution(r.id, resText, path);
  }, "أُضيف دليل الإصلاح");
  const input = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  return (
    <Modal open onClose={onClose} title={`بلاغ ${r.ref}`} className="sm:max-w-5xl">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            { }
            {r.photoUrls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="صورة البلاغ" className="h-36 w-full rounded-xl object-cover" /></a>)}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2 text-xs">
            <span className="flex items-center gap-1.5 font-bold">{r.photoPublic ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-slate-500" />} {r.photoPublic ? "الصورة منشورة للعموم (بعد التحقق)" : "الصورة مخفية عن العموم"}</span>
            <button disabled={pending} onClick={() => run(() => civicPhotoPublic(r.id, !r.photoPublic), r.photoPublic ? "أُخفيت الصورة" : "ستُنشر الصورة مع البلاغ")} className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold">{r.photoPublic ? "إخفاء" : "السماح بالنشر"}</button>
          </div>
          {(sig.ai_people_or_plates || sig.ai_private_property) && <p className="rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-900">⚠️ قد تظهر وجوه / لوحات سيارات / ملكية خاصة — لا تنشر الصورة إن كان ذلك صحيحاً (لا يوجد تمويه آلي).</p>}
          <div className="text-sm"><b>{c.emoji} {c.ar}</b> · <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", CIVIC_SEVERITY[r.severity].cls)}>{CIVIC_SEVERITY[r.severity].ar}</span></div>
          <p className="text-sm text-slate-800">{r.description}</p>
          {r.notes && <p className="rounded-xl bg-slate-50 p-2 text-xs text-slate-600">{r.notes}</p>}
          <p className="flex items-center gap-1 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5" aria-hidden /> {r.address ?? "—"} · <a className="underline" dir="ltr" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}`}>{r.lat.toFixed(5)}, {r.lng.toFixed(5)} <ExternalLink className="inline h-3 w-3" /></a></p>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1 font-black text-amber-900"><Sparkles className="h-4 w-4" aria-hidden /> اقتراح آلي ({r.aiMode === "manual" ? "لا يوجد — تصنيف يدوي" : r.aiMode}) — ليس دليلاً</div>
            {ai.category && <p>الفئة المقترحة: {CIVIC_CATEGORIES[ai.category as CivicCategory]?.ar ?? ai.category}{sig.ai_category_changed_by_user ? " (غيّرها المبلّغ)" : ""} · ثقة {Math.round((ai.confidence ?? 0) * 100)}%</p>}
            {ai.is_public_issue === false && <p className="font-bold text-amber-900">لا يبدو أن الصورة تُظهر مشكلاً عمومياً بوضوح.</p>}
            {ai.description_ar && <p>ما يظهر: {ai.description_ar}</p>}
            {(ai.safety_risks?.length ?? 0) > 0 && <p>مخاطر: {ai.safety_risks!.join("، ")}</p>}
            {(ai.moderator_notes?.length ?? 0) > 0 && <p>ملاحظات: {ai.moderator_notes!.join("، ")}</p>}
          </div>
          <div className="rounded-2xl border border-slate-200 p-3 text-xs space-y-1">
            <div className="font-black">إشارات للتحقق (خاصة بالمشرفين)</div>
            <p>مصدر الموقع: {sig.location_source === "gps" ? "GPS الجهاز" : sig.location_source === "search" ? "بحث" : "اختيار على الخريطة"}</p>
            <p>{sig.exif_distance_m != null ? `الصورة تحمل موقعاً على بعد ${sig.exif_distance_m} م من الموقع المحدد` : "الصورة بلا موقع EXIF"}{sig.photo_age_days != null ? ` · التُقطت قبل ${sig.photo_age_days} يوم` : ""}</p>
            {sig.recycled_photo && <p className="font-bold text-fuchsia-800">صورة مطابقة لبلاغ سابق: {sig.recycled_photo.map((x) => `${x.ref} (${x.distance_m} م)`).join("، ")} — قد تكون معاد استعمالها، تحقّق.</p>}
            {r.flags.length > 0 && <p className="font-bold text-red-700">تبليغات المواطنين: {r.flags.map((f) => f.reason).join(" | ")}</p>}
            <p>{r.supporters} دعم · {r.confirmations} تأكيد أن المشكل قائم</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
            <div className="text-xs font-black">تغيير الحالة (الحالية: <span style={{ color: CIVIC_STATUS[r.status].color }}>{CIVIC_STATUS[r.status].ar}</span>)</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="ملاحظة للمبلّغ (إلزامية عند الرفض أو طلب معلومات)" aria-label="ملاحظة" className={input} />
            {CIVIC_TRANSITIONS[r.status].includes("forwarded") && <input value={forwardedTo} onChange={(e) => setForwardedTo(e.target.value)} placeholder="الإحالة: الجهة + الوسيلة (مثلاً: بلدية باب الزوار — مراسلة 12/2026)" aria-label="الجهة" className={input} />}
            {CIVIC_TRANSITIONS[r.status].includes("duplicate") && <input value={dupRef} onChange={(e) => setDupRef(e.target.value)} dir="ltr" placeholder="SWB-2611-XXXXX (البلاغ الأصلي عند التكرار)" aria-label="البلاغ الأصلي" className={input} />}
            <div className="flex flex-wrap gap-1.5">
              {CIVIC_TRANSITIONS[r.status].map((s) => (
                <button key={s} disabled={pending} onClick={() => transition(s)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60" style={{ background: CIVIC_STATUS[s].color }}>{CIVIC_STATUS[s].ar}</button>
              ))}
              {CIVIC_TRANSITIONS[r.status].length === 0 && <span className="text-xs text-slate-500">حالة نهائية.</span>}
            </div>
            <p className="text-[10px] text-slate-500">«أُحيل» يعني أنك أحلته فعلاً عبر قناة حقيقية — لا تستعمله دون ذلك.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
            <div className="text-xs font-black">دليل الإصلاح</div>
            <textarea value={resText} onChange={(e) => setResText(e.target.value)} rows={2} placeholder="ما الذي أُصلح؟ متى؟ من طرف من؟" aria-label="دليل الإصلاح" className={input} />
            <label className="flex items-center gap-1.5 text-xs"><Camera className="h-4 w-4" aria-hidden /><input type="file" accept="image/*" onChange={(e) => setResFile(e.target.files?.[0] ?? null)} /></label>
            <button disabled={pending || resText.trim().length < 3} onClick={addResolution} className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">إضافة الدليل</button>
          </div>
          <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
            <div className="flex items-center gap-1 text-xs font-black"><Lock className="h-3.5 w-3.5" aria-hidden /> ملاحظة داخلية (لا تظهر للمبلّغ ولا للعموم)</div>
            <textarea value={internal} onChange={(e) => setInternal(e.target.value)} rows={2} aria-label="ملاحظة داخلية" className={input} />
            <button disabled={pending || internal.trim().length < 2} onClick={() => run(() => civicInternalNote(r.id, internal), "حُفظت الملاحظة")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold disabled:opacity-50">حفظ</button>
          </div>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {msg && <p role="status" className={cn("text-xs font-bold", msg.ok ? "text-emerald-700" : "text-red-700")}>{msg.t}</p>}
          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="text-xs font-black">السجل الكامل</div>
            <ul className="mt-2 space-y-1.5 text-xs">{r.events.map((e) => (
              <li key={e.id} className={cn("rounded-lg p-1.5", e.is_internal && "bg-slate-50")}>
                <b>{e.kind === "status" ? `${CIVIC_STATUS[e.from_status as CivicStatus]?.ar ?? "—"} ← ${CIVIC_STATUS[e.to_status as CivicStatus]?.ar}` : e.kind}</b>
                <span className="ms-1 text-slate-400">{e.actor_role} · {fmt(e.created_at)}{e.is_internal ? " · داخلي" : ""}</span>
                {e.body && <div className="text-slate-600">{e.body}</div>}
                { }
                {e.photoUrl && <img src={e.photoUrl} alt="" className="mt-1 h-20 rounded-lg" />}
              </li>
            ))}</ul>
          </div>
          <Link href={`/civic/r/${r.ref}`} className="block text-center text-xs font-bold text-slate-600 underline">الصفحة العامة للبلاغ</Link>
        </div>
      </div>
    </Modal>
  );
}
