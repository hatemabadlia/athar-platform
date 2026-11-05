import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { supabaseServer } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata = { title: "شهادة تطوع", robots: { index: false } };

/** Holder's printable certificate. "Save as PDF" from the browser produces the PDF (Arabic shaping stays correct). */
export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: c } = await supabase.from("certificates").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const verifyUrl = `${publicEnv().NEXT_PUBLIC_SITE_URL}/verify/${c.id}`;
  const qr = await QRCode.toString(verifyUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:p-0">
      <div className="mb-4 flex justify-between print:hidden">
        <a href="/profile" className="text-sm text-slate-600 underline">رجوع</a>
        <PrintButton />
      </div>
      <article className="rounded-2xl border-4 border-double border-amber-400 bg-gradient-to-b from-amber-50 to-white p-8 text-center print:rounded-none">
        <div className="text-sm font-bold text-slate-500">منصة إيثار للتطوع — Athar</div>
        <h1 className="mt-4 text-4xl font-black text-slate-900">شهادة تطوع</h1>
        <p className="mt-4 text-sm text-slate-600">تشهد منصة إيثار أن</p>
        <p className="mt-1 text-3xl font-black text-brand-700">{c.holder_name}</p>
        <p className="mt-3 text-base text-slate-700 leading-relaxed">
          قد أنجز(ت) <b>{Number(c.hours)}</b> ساعة تطوع مؤكدة عبر <b>{c.activities}</b> مشاركة/حضور موثّق،
          في الفترة من {formatDate(c.period_start)} إلى {formatDate(c.period_end)}.
        </p>
        <p className="mt-2 text-xs text-slate-500">الساعات المحتسبة هي فقط تلك المؤكدة بمسح QR أو بتأكيد صاحب النداء/المشرف.</p>
        <div className="mt-6 flex items-end justify-between gap-4 text-right">
          <div className="text-xs text-slate-600 space-y-1">
            <div>الجهة المُصدِرة: {c.issuer}</div>
            <div>تاريخ الإصدار: {formatDate(c.issued_at)}</div>
            <div dir="ltr" className="font-mono text-[10px]">ID: {c.id}</div>
            <div dir="ltr" className="font-mono text-[10px] break-all">SIG: {c.signature.slice(0, 32)}…</div>
            {c.revoked_at && <div className="font-bold text-red-700">ملغاة: {c.revoked_reason ?? ""}</div>}
          </div>
          <div className="text-center">
            <div className="h-28 w-28" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="mt-1 text-[10px] text-slate-500">امسح للتحقق</div>
          </div>
        </div>
      </article>
    </div>
  );
}
