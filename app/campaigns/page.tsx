import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/server/guards";
import { findWilaya } from "@/lib/wilayas";
import { NewCampaign } from "@/components/modules/new-campaign";
import { formatDate } from "@/lib/utils";
import { KIND_AR } from "@/lib/reference/campaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "الحملات" };

export default async function CampaignsPage() {
  const viewer = await getViewer();
  const supabase = await supabaseServer();
  const { data: campaigns } = await supabase.from("campaigns").select("id, kind, title, wilaya_code, goal_units, unit_label, starts_on, ends_on, status").order("starts_on", { ascending: false }).limit(100);
  const progress = await Promise.all((campaigns ?? []).map(async (c) => [c.id, ((await supabase.rpc("campaign_progress", { campaign: c.id })).data ?? {}) as { units?: number }] as const));
  const pm = new Map(progress);
  const canCreate = !!viewer && (viewer.isStaff || viewer.roles.some((r) => r.role === "association"));
  let myAssociations: { id: string; name: string }[] = [];
  if (viewer) { const { data } = await supabase.from("associations").select("id, name").eq("applicant_id", viewer.id).eq("status", "approved"); myAssociations = data ?? []; }
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">الحملات الموسمية</h1>
        <p className="text-sm text-slate-600">قفة رمضان، الدخول المدرسي، حملة الشتاء… أهداف ومناوبات تطوع وتقدّم محسوب من التسجيلات الفعلية، مع منع تكرار المستفيد بين الجمعيات دون كشف هويته.</p>
      </div>
      {canCreate ? <NewCampaign associations={myAssociations} /> : <p className="text-xs text-slate-500">إنشاء الحملات متاح للجمعيات المعتمدة والمشرفين.</p>}
      {(campaigns ?? []).length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد حملات بعد.</div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{campaigns!.map((c) => {
          const u = Number(pm.get(c.id)?.units ?? 0), pct = Math.min(100, Math.round((u / c.goal_units) * 100));
          return (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm hover:shadow-md">
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">{KIND_AR[c.kind]}</span>
              <h2 className="mt-1 font-black">{c.title}</h2>
              <div className="text-[11px] text-slate-500">{c.wilaya_code ? findWilaya(c.wilaya_code)?.nameAr : "وطنية"} · {formatDate(c.starts_on)} → {formatDate(c.ends_on)}{c.status === "closed" ? " · مغلقة" : ""}</div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} /></div>
              <div className="mt-1 text-xs">{u} / {c.goal_units} {c.unit_label} ({pct}%)</div>
            </Link>
          );
        })}</div>
      )}
    </div>
  );
}
