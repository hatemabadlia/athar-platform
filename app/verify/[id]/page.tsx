import { ShieldCheck, ShieldX } from "lucide-react";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "التحقق من شهادة", robots: { index: false } };

/** Public verification. Recomputes the HMAC signature in the database; shows only what is printed on the certificate. */
export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  type V = { valid: boolean; revoked?: boolean; reason?: string; holder_name?: string; hours?: number; activities?: number; period_start?: string; period_end?: string; issuer?: string; issued_at?: string };
  let v: V = { valid: false, reason: "not_found" };
  if (z.string().uuid().safeParse(id).success) {
    const supabase = await supabaseServer();
    const { data } = await supabase.rpc("verify_certificate", { cert: id });
    if (data) v = data as V;
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className={`rounded-3xl border-2 p-6 text-center ${v.valid ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
        {v.valid ? <ShieldCheck className="mx-auto h-12 w-12 text-emerald-600" aria-hidden /> : <ShieldX className="mx-auto h-12 w-12 text-red-600" aria-hidden />}
        <h1 className="mt-3 text-2xl font-black text-slate-900">{v.valid ? "شهادة صحيحة" : v.revoked ? "شهادة ملغاة" : "شهادة غير صالحة"}</h1>
        {v.holder_name && (
          <dl className="mt-4 space-y-1 text-sm text-slate-700">
            <div><dt className="inline font-bold">الاسم: </dt><dd className="inline">{v.holder_name}</dd></div>
            <div><dt className="inline font-bold">الساعات المؤكدة: </dt><dd className="inline">{Number(v.hours)}</dd></div>
            <div><dt className="inline font-bold">عدد المشاركات: </dt><dd className="inline">{v.activities}</dd></div>
            {v.period_start && <div><dt className="inline font-bold">الفترة: </dt><dd className="inline">{formatDate(v.period_start)} — {formatDate(v.period_end!)}</dd></div>}
            {v.issued_at && <div><dt className="inline font-bold">أُصدرت: </dt><dd className="inline">{formatDate(v.issued_at)} · {v.issuer}</dd></div>}
          </dl>
        )}
        {!v.valid && !v.holder_name && <p className="mt-2 text-sm text-slate-600">لا توجد شهادة بهذا المعرّف.</p>}
        {!v.valid && v.holder_name && !v.revoked && <p className="mt-2 text-sm text-red-700">بيانات الشهادة لا تطابق التوقيع — قد تكون عُدّلت.</p>}
      </div>
    </div>
  );
}
