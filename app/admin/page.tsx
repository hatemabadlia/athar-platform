import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getViewer } from "@/lib/server/guards";
import { integrationStatus } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { listModerationAlerts } from "@/lib/data/alerts";
import { listPendingTrees } from "@/lib/data/trees";
import { activeCrises, listShelters } from "@/lib/data/crisis";
import { findWilaya } from "@/lib/wilayas";
import { Forbidden } from "@/components/forbidden";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { ModerationQueue } from "@/components/admin/moderation-queue";
import { CrisisPanel } from "@/components/admin/crisis-panel";
import { SheltersPanel } from "@/components/admin/shelters-panel";
import { TreeReview } from "@/components/admin/tree-review";
import { ReportsPanel } from "@/components/admin/reports-panel";
import { RolesPanel } from "@/components/admin/roles-panel";
import { ImportPanel } from "@/components/admin/import-panel";
import { AuditPanel } from "@/components/admin/audit-panel";
import { ForecastPanel } from "@/components/admin/forecast-panel";
import { AssociationsPanel } from "@/components/admin/associations-panel";
import { computeForecasts } from "@/lib/forecast";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة الإشراف" };

const TABS = [
  ["queue", "النداءات"], ["associations", "الجمعيات"], ["trees", "الأشجار"], ["reports", "التقارير"], ["crisis", "الطوارئ"], ["shelters", "مراكز الإيواء"],
  ["forecast", "التوقعات"], ["roles", "الأدوار"], ["import", "استيراد"], ["audit", "السجل والذكاء الاصطناعي"],
] as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; q?: string; alert?: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.isStaff) return <Forbidden signedIn={!!viewer} what="لوحة الإشراف" />;
  const sp = await searchParams;
  const tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "queue") as (typeof TABS)[number][0];
  const supabase = await supabaseServer();
  const scopeLabel = viewer.isMinistry ? "الوزارة — كل الولايات" : viewer.scope.map((w) => findWilaya(w)?.nameAr ?? w).join("، ");
  const adminWilayas = viewer.isMinistry ? null : viewer.roles.filter((r) => r.role === "djsl_admin").map((r) => r.wilaya_code!);
  const { data: stats } = await supabase.rpc("portal_stats");
  const st = (stats ?? {}) as { pending?: number; approved?: number; filtered?: number; intake_total?: number };

  let body: React.ReactNode = null;
  if (tab === "queue") {
    const status = sp.status ?? "pending";
    const alerts = await listModerationAlerts({ status, q: sp.q });
    const ids = alerts.map((a) => a.id);
    const { data: parts } = ids.length ? await supabase.from("alert_volunteers").select("alert_id, user_id, status, hours").in("alert_id", ids) : { data: [] };
    const names = new Map<string, string>();
    const uids = [...new Set((parts ?? []).map((p) => p.user_id))];
    if (uids.length) { const { data } = await supabase.from("public_profiles").select("id, display_name").in("id", uids); (data ?? []).forEach((n) => names.set(n.id as string, n.display_name as string)); }
    body = <ModerationQueue alerts={alerts} status={status} q={sp.q ?? ""} openId={sp.alert ?? null}
      participants={(parts ?? []).map((p) => ({ alertId: p.alert_id, userId: p.user_id, status: p.status, hours: p.hours, name: names.get(p.user_id) ?? "" }))} />;
  } else if (tab === "associations") {
    const { data } = await supabase.from("associations").select("id, name, approval_number, wilaya_code, description, status, created_at, document_paths").order("created_at", { ascending: false }).limit(100);
    const paths = (data ?? []).flatMap((a) => a.document_paths);
    const { data: signed } = paths.length ? await supabase.storage.from("association-docs").createSignedUrls(paths, 600) : { data: [] };
    const urls = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
    body = <AssociationsPanel items={(data ?? []).map((a) => ({ ...a, docs: a.document_paths.map((p) => ({ path: p, url: urls.get(p) ?? null })) }))} />;
  } else if (tab === "trees") {
    body = <TreeReview trees={await listPendingTrees()} />;
  } else if (tab === "reports") {
    const { data } = await supabase.from("reports").select("id, outcome, attended_count, hours_total, resources_used, organization, status, created_at, alert:alerts(title), activity:club_activities(title)").order("created_at", { ascending: false }).limit(50);
    body = <ReportsPanel reports={(data ?? []).map((r) => ({ id: r.id, outcome: r.outcome, attended: r.attended_count, hours: Number(r.hours_total), resources: r.resources_used, organization: r.organization, status: r.status, createdAt: r.created_at,
      target: (r.alert as { title?: string } | null)?.title ?? (r.activity as { title?: string } | null)?.title ?? "" }))} />;
  } else if (tab === "crisis") {
    const crises = await activeCrises();
    const shelters = await listShelters(adminWilayas ?? undefined);
    const ids = crises.map((c) => c.id);
    const [{ data: conf }, { data: sms }] = ids.length
      ? await Promise.all([supabase.from("crisis_confirmations").select("crisis_id"), supabase.from("sms_messages").select("crisis_id, direction, status").in("crisis_id", ids)])
      : [{ data: [] }, { data: [] }];
    body = <CrisisPanel crises={crises} shelters={shelters} adminWilayas={adminWilayas} smsProvider={integrationStatus().smsProvider} smsReal={integrationStatus().sms}
      counts={Object.fromEntries(ids.map((id) => [id, {
        confirmed: (conf ?? []).filter((c) => c.crisis_id === id).length,
        sent: (sms ?? []).filter((m) => m.crisis_id === id && m.direction === "outbound" && m.status !== "failed").length,
        failed: (sms ?? []).filter((m) => m.crisis_id === id && m.status === "failed").length,
      }]))} />;
  } else if (tab === "shelters") {
    body = <SheltersPanel shelters={await listShelters(adminWilayas ?? undefined)} adminWilayas={adminWilayas} />;
  } else if (tab === "forecast") {
    const { data: hist } = await supabase.from("alerts").select("category, wilaya_code, created_at").in("status", ["approved", "resolved"]).limit(20000);
    body = <ForecastPanel result={computeForecasts((hist ?? []).map((h) => ({ category: h.category, wilayaCode: h.wilaya_code, createdAt: h.created_at })))} />;
  } else if (tab === "roles") {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role, wilaya_code, granted_at").neq("role", "volunteer").order("granted_at", { ascending: false }).limit(200);
    const uids = [...new Set((roles ?? []).map((r) => r.user_id))];
    const { data: names } = uids.length ? await supabase.from("public_profiles").select("id, display_name").in("id", uids) : { data: [] };
    const nm = new Map((names ?? []).map((n) => [n.id as string, n.display_name as string]));
    body = <RolesPanel roles={(roles ?? []).map((r) => ({ userId: r.user_id, role: r.role, wilayaCode: r.wilaya_code, grantedAt: r.granted_at, name: nm.get(r.user_id) ?? "" }))}
      isMinistry={viewer.isMinistry} adminWilayas={adminWilayas ?? []} />;
  } else if (tab === "import") {
    const counts = await Promise.all((["institutions", "shelters", "baladiyas", "historical_posts"] as const).map(async (t) => [t, (await supabase.from(t).select("*", { count: "exact", head: true })).count ?? 0] as const));
    body = <ImportPanel counts={Object.fromEntries(counts)} />;
  } else if (tab === "audit") {
    // ai_runs are readable by the ministry only (RLS); other staff see an empty list.
    const [{ data: audit }, { data: runs }] = await Promise.all([
      supabase.from("audit_log").select("id, actor_id, action, entity, entity_id, wilaya_code, details, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("ai_runs").select("id, stage, mode, model, latency_ms, input_tokens, output_tokens, cost_usd, success, error, created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    body = <AuditPanel audit={audit ?? []} runs={runs ?? []} integrations={integrationStatus()} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
      <RealtimeRefresh tables={["alerts", "intake_items"]} channel="admin" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> النطاق: {scopeLabel}</div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">لوحة الإشراف</h1>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <Kpi v={st.pending ?? 0} l="بانتظار المراجعة" />
          <Kpi v={st.approved ?? 0} l="معتمد نشط" />
          <Kpi v={st.filtered ?? 0} l="قديم/مدمج" />
          <Kpi v={st.intake_total ?? 0} l="إجمالي الوارد" />
        </div>
      </div>
      <nav aria-label="أقسام لوحة الإشراف" className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin?tab=${k}`} aria-current={tab === k ? "page" : undefined}
            className={cn("shrink-0 rounded-xl px-3 py-2 text-sm font-semibold", tab === k ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900")}>{l}</Link>
        ))}
      </nav>
      {body}
    </div>
  );
}

function Kpi({ v, l }: { v: number; l: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2"><div className="text-lg font-black tabular-nums text-slate-900">{v}</div><div className="text-[10px] text-slate-500">{l}</div></div>;
}
