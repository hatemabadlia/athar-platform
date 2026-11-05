import { listPublicAlerts, listResolvedWithReports } from "@/lib/data/alerts";
import { activeCrises, listShelters } from "@/lib/data/crisis";
import { getViewer } from "@/lib/server/guards";
import { getMyProfile } from "@/lib/data/profile";
import { matchAlerts } from "@/lib/matching";
import { supabaseServer } from "@/lib/supabase/server";
import { Portal } from "@/components/public/portal";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getViewer();
  const supabase = await supabaseServer();
  const [alerts, crises, reports, statsRes, profile] = await Promise.all([
    listPublicAlerts({ viewerId: viewer?.id }),
    activeCrises(),
    listResolvedWithReports(),
    supabase.rpc("portal_stats"),
    viewer ? getMyProfile() : Promise.resolve(null),
  ]);
  const shelters = crises.length ? await listShelters(crises.map((c) => c.wilayaCode), true) : [];
  const stats = (statsRes.data ?? { approved: 0, critical: 0, filtered: 0 }) as { approved: number; critical: number; filtered: number };
  const matches = profile ? matchAlerts(profile, alerts) : [];

  return (
    <>
      <RealtimeRefresh tables={["alerts", "crises"]} channel="portal" />
      <Portal
        alerts={alerts}
        crises={crises}
        shelters={shelters}
        stats={stats}
        matches={matches.map((m) => ({ id: m.alert.id, reasons: m.reasons }))}
        signedIn={!!viewer}
        hasProfile={!!profile?.displayName}
        reports={reports.map((r) => ({
          id: r.id, outcome: r.outcome, attended: r.attended_count, hours: Number(r.hours_total), organization: r.organization,
          createdAt: r.created_at, title: (r.alert as { title?: string } | null)?.title ?? "", category: (r.alert as { category?: string } | null)?.category ?? "relief",
        }))}
      />
    </>
  );
}
