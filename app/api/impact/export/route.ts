import { supabaseServer } from "@/lib/supabase/server";
import { findWilaya } from "@/lib/wilayas";
import { toCsv } from "@/lib/csv";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const w = Number(u.searchParams.get("w")) || null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("impact_stats", { p_wilaya: w && findWilaya(w) ? w : undefined,
    p_from: u.searchParams.get("from") || undefined, p_to: u.searchParams.get("to") || undefined });
  if (error) return new Response("error", { status: 500 });
  const s = data as Record<string, unknown> & { by_wilaya: { wilaya_code: number; alerts: number; resolved: number }[] };
  const summary = toCsv([{ scope: w ? findWilaya(w)?.name : "national", from: u.searchParams.get("from") ?? "", to: u.searchParams.get("to") ?? "",
    alerts_approved: s.alerts_approved, alerts_resolved: s.alerts_resolved, alerts_filtered: s.alerts_filtered, volunteer_hours: s.volunteer_hours,
    confirmed_participations: s.confirmed_participations, attendance_checkins: s.attendance_checkins, trees_verified: s.trees_verified, clubs: s.clubs,
    reports_approved: s.reports_approved, generated_at: s.generated_at }]);
  const byW = toCsv(s.by_wilaya.map((r) => ({ wilaya_code: r.wilaya_code, wilaya: findWilaya(r.wilaya_code)?.name ?? "", alerts: r.alerts, resolved: r.resolved })));
  return new Response("﻿" + summary + "\r\n\r\n" + byW, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="athar-impact.csv"` } });
}
