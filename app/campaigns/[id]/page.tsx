import { notFound } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/server/guards";
import { findWilaya } from "@/lib/wilayas";
import { KIND_AR } from "@/lib/reference/campaigns";
import { formatDate } from "@/lib/utils";
import { CampaignClient } from "@/components/modules/campaign-client";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await supabaseServer();
  const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const viewer = await getViewer();
  const [{ data: prog }, { data: shifts }, { data: mySignups }, { data: canManage }, { data: contribs }] = await Promise.all([
    supabase.rpc("campaign_progress", { campaign: id }),
    supabase.from("campaign_shifts").select("id, starts_at, ends_at, location, capacity").eq("campaign_id", id).order("starts_at"),
    viewer ? supabase.from("shift_signups").select("shift_id").eq("user_id", viewer.id) : Promise.resolve({ data: [] }),
    viewer ? supabase.rpc("can_manage_campaign", { c: id }) : Promise.resolve({ data: false }),
    supabase.from("campaign_contributions").select("id, units, note, created_at").eq("campaign_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const p = (prog ?? {}) as { units?: number; beneficiaries?: number; shifts?: number; volunteers?: number };
  const counts = new Map<string, number>();
  await Promise.all((shifts ?? []).map(async (s) => counts.set(s.id, Number((await supabase.rpc("shift_taken", { shift: s.id })).data ?? 0))));
  const pct = Math.min(100, Math.round((Number(p.units ?? 0) / c.goal_units) * 100));
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-5">
      <section className="rounded-3xl bg-gradient-to-l from-indigo-700 to-slate-900 p-6 text-white">
        <div className="text-xs font-bold opacity-80">{KIND_AR[c.kind]} · {c.wilaya_code ? findWilaya(c.wilaya_code)?.nameAr : "وطنية"} · {formatDate(c.starts_on)} → {formatDate(c.ends_on)}</div>
        <h1 className="text-2xl sm:text-3xl font-black">{c.title}</h1>
        {c.description && <p className="mt-1 text-sm text-white/85">{c.description}</p>}
        <div className="mt-4 h-3 rounded-full bg-white/20 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-amber-400" style={{ width: `${pct}%` }} /></div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
          <div><b className="text-lg">{Number(p.units ?? 0)}</b><div>/{c.goal_units} {c.unit_label}</div></div>
          <div><b className="text-lg">{p.beneficiaries ?? 0}</b><div>أسرة مسجّلة</div></div>
          <div><b className="text-lg">{p.shifts ?? 0}</b><div>مناوبة</div></div>
          <div><b className="text-lg">{p.volunteers ?? 0}</b><div>متطوع</div></div>
        </div>
      </section>
      <CampaignClient campaignId={id} canManage={!!canManage} signedIn={!!viewer} unitLabel={c.unit_label}
        shifts={(shifts ?? []).map((s) => ({ ...s, taken: counts.get(s.id) ?? null, mine: (mySignups ?? []).some((m) => m.shift_id === s.id) }))}
        contributions={contribs ?? []} />
    </div>
  );
}
