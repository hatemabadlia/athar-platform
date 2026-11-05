import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera } from "lucide-react";
import { getViewer } from "@/lib/server/guards";
import { supabaseServer } from "@/lib/supabase/server";
import { CIVIC_CATEGORIES, CIVIC_STATUS, type CivicCategory, type CivicStatus } from "@/lib/civic";
import { findWilaya } from "@/lib/wilayas";

export const dynamic = "force-dynamic";
export const metadata = { title: "بلاغاتي — صوّر وبلّغ" };

export default async function MyCivicReports() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/civic/mine");
  const supabase = await supabaseServer();
  const { data } = await supabase.from("civic_reports").select("id, ref, category, description, status, wilaya_code, created_at, updated_at")
    .eq("reporter_id", viewer.id).order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">بلاغاتي</h1>
        <Link href="/civic/new" className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"><Camera className="h-4 w-4" aria-hidden /> بلاغ جديد</Link>
      </div>
      {rows.length === 0 ? <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لم ترسل أي بلاغ بعد.</p> : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const c = CIVIC_CATEGORIES[r.category as CivicCategory] ?? CIVIC_CATEGORIES.other; const st = CIVIC_STATUS[r.status as CivicStatus];
            return (
              <li key={r.id}>
                <Link href={`/civic/r/${r.ref}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm">
                  <span className="text-2xl" aria-hidden>{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-900">{r.description}</div>
                    <div className="text-[11px] text-slate-500"><span dir="ltr" className="font-mono">{r.ref}</span> · {findWilaya(r.wilaya_code ?? 0)?.nameAr} · {new Date(r.created_at).toLocaleDateString("ar-DZ")}</div>
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black text-white" style={{ background: st.color }}>{st.ar}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
