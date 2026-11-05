"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { WILAYAS } from "@/lib/wilayas";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { applyAssociation } from "@/app/actions/modules";

const ST: Record<string, string> = { pending: "قيد المراجعة", approved: "معتمدة ✓", rejected: "مرفوضة" };

export function ApplyAssociation({ mine }: { mine: { id: string; name: string; status: string; review_note: string | null }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", approvalNumber: "", wilayaCode: 16, description: "", email: "", phone: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const input = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
  const submit = () => start(async () => {
    setMsg(null);
    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMsg("يجب تسجيل الدخول"); return; }
    const paths: string[] = [];
    for (const file of files.slice(0, 5)) {
      if (file.size > 10 * 1024 * 1024 || !/^(application\/pdf|image\/(jpeg|png))$/.test(file.type)) { setMsg("PDF/JPEG/PNG أقل من 10 ميغا"); return; }
      const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("association-docs").upload(path, file, { contentType: file.type });
      if (up.error) { setMsg("فشل رفع الوثيقة"); return; }
      paths.push(path);
    }
    const r = await applyAssociation({ ...f, documentPaths: paths });
    setMsg(r.ok ? "أُرسل الطلب — تراجعه المديرية الولائية." : r.error);
    if (r.ok) { setOpen(false); router.refresh(); }
  });
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
      {mine.length > 0 && <ul className="text-sm space-y-1">{mine.map((m) => <li key={m.id}><b>{m.name}</b> — {ST[m.status]}{m.review_note ? ` (${m.review_note})` : ""}</li>)}</ul>}
      {!open ? <Button size="sm" onClick={() => setOpen(true)}>تقديم طلب اعتماد جمعية</Button> : (
        <div className="grid sm:grid-cols-2 gap-2">
          <div><label htmlFor="an" className="text-xs font-bold">اسم الجمعية *</label><input id="an" className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label htmlFor="aa" className="text-xs font-bold">رقم الاعتماد *</label><input id="aa" className={input} value={f.approvalNumber} onChange={(e) => setF({ ...f, approvalNumber: e.target.value })} /></div>
          <div><label htmlFor="aw" className="text-xs font-bold">الولاية</label><select id="aw" className={input} value={f.wilayaCode} onChange={(e) => setF({ ...f, wilayaCode: +e.target.value })}>{WILAYAS.map((x) => <option key={x.code} value={x.code}>{x.nameAr}</option>)}</select></div>
          <div><label htmlFor="ae" className="text-xs font-bold">بريد الجمعية</label><input id="ae" type="email" dir="ltr" className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="sm:col-span-2"><label htmlFor="ad" className="text-xs font-bold">نبذة</label><textarea id="ad" rows={2} className={input} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm"><Upload className="h-4 w-4" aria-hidden /> وثيقة الاعتماد (PDF/صورة) — تُخزّن بشكل خاص ويطلع عليها المشرفون فقط{files.length ? ` · ${files.length} ملف` : ""}
            <input type="file" multiple accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])])} /></label>
          <div className="sm:col-span-2 flex gap-2"><Button size="sm" disabled={pending || !files.length} onClick={submit}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} إرسال</Button><Button size="sm" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button></div>
        </div>
      )}
      {msg && <p role="status" className="text-xs font-bold">{msg}</p>}
    </section>
  );
}
