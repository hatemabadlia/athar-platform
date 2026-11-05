"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Camera, MapPin, TreePine, Upload, X, Clock, LocateFixed, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TREE_SPECIES, TREE_PLACES } from "@/lib/reference/meta";
import { WILAYAS } from "@/lib/wilayas";
import { supabaseBrowser } from "@/lib/supabase/client";
import { addTree } from "@/app/actions/trees";
import { cn } from "@/lib/utils";

import { readExif, resizeImage, type Exif } from "@/lib/image";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false, loading: () => <div className="h-full w-full skeleton" /> });

export function AddTreeModal({ open, onClose, defaultWilaya }: { open: boolean; onClose: () => void; defaultWilaya: number }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [exif, setExif] = useState<Exif>({ lat: null, lng: null, takenAt: null });
  const [species, setSpecies] = useState(TREE_SPECIES[0].name);
  const [wilayaCode, setWilayaCodeRaw] = useState(defaultWilaya);
  const initW = WILAYAS.find((w) => w.code === defaultWilaya) ?? WILAYAS[15];
  const [pos, setPos] = useState<{ lat: number; lng: number; zoom?: number }>({ lat: initW.lat, lng: initW.lng, zoom: 9 });
  const [located, setLocated] = useState(false);
  const [moved, setMoved] = useState(false);
  const setWilayaCode = (c: number) => { setWilayaCodeRaw(c); const w = WILAYAS.find((x) => x.code === c)!; setPos({ lat: w.lat, lng: w.lng, zoom: 9 }); setLocated(false); setMoved(false); };
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (g) => { setPos({ lat: g.coords.latitude, lng: g.coords.longitude, zoom: 15 }); setLocated(true); },
      () => { /* denied → keep wilaya centre */ },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };
  const [place, setPlace] = useState(TREE_PLACES[0]);
  const [placeDetail, setPlaceDetail] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) || f.size > 15 * 1024 * 1024) { setError("صورة غير مدعومة (JPEG/PNG/WebP، أقل من 15 ميغا)."); return; }
    setBusy(true); setError(null);
    try {
      const [e, blob] = await Promise.all([readExif(f), resizeImage(f)]);
      setExif(e);
      setPhoto({ blob, preview: URL.createObjectURL(blob) });
    } catch { setError("تعذّرت قراءة الصورة."); }
    setBusy(false);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) { setError("الصورة مطلوبة للتحقق."); return; }
    if (!located && !moved) { setError("حدّد موقع الشجرة على الخريطة أو استخدم موقعك."); return; }
    setBusy(true); setError(null);
    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("يجب تسجيل الدخول"); setBusy(false); return; }
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const up = await supabase.storage.from("tree-photos").upload(path, photo.blob, { contentType: "image/jpeg", upsert: false });
    if (up.error) { setError("فشل رفع الصورة."); setBusy(false); return; }
    const r = await addTree({ wilayaCode, place: placeDetail ? `${place} — ${placeDetail}` : place, species, note, photoPath: path,
      lat: pos.lat, lng: pos.lng, gpsSource: located ? "device" : "map", exif });
    setBusy(false);
    if (!r.ok) { setError(r.error); await supabase.storage.from("tree-photos").remove([path]); return; }
    setDone(true); router.refresh();
  };
  const close = () => { setDone(false); setPhoto(null); setNote(""); setPlaceDetail(""); setError(null); onClose(); };
  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

  return (
    <Modal open={open} onClose={close} title="🌳 أضف شجرة إلى غابة إيثار">
      {done ? (
        <div className="text-center py-4 animate-fade-up">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl" aria-hidden>⏳</div>
          <h4 className="text-lg font-black text-slate-900">أُرسلت شجرتك للمراجعة</h4>
          <p className="mt-1 text-sm text-slate-600 flex items-center justify-center gap-1"><Clock className="h-4 w-4" aria-hidden /> يراجعها مشرف ولايتك.</p>
          <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800">عند الاعتماد: <b>+50 نقطة</b> وتظهر في الغابة.</div>
          <Button className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700" onClick={close}>تم</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {/* photo */}
          <div onClick={() => fileRef.current?.click()} className={cn("relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors", photo ? "border-emerald-400" : "border-slate-300 bg-slate-50 hover:border-emerald-400")}>
            {photo ? (
              <>
                <img src={photo.preview} alt="معاينة صورة الشجرة" className="h-full w-full object-cover" />
                <button type="button" onClick={(e) => { e.stopPropagation(); setPhoto(null); }} className="absolute top-2 left-2 rounded-full bg-black/60 p-1 text-white"><X className="h-4 w-4" /></button>
                <span className="absolute bottom-2 right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">✓ صورة الشجرة</span>
              </>
            ) : (
              <div className="text-center text-slate-500">
                <Camera className="mx-auto h-8 w-8 mb-1" />
                <div className="text-sm font-bold">{busy ? "جارٍ المعالجة…" : "التقط صورة الشجرة أو ارفعها"}</div>
                <div className="text-[11px]">الصورة مطلوبة للتحقق — يفضّل أن تظهر أنت بجانبها</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" aria-label="صورة الشجرة" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {!photo && <button type="button" onClick={() => fileRef.current?.click()} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><Upload className="h-4 w-4" /> اختيار صورة</button>}

          <div>
            <label className="mb-1 block text-sm font-semibold flex items-center gap-1"><TreePine className="h-4 w-4 text-emerald-600" /> نوع الشجرة</label>
            <div className="flex flex-wrap gap-1.5">
              {TREE_SPECIES.map((s) => <button type="button" key={s.name} onClick={() => setSpecies(s.name)} className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", species === s.name ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-700")}>{s.emoji} {s.name}</button>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-semibold flex items-center gap-1"><MapPin className="h-4 w-4 text-emerald-600" /> الولاية</label>
              <select value={wilayaCode} onChange={(e) => setWilayaCode(+e.target.value)} className={input}>{WILAYAS.map((w) => <option key={w.code} value={w.code}>{w.code} - {w.nameAr}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-semibold">المكان</label>
              <select value={place} onChange={(e) => setPlace(e.target.value)} className={input}>{TREE_PLACES.map((p) => <option key={p}>{p}</option>)}</select></div>
          </div>
          <input value={placeDetail} onChange={(e) => setPlaceDetail(e.target.value)} className={input} placeholder="تفصيل المكان (مثال: دار الشباب حسين داي)" />

          {/* location picker */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center gap-1"><MapPin className="h-4 w-4 text-emerald-600" /> موقع الشجرة على الخريطة</label>
              <button type="button" onClick={useMyLocation} className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold", located ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}><LocateFixed className="h-3.5 w-3.5" /> {located ? "تم تحديد موقعي ✓" : "استخدم موقعي الحالي"}</button>
            </div>
            <div className="relative h-44 overflow-hidden rounded-2xl border border-slate-200">
              <LocationPicker lat={pos.lat} lng={pos.lng} zoom={pos.zoom} onPick={(lat, lng) => { setPos({ lat, lng }); setLocated(false); setMoved(true); }} />
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow">اضغط على الخريطة أو اسحب الدبوس · <span dir="ltr">{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</span></div>
            </div>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} aria-label="ملاحظة" className={cn(input, "resize-none")} placeholder="كلمة عن شجرتك… مع من غرستها؟" />
          {exif.lat != null && <p className="text-[11px] text-slate-500">📍 الصورة تحمل موقعاً GPS — سيُقارن بالموقع المختار (ثم يُحذف من الصورة).</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
          <Button type="submit" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy || !photo}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} إرسال للمراجعة</Button>
        </form>
      )}
    </Modal>
  );
}
