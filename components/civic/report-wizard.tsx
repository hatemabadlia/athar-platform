"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Camera, ImagePlus, X, Sparkles, Loader2, MapPin, LocateFixed, Search, AlertTriangle, CheckCircle2, ShieldAlert, ThumbsUp, Send, EyeOff, Phone } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { readExif, resizeImage, dHash, blobToDataUrl, type Exif } from "@/lib/image";
import { CIVIC_CATEGORIES, CIVIC_CATEGORY_KEYS, CIVIC_SEVERITY, CIVIC_STATUS, type CivicCategory, type CivicSeverity, type CivicStatus } from "@/lib/civic";
import { createCivicReport, supportCivic } from "@/app/actions/civic";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(() => import("@/components/trees/location-picker"), { ssr: false, loading: () => <div className="h-full w-full skeleton" /> });

type Photo = { id: string; blob: Blob; preview: string; hash: string; exif: Exif };
type Suggestion = { is_public_issue: boolean; category: CivicCategory | null; description_ar: string; severity: CivicSeverity; safety_risks: string[];
  contains_people_or_plates: boolean; private_property_visible: boolean; confidence: number; moderator_notes: string[] };
type Nearby = { id: string; ref: string; category: string; status: CivicStatus; description: string | null; distance_m: number; same_category: boolean;
  image_match: boolean; supporters: number; is_public: boolean; mine: boolean };
type Loc = { lat: number; lng: number; source: "gps" | "map" | "search"; accuracy: number | null };

const Step = ({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
    <h2 className="mb-3 flex items-center gap-2 font-black text-slate-900">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm", done ? "bg-emerald-600 text-white" : "bg-slate-900 text-white")}>{done ? "✓" : n}</span>{title}
    </h2>
    {children}
  </section>
);

export function ReportWizard({ defaultCenter }: { defaultCenter: { lat: number; lng: number } }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [ai, setAi] = useState<{ state: "idle" | "loading" | "done" | "manual"; mode: "gemini" | "claude" | "manual"; suggestion: Suggestion | null }>({ state: "idle", mode: "manual", suggestion: null });
  const [category, setCategory] = useState<CivicCategory | null>(null);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<CivicSeverity>("medium");
  const [notes, setNotes] = useState("");
  const [loc, setLoc] = useState<Loc | null>(null);
  const [address, setAddress] = useState("");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [nearby, setNearby] = useState<Nearby[] | null>(null);
  const [phase, setPhase] = useState<"form" | "checking" | "duplicates" | "sending" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string } | null>(null);
  const [supported, setSupported] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null); setBusyPhoto(true);
    const added: Photo[] = [];
    for (const f of Array.from(files).slice(0, 4 - photos.length)) {
      if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) && !/\.(jpe?g|png|webp|heic)$/i.test(f.name)) { setError("صيغة غير مدعومة. استعمل صورة JPG أو PNG."); continue; }
      if (f.size > 25 * 1024 * 1024) { setError("الصورة كبيرة جداً (الحد 25 ميغابايت قبل الضغط)."); continue; }
      try {
        const exif = await readExif(f);
        const blob = await resizeImage(f, 1280, 0.82); // re-encoding strips EXIF (GPS, device) from the uploaded copy
        added.push({ id: crypto.randomUUID(), blob, preview: URL.createObjectURL(blob), hash: await dHash(blob), exif });
      } catch { setError("تعذّر قراءة هذه الصورة."); }
    }
    setPhotos((prev) => [...prev, ...added].slice(0, 4)); setBusyPhoto(false);
  };

  // Analyse the first photo as soon as it exists (independent of when/how it was added; re-runs if it is replaced).
  const firstId = photos[0]?.id;
  useEffect(() => {
    if (!firstId) { setAi({ state: "idle", mode: "manual", suggestion: null }); return; }
    analyze(photos[0].blob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstId]);

  const analyze = async (blob: Blob) => {
    setAi({ state: "loading", mode: "manual", suggestion: null });
    try {
      const small = await resizeImage(blob, 1024, 0.78);
      const res = await fetch("/api/civic/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: await blobToDataUrl(small) }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.suggestion) { setAi({ state: "manual", mode: "manual", suggestion: null }); return; }
      const s = json.suggestion as Suggestion;
      setAi({ state: "done", mode: json.mode, suggestion: s });
      if (s.category && !category) setCategory(s.category);
      if (!description && s.description_ar) setDescription(s.description_ar.slice(0, 500));
      setSeverity(s.severity);
    } catch { setAi({ state: "manual", mode: "manual", suggestion: null }); }
  };

  const reverse = async (lat: number, lng: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar&zoom=17`);
      const j = await r.json();
      setAddress(String(j.display_name ?? "").split(",").slice(0, 3).join("،").slice(0, 200));
    } catch { /* address is optional */ }
  };
  const setLocation = (l: Loc) => { setLoc(l); setNearby(null); reverse(l.lat, l.lng); };

  const useGps = () => {
    setGeoMsg(null);
    if (!navigator.geolocation) { setGeoMsg("جهازك لا يدعم تحديد الموقع — اختر المكان على الخريطة."); return; }
    setGeoMsg("جارٍ تحديد موقعك…");
    // one-time reading, only on this explicit tap — no continuous tracking
    navigator.geolocation.getCurrentPosition(
      (p) => { setGeoMsg(`تم (دقة ± ${Math.round(p.coords.accuracy)} م). اسحب الدبوس لتصحيح المكان إن لزم.`); setLocation({ lat: p.coords.latitude, lng: p.coords.longitude, source: "gps", accuracy: p.coords.accuracy }); },
      () => setGeoMsg("لم نتمكن من الوصول إلى موقعك. اختر المكان على الخريطة أو ابحث عنه."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
  const search = async () => {
    if (query.trim().length < 3) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=dz&limit=5&accept-language=ar&q=${encodeURIComponent(query)}`);
      const j = (await r.json()) as { display_name: string; lat: string; lon: string }[];
      setResults(j.map((x) => ({ name: x.display_name.split(",").slice(0, 3).join("،"), lat: +x.lat, lng: +x.lon })));
      if (!j.length) setGeoMsg("لا نتائج. جرّب اسم الحي أو البلدية.");
    } catch { setGeoMsg("البحث غير متاح حالياً — اختر المكان على الخريطة."); }
  };

  const ready = photos.length > 0 && !!category && description.trim().length >= 3 && !!loc;

  const checkDuplicates = async () => {
    if (!ready || !loc || !category) return;
    setError(null); setPhase("checking");
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.rpc("civic_nearby", { p_lat: loc.lat, p_lng: loc.lng, p_category: category, p_hashes: photos.map((p) => p.hash) as unknown as number[], p_radius_m: 150 });
    const list = ((data ?? []) as Nearby[]).filter((n) => n.same_category || n.image_match);
    if (error || !list.length) return send();
    setNearby(list); setPhase("duplicates");
  };

  const send = async () => {
    if (!loc || !category) return;
    setPhase("sending"); setError(null);
    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("انتهت الجلسة — سجّل الدخول من جديد."); setPhase("form"); return; }
    const uploaded: { path: string; hash: string }[] = [];
    for (const p of photos) {
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("civic-photos").upload(path, p.blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) { setError("تعذّر رفع الصورة. تحقق من الاتصال وحاول مجدداً."); setPhase("form"); return; }
      uploaded.push({ path, hash: p.hash });
    }
    const first = photos[0].exif;
    const r = await createCivicReport({ category, description, notes: notes || undefined, severity, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy,
      source: loc.source, address: address || undefined, photos: uploaded, exif: first,
      ai: { mode: ai.mode, suggestion: ai.suggestion as unknown as Record<string, unknown> | null, accepted: !!ai.suggestion && ai.suggestion.category === category } });
    if (!r.ok) { setError(r.error); setPhase("form"); return; }
    setDone(r.data!); setPhase("done");
  };

  const support = async (n: Nearby) => {
    const r = await supportCivic(n.id, "support");
    if (r.ok) setSupported(n.ref); else setError(r.error);
  };

  // ------------------------------------------------------------------ done
  if (phase === "done" && done) {
    const c = CIVIC_CATEGORIES[category!];
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm animate-fade-up">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden />
        <h2 className="mt-3 text-2xl font-black text-slate-900">وصل بلاغك، شكراً!</h2>
        <p className="mt-1 text-sm text-slate-600">سيراجعه مشرف ولايتك قبل نشره على الخريطة. ستصلك إشعارات عند كل تحديث.</p>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-start text-sm space-y-2">
          <Row k="رقم البلاغ" v={<span dir="ltr" className="font-mono font-black text-slate-900">{done.ref}</span>} />
          <Row k="الفئة" v={`${c.emoji} ${c.ar}`} />
          <Row k="الموقع" v={address || `${loc!.lat.toFixed(5)}, ${loc!.lng.toFixed(5)}`} />
          <Row k="الحالة" v={<span className="font-bold" style={{ color: CIVIC_STATUS.pending_review.color }}>{CIVIC_STATUS.pending_review.ar}</span>} />
        </div>
        <p className="mt-3 text-[11px] text-slate-500">إيثار ليست جهة رسمية: يُنشر البلاغ على المنصة، ولا يعني ذلك أنه وصل إلى البلدية إلا إذا سجّل مشرف إحالته فعلياً.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link href={`/civic/r/${done.ref}`} className="rounded-2xl bg-slate-900 py-3 text-sm font-black text-white">عرض البلاغ</Link>
          <Link href="/civic/mine" className="rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700">بلاغاتي</Link>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ duplicates
  if (phase === "duplicates" && nearby) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-amber-900"><AlertTriangle className="h-5 w-5" aria-hidden /> وجدنا بلاغاً مشابهاً قرب هذا الموقع</h2>
          <p className="mt-1 text-sm text-amber-900/80">إن كان نفس المشكل، ادعم البلاغ الموجود بدل تكراره — كلما زاد الداعمون زادت أولويته. إن كان مشكلاً مختلفاً، أرسل بلاغك.</p>
        </div>
        {nearby.map((n) => {
          const c = CIVIC_CATEGORIES[n.category as CivicCategory] ?? CIVIC_CATEGORIES.other;
          return (
            <div key={n.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold">{c.emoji} {c.ar}</span>
                <span className="font-bold" style={{ color: CIVIC_STATUS[n.status].color }}>{CIVIC_STATUS[n.status].ar}</span>
                <span className="text-slate-500">على بعد {n.distance_m} م</span>
                {n.image_match && <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 font-bold text-fuchsia-800">نفس الصورة تقريباً</span>}
                <span dir="ltr" className="font-mono text-slate-400">{n.ref}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{n.description ?? "بلاغ قيد المراجعة لدى المشرف — التفاصيل تظهر بعد التحقق."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {n.mine ? <span className="text-xs font-bold text-slate-500">هذا بلاغك السابق.</span>
                  : supported === n.ref ? <span className="flex items-center gap-1 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> سُجّل دعمك</span>
                  : <button onClick={() => support(n)} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"><ThumbsUp className="h-4 w-4" aria-hidden /> نفس المشكل — أدعم هذا البلاغ ({n.supporters})</button>}
                {n.is_public && <Link href={`/civic/r/${n.ref}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">عرضه</Link>}
              </div>
            </div>
          );
        })}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={send} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-black text-white"><Send className="h-4 w-4" aria-hidden /> مشكل مختلف — أرسل بلاغي</button>
          {supported ? <Link href={`/civic/r/${supported}`} className="flex items-center justify-center rounded-2xl border border-emerald-300 py-3 text-sm font-bold text-emerald-800">تم — متابعة البلاغ الذي دعمته</Link>
            : <button onClick={() => setPhase("form")} className="rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700">رجوع للتعديل</button>}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ form
  const s = ai.suggestion;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
        <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span><b>ليست خدمة طوارئ.</b> في حالة خطر فوري (حريق، حادث، أسلاك كهرباء مكشوفة على الطريق…) اتصل بالحماية المدنية <b dir="ltr">14</b> أو الشرطة <b dir="ltr">17</b> أو الدرك <b dir="ltr">1055</b>.</span>
      </div>

      <Step n={1} title="صوّر المشكل" done={photos.length > 0}>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
              { }
              <img src={p.preview} alt="صورة البلاغ" className="h-full w-full object-cover" />
              <button onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))} aria-label="حذف الصورة" className="absolute top-1.5 end-1.5 rounded-full bg-black/60 p-1 text-white"><X className="h-4 w-4" /></button>
            </div>
          ))}
          {photos.length < 4 && (
            <>
              <button onClick={() => cameraRef.current?.click()} disabled={busyPhoto} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50 text-sm font-black text-emerald-800">
                {busyPhoto ? <Loader2 className="h-7 w-7 animate-spin" /> : <Camera className="h-7 w-7" aria-hidden />} صوّر الآن
              </button>
              <button onClick={() => galleryRef.current?.click()} disabled={busyPhoto} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600">
                <ImagePlus className="h-7 w-7" aria-hidden /> من المعرض
              </button>
            </>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">حتى 4 صور. نحذف بيانات الصورة (GPS، نوع الهاتف) قبل الرفع. الصورة لا تُنشر إلا بعد مراجعة مشرف.</p>
      </Step>

      <Step n={2} title="ما هو المشكل؟" done={!!category && description.trim().length >= 3}>
        {ai.state === "loading" && <div className="mb-3 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800"><Loader2 className="h-4 w-4 animate-spin" /> الذكاء الاصطناعي يحلّل الصورة…</div>}
        {ai.state === "done" && s && (
          <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-black text-emerald-800"><Sparkles className="h-4 w-4" aria-hidden /> اقتراح آلي ({ai.mode === "claude" ? "Claude" : "Gemini"}) — راجعه وعدّله بحرية</div>
            {!s.is_public_issue && <p className="font-bold text-amber-800">⚠️ لا تبدو الصورة بوضوح لمشكل في فضاء عمومي. تأكد من الصورة أو اختر الفئة يدوياً.</p>}
            {s.safety_risks.length > 0 && <p><b>مخاطر ظاهرة:</b> {s.safety_risks.join("، ")}</p>}
            {(s.contains_people_or_plates || s.private_property_visible) && <p className="flex items-center gap-1 font-bold text-slate-800"><EyeOff className="h-3.5 w-3.5" aria-hidden /> تظهر وجوه أو لوحات أو ملكية خاصة: لن تُنشر الصورة قبل أن يقرّر المشرف إخفاءها أو نشرها.</p>}
            <p className="text-[10px] text-slate-500">اقتراح الذكاء الاصطناعي ليس دليلاً على صحة البلاغ ولا يرفض أي بلاغ.</p>
          </div>
        )}
        {ai.state === "manual" && photos.length > 0 && <p className="mb-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">التحليل الآلي غير متاح الآن — اختر الفئة واكتب وصفاً قصيراً.</p>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="الفئة">
          {CIVIC_CATEGORY_KEYS.map((k) => (
            <button key={k} role="radio" aria-checked={category === k} onClick={() => setCategory(k)}
              className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-start text-xs font-bold", category === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700")}>
              <span className="text-lg" aria-hidden>{CIVIC_CATEGORIES[k].emoji}</span>{CIVIC_CATEGORIES[k].ar}
              {s?.category === k && <Sparkles className="ms-auto h-3.5 w-3.5 text-amber-400" aria-label="مقترح" />}
            </button>
          ))}
        </div>
        <label htmlFor="desc" className="mt-4 mb-1 block text-sm font-bold text-slate-700">وصف قصير</label>
        <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="مثال: حفرة كبيرة وسط الطريق أمام المدرسة" className="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        <div className="mt-3">
          <div className="mb-1 text-sm font-bold text-slate-700">الخطورة</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CIVIC_SEVERITY) as CivicSeverity[]).map((k) => (
              <button key={k} aria-pressed={severity === k} onClick={() => setSeverity(k)} className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-2", CIVIC_SEVERITY[k].cls, severity === k ? "ring-slate-900" : "ring-transparent")}>{CIVIC_SEVERITY[k].ar}</button>
            ))}
          </div>
        </div>
      </Step>

      <Step n={3} title="أين؟" done={!!loc}>
        <div className="flex flex-wrap gap-2">
          <button onClick={useGps} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"><LocateFixed className="h-4 w-4" aria-hidden /> استعمل موقعي الحالي</button>
          <form className="flex min-w-[220px] flex-1 gap-1" onSubmit={(e) => { e.preventDefault(); search(); }}>
            <label htmlFor="q" className="sr-only">ابحث عن مكان</label>
            <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث: حي، شارع، بلدية…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs" />
            <button className="rounded-xl border border-slate-300 px-3" aria-label="بحث"><Search className="h-4 w-4" /></button>
          </form>
        </div>
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 text-xs">
            {results.map((r) => <li key={`${r.lat},${r.lng}`}><button className="w-full px-3 py-2 text-start hover:bg-slate-50" onClick={() => { setResults([]); setLocation({ lat: r.lat, lng: r.lng, source: "search", accuracy: null }); }}>{r.name}</button></li>)}
          </ul>
        )}
        {geoMsg && <p className="mt-2 text-xs text-slate-600">{geoMsg}</p>}
        <div className="mt-3 h-72 overflow-hidden rounded-2xl border border-slate-200">
          <LocationPicker lat={loc?.lat ?? defaultCenter.lat} lng={loc?.lng ?? defaultCenter.lng} zoom={loc ? 17 : 6} emoji={category ? CIVIC_CATEGORIES[category].emoji : "📍"} color="#0f172a"
            onPick={(lat, lng) => setLocation({ lat, lng, source: loc?.source === "gps" ? "gps" : "map", accuracy: null })} />
        </div>
        <p className="mt-2 flex items-start gap-1 text-[11px] text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{loc ? (address || `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`) : "اضغط على الخريطة أو اسحب الدبوس إلى مكان المشكل بالضبط."}</p>
      </Step>

      <Step n={4} title="معلومات إضافية (اختياري)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} aria-label="ملاحظات" placeholder="مثال: المشكل موجود منذ أسبوعين، يزداد عند المطر…" className="w-full rounded-2xl border border-slate-300 p-3 text-sm" />
        <p className="mt-2 flex items-start gap-1 text-[11px] text-slate-500"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> هويتك لا تظهر للعموم. لا تكتب أرقام هواتف أو أسماء أشخاص.</p>
      </Step>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <button onClick={checkDuplicates} disabled={!ready || phase !== "form"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-lg font-black text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
        {phase === "checking" || phase === "sending" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" aria-hidden />}
        {phase === "checking" ? "نتحقق من البلاغات القريبة…" : phase === "sending" ? "جارٍ الإرسال…" : "بلّغ"}
      </button>
      {!ready && <p className="text-center text-[11px] text-slate-500">ينقص: {[!photos.length && "صورة", !category && "الفئة", description.trim().length < 3 && "وصف", !loc && "الموقع"].filter(Boolean).join("، ")}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><span className="text-slate-500">{k}</span><span className="text-end font-semibold text-slate-900">{v}</span></div>;
}
