import { BadgeCheck } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/server/guards";
import { findWilaya } from "@/lib/wilayas";
import { ApplyAssociation } from "@/components/modules/apply-association";

export const dynamic = "force-dynamic";
export const metadata = { title: "دليل الجمعيات المعتمدة" };

export default async function AssociationsPage() {
  const viewer = await getViewer();
  const supabase = await supabaseServer();
  const [{ data: verified }, { data: mine }] = await Promise.all([
    supabase.from("associations").select("id, name, approval_number, wilaya_code, description, contact_email, contact_phone, reviewed_at").eq("status", "approved").order("name"),
    viewer ? supabase.from("associations").select("id, name, status, review_note, created_at").eq("applicant_id", viewer.id) : Promise.resolve({ data: [] }),
  ]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">دليل الجمعيات المعتمدة</h1>
        <p className="text-sm text-slate-600">تحصل الجمعية على الشارة ✓ بعد أن تتحقق المديرية الولائية من رقم الاعتماد والوثائق. نداءاتها تبدأ بمصداقية أعلى، لكنها تمر بالمراجعة كغيرها.</p>
      </div>
      {viewer ? <ApplyAssociation mine={mine ?? []} /> : <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"><a href="/login?next=/associations" className="font-bold text-brand-700 underline">سجّل الدخول</a> لتقديم طلب اعتماد جمعيتك.</p>}
      {(verified ?? []).length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد جمعيات معتمدة بعد.</div> : (
        <div className="grid sm:grid-cols-2 gap-3">{verified!.map((a) => (
          <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <h2 className="flex items-center gap-1 font-black">{a.name} <BadgeCheck className="h-4 w-4 text-emerald-600" aria-label="معتمدة" /></h2>
            <div className="text-xs text-slate-500">{findWilaya(a.wilaya_code)?.nameAr} · رقم الاعتماد {a.approval_number}</div>
            {a.description && <p className="mt-1 text-xs text-slate-700 line-clamp-3">{a.description}</p>}
            <div className="mt-1 text-xs">{a.contact_email && <a className="underline" href={`mailto:${a.contact_email}`}>{a.contact_email}</a>}{a.contact_phone && <span dir="ltr"> · {a.contact_phone}</span>}</div>
          </article>
        ))}</div>
      )}
    </div>
  );
}
