"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import type { ShelterView } from "@/lib/types";
import { WILAYAS, findWilaya } from "@/lib/wilayas";
import { Button } from "@/components/ui/button";
import { saveShelter } from "@/app/actions/admin";
import { timeAgo } from "@/lib/utils";

type Draft = { id?: string; name: string; wilayaCode: number; lat: string; lng: string; capacity: string; occupied: string; needs: string; phone: string; isOpen: boolean };

export function SheltersPanel({ shelters, adminWilayas }: { shelters: ShelterView[]; adminWilayas: number[] | null }) {
  const router = useRouter();
  const allowed = adminWilayas === null ? WILAYAS : WILAYAS.filter((w) => adminWilayas.includes(w.code));
  const empty = (): Draft => ({ name: "", wilayaCode: allowed[0]?.code ?? 16, lat: "", lng: "", capacity: "0", occupied: "0", needs: "", phone: "", isOpen: false });
  const [d, setD] = useState<Draft | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const edit = (s: ShelterView) => setD({ id: s.id, name: s.name, wilayaCode: s.wilayaCode, lat: s.lat?.toString() ?? "", lng: s.lng?.toString() ?? "", capacity: String(s.capacity), occupied: String(s.occupied), needs: s.needs.join("، "), phone: s.phone ?? "", isOpen: s.isOpen });
  const save = () => d && start(async () => {
    const r = await saveShelter({ id: d.id, name: d.name, wilayaCode: d.wilayaCode, lat: d.lat ? +d.lat : null, lng: d.lng ? +d.lng : null,
      capacity: +d.capacity, occupied: +d.occupied, needs: d.needs.split(/[،,]/).map((x) => x.trim()).filter(Boolean), phone: d.phone || null, isOpen: d.isOpen });
    setMsg(r.ok ? "حُفظ" : r.error); if (r.ok) { setD(null); router.refresh(); }
  });
  const input = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="font-black text-slate-900">مراكز الإيواء والتجمع</h2><p className="text-xs text-slate-500">مؤسسات حقيقية فقط. الطاقة والإشغال يحدّثهما المسؤول؛ تظهر على الخريطة عند «مفتوح» وأثناء حالة طوارئ.</p></div>
        {allowed.length > 0 && <Button size="sm" onClick={() => setD(empty())}><Plus className="h-4 w-4" aria-hidden /> مركز</Button>}
      </div>
      {d && (
        <div className="rounded-2xl bg-slate-50 p-4 grid sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2"><label className="text-[11px] font-bold" htmlFor="sn">الاسم</label><input id="sn" className={input} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
          <div><label className="text-[11px] font-bold" htmlFor="sw">الولاية</label><select id="sw" className={input} value={d.wilayaCode} onChange={(e) => setD({ ...d, wilayaCode: +e.target.value })}>{allowed.map((w) => <option key={w.code} value={w.code}>{w.nameAr}</option>)}</select></div>
          <div><label className="text-[11px] font-bold" htmlFor="sla">خط العرض</label><input id="sla" dir="ltr" className={input} value={d.lat} onChange={(e) => setD({ ...d, lat: e.target.value })} /></div>
          <div><label className="text-[11px] font-bold" htmlFor="slo">خط الطول</label><input id="slo" dir="ltr" className={input} value={d.lng} onChange={(e) => setD({ ...d, lng: e.target.value })} /></div>
          <div><label className="text-[11px] font-bold" htmlFor="sp">هاتف المؤسسة</label><input id="sp" dir="ltr" className={input} value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} /></div>
          <div><label className="text-[11px] font-bold" htmlFor="sc">الطاقة</label><input id="sc" type="number" min={0} className={input} value={d.capacity} onChange={(e) => setD({ ...d, capacity: e.target.value })} /></div>
          <div><label className="text-[11px] font-bold" htmlFor="so">الإشغال</label><input id="so" type="number" min={0} className={input} value={d.occupied} onChange={(e) => setD({ ...d, occupied: e.target.value })} /></div>
          <div><label className="text-[11px] font-bold" htmlFor="sne">الاحتياجات (، )</label><input id="sne" className={input} value={d.needs} onChange={(e) => setD({ ...d, needs: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.isOpen} onChange={(e) => setD({ ...d, isOpen: e.target.checked })} /> مفتوح الآن</label>
          <div className="sm:col-span-3 flex gap-2"><Button size="sm" onClick={save} disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button><Button size="sm" variant="outline" onClick={() => setD(null)}>إلغاء</Button></div>
        </div>
      )}
      {msg && <p role="status" className="text-xs font-bold">{msg}</p>}
      {shelters.length === 0 ? <p className="text-sm text-slate-500">لا توجد مراكز مسجلة. أضفها يدوياً أو استوردها (CSV) من قائمة رسمية.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-right text-xs text-slate-500"><th className="p-2">الاسم</th><th className="p-2">الولاية</th><th className="p-2">الإشغال</th><th className="p-2">الحالة</th><th className="p-2">آخر تحديث</th><th /></tr></thead>
          <tbody>{shelters.map((s) => (
            <tr key={s.id} className="border-t border-slate-100"><td className="p-2 font-semibold">{s.name}</td><td className="p-2">{findWilaya(s.wilayaCode)?.nameAr}</td><td className="p-2 tabular-nums">{s.occupied}/{s.capacity}</td>
              <td className="p-2">{s.isOpen ? <span className="rounded bg-emerald-100 px-1.5 text-emerald-800">مفتوح</span> : <span className="rounded bg-slate-100 px-1.5">مغلق</span>}</td><td className="p-2 text-xs text-slate-500">{timeAgo(s.updatedAt)}</td>
              <td className="p-2"><button className="text-xs font-bold text-brand-700" onClick={() => edit(s)}>تعديل</button></td></tr>
          ))}</tbody></table></div>
      )}
    </section>
  );
}
