import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { mapPublic } from "@/lib/data/alerts";
import { findWilaya } from "@/lib/wilayas";
import { RED_CELL_COMPATIBILITY } from "@/lib/matching";
import type { BloodType, Category, PublicAlert } from "@/lib/types";
import { CATEGORIES, BLOOD_TYPES } from "@/lib/pipeline/types";

/** Database tools for the assistant. They run as the signed-in user (or anon) under RLS. */
export interface ToolOutput { json: unknown; alerts?: PublicAlert[] }

export async function searchAlerts(args: { wilaya_code?: number; category?: string; donor_blood_type?: string; limit?: number }): Promise<ToolOutput> {
  const supabase = await supabaseServer();
  let q = supabase.from("alerts").select("id,title,summary,category,urgency,status,wilaya_code,baladiya_name,institution_name,lat,lng,location_precision,credibility_score,credibility_reasons,ai_mode,volunteers_needed,blood_type,required_skills,remote_ok,deadline,created_at,source_count")
    .eq("status", "approved").order("created_at", { ascending: false }).limit(Math.min(args.limit ?? 5, 10));
  if (args.wilaya_code) q = q.eq("wilaya_code", args.wilaya_code);
  if (args.category && (CATEGORIES as readonly string[]).includes(args.category)) q = q.eq("category", args.category as Category);
  if (args.donor_blood_type && (BLOOD_TYPES as readonly string[]).includes(args.donor_blood_type)) {
    q = q.eq("category", "blood").in("blood_type", RED_CELL_COMPATIBILITY[args.donor_blood_type as BloodType]);
  }
  const { data, error } = await q;
  if (error) return { json: { error: "query failed" } };
  const alerts = (data ?? []).map((r) => mapPublic(r));
  return {
    alerts,
    json: { count: alerts.length, alerts: alerts.map((a) => ({ id: a.id, title: a.title, category: a.category, urgency: a.urgency,
      wilaya: a.wilaya, blood_type: a.bloodType, institution: a.institution, posted: a.createdAt })) },
  };
}

export async function myPoints(): Promise<ToolOutput> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { json: { signed_in: false } };
  const { data } = await supabase.rpc("my_points");
  return { json: { signed_in: true, ...(data as object), note: "points come only from confirmed actions" } };
}

export async function myClubs(): Promise<ToolOutput> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { json: { signed_in: false } };
  const { data } = await supabase.from("club_members").select("role, club:clubs(name, wilaya_code)").eq("user_id", user.id);
  return { json: { signed_in: true, clubs: (data ?? []).map((m) => ({ role: m.role, ...(m.club as object) })) } };
}

export async function listClubs(args: { wilaya_code?: number }): Promise<ToolOutput> {
  const supabase = await supabaseServer();
  let q = supabase.from("clubs").select("name, institution_name, wilaya_code").eq("status", "approved").limit(10);
  if (args.wilaya_code) q = q.eq("wilaya_code", args.wilaya_code);
  const { data } = await q;
  return { json: { count: data?.length ?? 0, clubs: data ?? [] } };
}

export async function crisisInfo(args: { wilaya_code?: number }): Promise<ToolOutput> {
  const supabase = await supabaseServer();
  let q = supabase.from("crises").select("title, type, wilaya_code, started_at").eq("status", "active");
  if (args.wilaya_code) q = q.eq("wilaya_code", args.wilaya_code);
  const { data: crises } = await q;
  let sh = supabase.from("shelters").select("name, wilaya_code, capacity, occupied, needs, phone, updated_at").eq("is_open", true).limit(10);
  if (args.wilaya_code) sh = sh.eq("wilaya_code", args.wilaya_code);
  const { data: shelters } = await sh;
  return { json: { active_crises: crises ?? [], open_shelters: shelters ?? [] } };
}

export const TOOL_DEFS = [
  { name: "search_alerts", description: "Search APPROVED volunteer/donation alerts on Athar. Use for any question about current needs. donor_blood_type returns blood alerts this donor is compatible with.",
    input_schema: { type: "object" as const, properties: {
      wilaya_code: { type: "integer", description: "Algerian wilaya code 1-69" },
      category: { type: "string", enum: [...CATEGORIES] },
      donor_blood_type: { type: "string", enum: [...BLOOD_TYPES] },
      limit: { type: "integer" } }, additionalProperties: false } },
  { name: "my_points", description: "The signed-in user's confirmed points, hours and actions.", input_schema: { type: "object" as const, properties: {}, additionalProperties: false } },
  { name: "my_clubs", description: "Clubs the signed-in user belongs to.", input_schema: { type: "object" as const, properties: {}, additionalProperties: false } },
  { name: "list_clubs", description: "Volunteer clubs registered on Athar, optionally in one wilaya.", input_schema: { type: "object" as const, properties: { wilaya_code: { type: "integer" } }, additionalProperties: false } },
  { name: "crisis_info", description: "Active emergencies declared by authorities on Athar and open shelters/assembly points.", input_schema: { type: "object" as const, properties: { wilaya_code: { type: "integer" } }, additionalProperties: false } },
];

export async function runTool(name: string, input: Record<string, unknown>): Promise<ToolOutput> {
  const n = (k: string) => (typeof input[k] === "number" ? (input[k] as number) : undefined);
  const s = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : undefined);
  switch (name) {
    case "search_alerts": return searchAlerts({ wilaya_code: n("wilaya_code"), category: s("category"), donor_blood_type: s("donor_blood_type"), limit: n("limit") });
    case "my_points": return myPoints();
    case "my_clubs": return myClubs();
    case "list_clubs": return listClubs({ wilaya_code: n("wilaya_code") });
    case "crisis_info": return crisisInfo({ wilaya_code: n("wilaya_code") });
    default: return { json: { error: "unknown tool" } };
  }
}

export const wilayaName = (c?: number | null) => (c ? findWilaya(c)?.nameAr : undefined);
