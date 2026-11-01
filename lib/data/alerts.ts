import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { findWilaya } from "@/lib/wilayas";
import type { Database } from "@/lib/supabase/database.types";
import type { CredibilityReason, ModerationAlert, PublicAlert } from "@/lib/types";

type AlertRow = Database["public"]["Tables"]["alerts"]["Row"];

const PUBLIC_COLUMNS =
  "id,title,summary,category,urgency,status,wilaya_code,baladiya_name,institution_name,lat,lng,location_precision,credibility_score,credibility_reasons,ai_mode,volunteers_needed,blood_type,deadline,created_at,source_count";

export function mapPublic(r: Pick<AlertRow, "id" | "title" | "summary" | "category" | "urgency" | "status" | "wilaya_code" | "baladiya_name" | "institution_name" | "lat" | "lng" | "location_precision" | "credibility_score" | "credibility_reasons" | "ai_mode" | "volunteers_needed" | "blood_type" | "deadline" | "created_at" | "source_count">, joined = 0): PublicAlert {
  const w = r.wilaya_code ? findWilaya(r.wilaya_code) : undefined;
  return {
    id: r.id, title: r.title, summary: r.summary, category: r.category, urgency: r.urgency, status: r.status,
    wilayaCode: r.wilaya_code, wilaya: w?.nameAr ?? "غير محددة", baladiya: r.baladiya_name, institution: r.institution_name,
    lat: r.lat ?? w?.lat ?? null, lng: r.lng ?? w?.lng ?? null,
    locationPrecision: r.location_precision as PublicAlert["locationPrecision"],
    credibilityScore: r.credibility_score, credibilityReasons: (r.credibility_reasons ?? []) as unknown as CredibilityReason[],
    aiMode: r.ai_mode as PublicAlert["aiMode"], volunteersNeeded: r.volunteers_needed, volunteersJoined: joined,
    bloodType: r.blood_type, deadline: r.deadline, createdAt: r.created_at, sourceCount: r.source_count,
  };
}

async function participation(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("alert_participation").select("alert_id, joined").in("alert_id", ids);
  return new Map((data ?? []).map((p) => [p.alert_id as string, Number(p.joined ?? 0)]));
}

/** Approved alerts (public), most urgent first. */
export async function listPublicAlerts(opts: { limit?: number; viewerId?: string | null } = {}): Promise<PublicAlert[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("alerts").select(PUBLIC_COLUMNS)
    .eq("status", "approved").order("created_at", { ascending: false }).limit(opts.limit ?? 300);
  if (error) throw error;
  const rows = data ?? [];
  const counts = await participation(rows.map((r) => r.id));
  let mine = new Set<string>();
  if (opts.viewerId) {
    const { data: v } = await supabase.from("alert_volunteers").select("alert_id").eq("user_id", opts.viewerId).in("status", ["joined", "confirmed"]);
    mine = new Set((v ?? []).map((x) => x.alert_id));
  }
  return rows.map((r) => ({ ...mapPublic(r, counts.get(r.id) ?? 0), joinedByMe: mine.has(r.id) }));
}

export async function listResolvedWithReports(limit = 6) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("reports")
    .select("id, outcome, attended_count, hours_total, organization, created_at, alert:alerts(id,title,category,wilaya_code)")
    .eq("status", "approved").not("alert_id", "is", null).order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

/** Alerts visible to the moderator under RLS (scope enforced by the database). */
export async function listModerationAlerts(filter: { status?: string; q?: string; limit?: number } = {}): Promise<ModerationAlert[]> {
  const supabase = await supabaseServer();
  let q = supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(filter.limit ?? 200);
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status as AlertRow["status"]);
  if (filter.q) q = q.ilike("title", `%${filter.q.replace(/[%_]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw error;
  const counts = await participation((data ?? []).map((r) => r.id));
  return (data ?? []).map((r) => ({
    ...mapPublic(r, counts.get(r.id) ?? 0),
    originalText: r.original_text, normalizedText: r.normalized_text, verdict: r.verdict,
    needsReview: r.needs_review_reasons, firstSeenAt: r.first_seen_at, contactName: r.contact_name,
    darijaTerms: (r.darija_terms ?? []) as { from: string; to: string }[], aiConfidence: r.ai_confidence,
    reviewedAt: r.reviewed_at, mergedInto: r.merged_into,
  }));
}
