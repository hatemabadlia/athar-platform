import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { AppRole, ProfileView } from "@/lib/types";

export async function getMyProfile(): Promise<ProfileView | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: p }, { data: priv }, { data: pts }, { data: roles }, { data: verified }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("profile_private").select("*").eq("user_id", user.id).single(),
    supabase.rpc("my_points"),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("skill_verifications").select("skill").eq("user_id", user.id),
  ]);
  if (!p) return null;
  const points = (pts ?? {}) as { points?: number; hours?: number; events?: number; by_kind?: Record<string, number> };
  return {
    id: p.id, displayName: p.display_name, wilayaCode: p.wilaya_code, skills: p.skills, availability: p.availability,
    remoteOk: p.remote_ok ?? false, hideFromLeaderboard: p.hide_from_leaderboard ?? false, verifiedSkills: (verified ?? []).map((v) => v.skill),
    phone: priv?.phone ?? null, bloodType: priv?.blood_type ?? null, smsOptIn: priv?.sms_opt_in ?? false,
    points: Number(points.points ?? 0), hours: Number(points.hours ?? 0), events: Number(points.events ?? 0),
    byKind: points.by_kind ?? {}, roles: (roles ?? []).map((r) => r.role as AppRole),
  };
}
