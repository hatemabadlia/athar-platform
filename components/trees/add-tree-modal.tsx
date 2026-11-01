"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Camera, MapPin, TreePine, Upload, X, Clock, LocateFixed } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAthar } from "@/lib/store";
import { TREE_SPECIES, TREE_PLACES } from "@/lib/mock-data";
import { WILAYAS } from "@/lib/wilayas";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false, loading: () => <div className="h-full w-full skeleton" /> });

async function resizeImage(file: File, max = 720): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.75);
}

export function AddTreeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, addTree } = useAthar();
  const [photo, setPhoto] = useState<string | null>(null);
  const [species, setSpecies] = useState(TREE_SPECIES[0].name);
  const [wilayaCode, setWilayaCodeRaw] = useState(profile?.wilayaCode ?? 16);
  const initW = WILAYAS.find((w) => w.code === (profile?.wilayaCode ?? 16))!;
  const [pos, setPos] = useState<{ lat: number; lng: number; zoom?: number }>({ lat: initW.lat, lng: initW.lng, zoom: 9 });
  const [located, setLocated] = useState(false);
  const setWilayaCode = (c: number) => { setWilayaCodeRaw(c); const w = WILAYAS.find((x) => x.code === c)!; setPos({ lat: w.lat, lng: w.lng, zoom: 9 }); setLocated(false); };
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
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => { if (!f) return; setBusy(true); setPhoto(await resizeImage(f)); setBusy(false); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = WILAYAS.find((x) => x.code === wilayaCode)!;
    addTree({ wilayaCode, wilaya: w.nameAr, place: placeDetail ? `${place} — ${placeDetail}` : place, species, note, photo, lat: pos.lat, lng: pos.lng });
    setDone(true);
  };
  const close = () => { setDone(false); setPhoto(null); setNote(""); setPlaceDetail(""); onClose(); };
  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

  return (
    <Modal open={open} onClose={close} title="🌳 أضف شجرة إلى غابة إيثار">
      {!profile ? (
        <div className="text-center py-4 space-y-3"><p className="text-sm text-slate-600">لتوثيق شجرتك وربح النقاط، أنشئ ملف متطوع أولاً.</p><Link href="/profile" className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">إنشاء ملف</Link></div>
      ) : done ? (
        <div className="text-center py-4 animate-fade-up">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">⏳</div>
          <h4 className="text-lg font-black text-slate-900">تم إرسال شجرتك للمراجعة</h4>
          <p className="mt-1 text-sm text-slate-600 flex items-center justify-center gap-1"><Clock className="h-4 w-4" /> يتحقق مشرف مديرية الشباب من الصورة والموقع خلال 24 ساعة</p>
          <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800">عند الاعتماد: <b>+50 نقطة</b> · شارة 🌳 غارس · تظهر شجرتك في الغابة الوطنية ويُحتسب أثرها الكربوني (≈22 كغ CO₂/سنة).</div>
          <Button className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700" onClick={close}>رائع</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {/* photo */}
          <div onClick={() => fileRef.current?.click()} className={cn("relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors", photo ? "border-emerald-400" : "border-slate-300 bg-slate-50 hover:border-emerald-400")}>
            {photo ? (
              <>
                <img src={photo} alt="" className="h-full w-full object-cover" />
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
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
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
              <LocationPicker lat={pos.lat} lng={pos.lng} zoom={pos.zoom} onPick={(lat, lng) => { setPos({ lat, lng }); setLocated(false); }} />
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow">اضغط على الخريطة أو اسحب الدبوس · <span dir="ltr">{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</span></div>
            </div>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={cn(input, "resize-none")} placeholder="كلمة عن شجرتك… مع من غرستها؟" />
          <Button type="submit" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700">إرسال للمراجعة</Button>
          <p className="text-center text-[10px] text-slate-400">بدون صورة سيطلب المشرف صورة قبل الاعتماد.</p>
        </form>
      )}
    </Modal>
  );
}
