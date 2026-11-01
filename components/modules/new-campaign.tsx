"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { WILAYAS } from "@/lib/wilayas";
import { Button } from "@/components/ui/button";
import { createCampaign } from "@/app/actions/modules";

const KINDS = [["ramadan", "قفة رمضان"], ["school", "الدخول المدرسي"], ["winter", "حملة الشتاء"], ["environment", "بيئة"], ["blood", "تبرع بالدم"], ["other", "أخرى"]] as const;

export function NewCampaign({ associations }: { associations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: "ramadan", title: "", description: "", wilaya: "", goal: "100", unit: "قفة", starts: "", ends: "", assoc: associations[0]?.id ?? "" });
  const [pending, start] = useTransition(); const [err, setErr] = useState<string | null>(null);
  const input = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" aria-hidden /> حملة جديدة</Button>;
  return (
    <form className="grid sm:grid-cols-3 gap-2 rounded-3xl border border-slate-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await createCampaign({ kind: f.kind as never, title: f.title, description: f.description, wilayaCode: f.wilaya ? +f.wilaya : null, goalUnits: +f.goal, unitLabel: f.unit,
        startsOn: f.starts, endsOn: f.ends, associationId: f.assoc || null });
      if (r.ok) router.push(`/campaigns/${r.data}`); else setErr(r.error); }); }}>
      <div><label htmlFor="ck" className="text-xs font-bold">النوع</label><select id="ck" className={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <div className="sm:col-span-2"><label htmlFor="ctt" className="text-xs font-bold">العنوان *</label><input id="ctt" required minLength={3} className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div><label htmlFor="cwi" className="text-xs font-bold">الولاية</label><select id="cwi" className={input} value={f.wilaya} onChange={(e) => setF({ ...f, wilaya: e.target.value })}><option value="">وطنية</option>{WILAYAS.map((x) => <option key={x.code} value={x.code}>{x.nameAr}</option>)}</select></div>
      <div><label htmlFor="cg" className="text-xs font-bold">الهدف *</label><input id="cg" type="number" min={1} className={input} value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></div>
      <div><label htmlFor="cu" className="text-xs font-bold">الوحدة</label><input id="cu" className={input} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
      <div><label htmlFor="cs" className="text-xs font-bold">البداية *</label><input id="cs" type="date" required className={input} value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} /></div>
      <div><label htmlFor="ce" className="text-xs font-bold">النهاية *</label><input id="ce" type="date" required className={input} value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} /></div>
      {associations.length > 0 && <div><label htmlFor="ca" className="text-xs font-bold">الجمعية المنظمة</label><select id="ca" className={input} value={f.assoc} onChange={(e) => setF({ ...f, assoc: e.target.value })}>{associations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
      <div className="sm:col-span-3"><label htmlFor="cd" className="text-xs font-bold">الوصف</label><textarea id="cd" rows={2} className={input} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      {err && <p role="alert" className="sm:col-span-3 text-xs text-red-700">{err}</p>}
      <div className="sm:col-span-3 flex gap-2"><Button size="sm" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} إنشاء</Button><Button size="sm" type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button></div>
    </form>
  );
}
