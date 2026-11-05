import { notFound } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { listShelters } from "@/lib/data/crisis";
import { getViewer } from "@/lib/server/guards";
import { findWilaya } from "@/lib/wilayas";
import { CRISIS_META } from "@/lib/reference/meta";
import { formatDate, timeAgo } from "@/lib/utils";
import { CrisisActions } from "./actions";

export const dynamic = "force-dynamic";

export default async function CrisisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await supabaseServer();
  const { data: c } = await supabase.from("crises").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: updates }, shelters, viewer] = await Promise.all([
    supabase.from("crisis_updates").select("id, body, created_at").eq("crisis_id", id).order("created_at", { ascending: false }),
    listShelters([c.wilaya_code], true),
    getViewer(),
  ]);
  const meta = c.type !== "other" ? CRISIS_META[c.type] : null;
  const canAdmin = !!viewer && (viewer.isMinistry || viewer.roles.some((r) => r.role === "djsl_admin" && r.wilaya_code === c.wilaya_code));
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-5">
      <div className={`rounded-3xl p-5 ${c.status === "active" ? "bg-red-600 text-white" : "bg-slate-200"}`}>
        <div className="text-xs font-bold opacity-80">{c.status === "active" ? "حالة طوارئ نشطة" : `أُغلقت ${formatDate(c.closed_at!)}`}</div>
        <h1 className="text-2xl font-black">{meta?.emoji} {c.title}</h1>
        <div className="text-sm opacity-90">{findWilaya(c.wilaya_code)?.nameAr} · منذ {timeAgo(c.started_at)}</div>
      </div>
      {c.status === "active" && <CrisisActions crisisId={c.id} signedIn={!!viewer} canAdmin={canAdmin} />}
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-black mb-2">مراكز الإيواء والتجمع المفتوحة</h2>
        {shelters.length === 0 ? <p className="text-sm text-slate-500">لم تُسجَّل مراكز مفتوحة بعد. اتبع تعليمات الحماية المدنية والسلطات المحلية.</p> : (
          <ul className="space-y-2">{shelters.map((s) => (
            <li key={s.id} className="rounded-2xl bg-slate-50 p-3 text-sm"><div className="font-bold">{s.name}</div><div className="text-xs text-slate-600">الإشغال {s.occupied}/{s.capacity}{s.needs.length ? ` · الاحتياجات: ${s.needs.join("، ")}` : ""}{s.phone ? ` · ` : ""}{s.phone && <span dir="ltr">{s.phone}</span>} · حُدّث {timeAgo(s.updatedAt)}</div></li>
          ))}</ul>
        )}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-black mb-2">التحديثات الرسمية</h2>
        {(updates ?? []).length === 0 ? <p className="text-sm text-slate-500">لا تحديثات بعد.</p> : (
          <ol className="space-y-2">{updates!.map((u) => <li key={u.id} className="border-r-2 border-red-300 pr-3 text-sm"><div className="text-[11px] text-slate-500">{formatDate(u.created_at)}</div>{u.body}</li>)}</ol>
        )}
      </section>
      {c.closure_report && <section className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="font-black mb-2">تقرير الإغلاق</h2><p className="text-sm whitespace-pre-wrap">{c.closure_report}</p></section>}
    </div>
  );
}
