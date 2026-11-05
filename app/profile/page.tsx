import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/profile";
import { listPublicAlerts } from "@/lib/data/alerts";
import { supabaseServer } from "@/lib/supabase/server";
import { matchAlerts } from "@/lib/matching";
import { earnedBadges } from "@/lib/badges";
import { ProfileClient } from "@/components/profile/profile-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ملفي" };

export default async function ProfilePage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login?next=/profile");
  const supabase = await supabaseServer();
  const [alerts, { data: parts }, { data: clubs }, { data: certs }, { data: deletion }, { data: att }, { count: trees }] = await Promise.all([
    listPublicAlerts({ viewerId: profile.id }),
    supabase.from("alert_volunteers").select("status, hours, joined_at, confirmed_at, alert:alerts(id,title,category,urgency,status,wilaya_code)").eq("user_id", profile.id).order("joined_at", { ascending: false }),
    supabase.from("club_members").select("role, club:clubs(id,name,institution_name,wilaya_code)").eq("user_id", profile.id),
    supabase.from("certificates").select("id, hours, activities, issued_at, revoked_at").eq("user_id", profile.id).order("issued_at", { ascending: false }),
    supabase.from("deletion_requests").select("scheduled_for").eq("user_id", profile.id).eq("status", "pending").maybeSingle(),
    supabase.from("attendance").select("id, checked_in_at, hours, activity:club_activities(title)").eq("user_id", profile.id).order("checked_in_at", { ascending: false }),
    supabase.from("trees").select("*", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "approved"),
  ]);
  type A = { id: string; title: string; category: string; urgency: string; status: string; wilaya_code: number | null };
  const participations = (parts ?? []).map((p) => ({ status: p.status, hours: p.hours, joinedAt: p.joined_at, alert: p.alert as unknown as A | null }));
  const badges = earnedBadges({
    confirmedParticipations: participations.filter((p) => p.status === "confirmed" && p.alert).map((p) => ({ category: p.alert!.category, urgency: p.alert!.urgency })),
    attendanceCount: att?.length ?? 0, treesApproved: trees ?? 0, clubCount: clubs?.length ?? 0,
  });
  return (
    <ProfileClient
      profile={profile}
      badges={badges}
      matches={matchAlerts(profile, alerts).map((m) => ({ alert: m.alert, reasons: m.reasons }))}
      participations={participations}
      attendance={(att ?? []).map((a) => ({ id: a.id, at: a.checked_in_at, hours: a.hours, title: (a.activity as { title?: string } | null)?.title ?? "" }))}
      clubs={(clubs ?? []).map((c) => ({ role: c.role, ...(c.club as unknown as { id: string; name: string; institution_name: string | null; wilaya_code: number }) }))}
      certificates={certs ?? []}
      deletionScheduledFor={deletion?.scheduled_for ?? null}
      treesApproved={trees ?? 0}
    />
  );
}
