import { getViewer } from "@/lib/server/guards";
import { integrationStatus } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { Forbidden } from "@/components/forbidden";
import { IngestConsole, type IntakeRow } from "./console";

export const dynamic = "force-dynamic";
export const metadata = { title: "محرك المعالجة" };

export default async function IngestPage() {
  const viewer = await getViewer();
  if (!viewer?.isStaff) return <Forbidden signedIn={!!viewer} what="محرك المعالجة" />;
  const supabase = await supabaseServer();
  const [{ data: items }, { count: archive }] = await Promise.all([
    supabase.from("intake_items").select("id, channel, source_label, raw_text, status, error, received_at, alert_id, pipeline").order("received_at", { ascending: false }).limit(30),
    supabase.from("historical_posts").select("*", { count: "exact", head: true }),
  ]);
  const rows: IntakeRow[] = (items ?? []).map((i) => {
    const p = (i.pipeline ?? {}) as { verdict?: string; score?: number; mode?: string; analysis?: { title?: string } };
    return { id: i.id, channel: i.channel, sourceLabel: i.source_label, preview: i.raw_text.slice(0, 160), status: i.status, error: i.error,
      receivedAt: i.received_at, alertId: i.alert_id, verdict: p.verdict ?? null, score: p.score ?? null, mode: p.mode ?? null, title: p.analysis?.title ?? null };
  });
  return <IngestConsole initial={rows} integrations={integrationStatus()} archiveSize={archive ?? 0} />;
}
