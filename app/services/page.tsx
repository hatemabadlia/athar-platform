import { listPublicAlerts } from "@/lib/data/alerts";
import { getMyProfile } from "@/lib/data/profile";
import { getViewer } from "@/lib/server/guards";
import { supabaseServer } from "@/lib/supabase/server";
import { ServicesClient } from "./services-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "تطوّع بمهارتك",
  description: "ماشي كل مساعدة مادية: طلبات تحتاج مصمماً، مترجماً، سائقاً، أستاذاً أو استشارة مهنية — في ولايتك أو عن بُعد.",
};

export default async function ServicesPage() {
  const viewer = await getViewer();
  const supabase = await supabaseServer();
  const [alerts, profile, supply] = await Promise.all([
    listPublicAlerts({ viewerId: viewer?.id }),
    viewer ? getMyProfile() : Promise.resolve(null),
    supabase.rpc("skill_supply_demand", {}),
  ]);
  const skillAlerts = alerts.filter((a) => a.requiredSkills.length > 0);
  return (
    <ServicesClient
      alerts={skillAlerts}
      signedIn={!!viewer}
      me={profile ? { wilayaCode: profile.wilayaCode, skills: profile.skills, verifiedSkills: profile.verifiedSkills, remoteOk: profile.remoteOk } : null}
      supply={(supply.data ?? []).map((s) => ({ skill: s.skill, regulated: s.regulated, remote: s.remote, volunteers: Number(s.volunteers), requests: Number(s.open_requests) }))}
    />
  );
}
