import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/server/guards";
import { findWilaya } from "@/lib/wilayas";
import { ClubsClient } from "@/components/clubs/clubs-client";
import type { ActivityView, Category, ClubView } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "نوادي التطوع" };

export default async function ClubsPage() {
  const viewer = await getViewer();
  const supabase = await supabaseServer();
  const [{ data: clubs }, { data: stats }, { data: mine }, { data: acts }] = await Promise.all([
    supabase.from("clubs").select("id,name,description,institution_name,wilaya_code,focus").eq("status", "approved").order("created_at", { ascending: false }).limit(200),
    supabase.from("club_stats").select("*"),
    viewer ? supabase.from("club_members").select("club_id, role").eq("user_id", viewer.id) : Promise.resolve({ data: [] as { club_id: string; role: string }[] }),
    supabase.from("club_activities").select("id,club_id,alert_id,title,location,wilaya_code,starts_at,ends_at,status").gte("starts_at", new Date(Date.now() - 7 * 864e5).toISOString()).order("starts_at").limit(200),
  ]);
  const s = new Map((stats ?? []).map((x) => [x.club_id as string, x]));
  const m = new Map((mine ?? []).map((x) => [x.club_id, x.role as "member" | "lead"]));
  const list: ClubView[] = (clubs ?? []).map((c) => {
    const st = s.get(c.id);
    return { id: c.id, name: c.name, description: c.description, institutionName: c.institution_name, wilayaCode: c.wilaya_code,
      wilaya: findWilaya(c.wilaya_code)?.nameAr ?? "", focus: c.focus as Category[], members: Number(st?.members ?? 0),
      points: Number(st?.points ?? 0), activities30d: Number(st?.activities_30d ?? 0), myRole: m.get(c.id) ?? null };
  });
  const activities: ActivityView[] = (acts ?? []).map((a) => ({ id: a.id, clubId: a.club_id, alertId: a.alert_id, title: a.title, location: a.location,
    wilayaCode: a.wilaya_code, startsAt: a.starts_at, endsAt: a.ends_at, status: a.status }));
  return <ClubsClient clubs={list} activities={activities} signedIn={!!viewer} />;
}
