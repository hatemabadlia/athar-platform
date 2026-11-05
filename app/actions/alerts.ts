"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SKILLS } from "@/lib/reference/meta";
import { supabaseServer } from "@/lib/supabase/server";
import { toActionError, type ActionResult } from "@/lib/server/result";
import { CATEGORIES, URGENCIES, BLOOD_TYPES } from "@/lib/pipeline/types";
import { findWilaya } from "@/lib/wilayas";

const uuid = z.string().uuid();

export async function joinAlert(alertId: string): Promise<ActionResult<{ phone: string | null; name: string | null }>> {
  if (!uuid.safeParse(alertId).success) return { ok: false, error: "معرّف غير صالح" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("join_alert", { alert: alertId });
  if (error) return toActionError(error);
  revalidatePath("/");
  const d = data as { contact_phone: string | null; contact_name: string | null };
  return { ok: true, data: { phone: d.contact_phone, name: d.contact_name } };
}

export async function leaveAlert(alertId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("leave_alert", { alert: alertId });
  if (error) return toActionError(error);
  revalidatePath("/");
  return { ok: true };
}

export async function getAlertContact(alertId: string): Promise<ActionResult<string | null>> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("get_alert_contact", { alert: alertId });
  if (error) return toActionError(error);
  return { ok: true, data: data as string | null };
}

const Review = z.object({
  id: uuid,
  action: z.enum(["approve", "reject", "resolve", "merge", "reopen", "mark_recycled"]),
  note: z.string().max(500).optional(),
  mergeTarget: uuid.optional(),
});

export async function reviewAlert(input: z.infer<typeof Review>): Promise<ActionResult<string>> {
  const p = Review.safeParse(input);
  if (!p.success) return { ok: false, error: "بيانات غير صالحة" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("review_alert", {
    alert: p.data.id, action: p.data.action, note: p.data.note ?? undefined, merge_target: p.data.mergeTarget ?? undefined,
  });
  if (error) return toActionError(error);
  revalidatePath("/admin"); revalidatePath("/");
  return { ok: true, data: data as string };
}

const Correction = z.object({
  id: uuid,
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().max(600),
  category: z.enum(CATEGORIES),
  urgency: z.enum(URGENCIES),
  wilaya_code: z.number().int().min(1).max(69).nullable(),
  baladiya_name: z.string().trim().max(80).nullable(),
  institution_name: z.string().trim().max(120).nullable(),
  blood_type: z.enum(BLOOD_TYPES).nullable(),
  volunteers_needed: z.number().int().min(0).max(10000),
  deadline: z.string().datetime({ offset: true }).nullable(),
  contact_name: z.string().trim().max(80).nullable(),
  required_skills: z.array(z.enum(SKILLS as unknown as [string, ...string[]])).max(8).default([]),
  remote_ok: z.boolean().default(false),
});

/** Moderator correction of extracted fields (RLS limits rows to the moderator's wilaya). */
export async function correctAlert(input: z.infer<typeof Correction>): Promise<ActionResult> {
  const p = Correction.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const { id, ...fields } = p.data;
  const w = fields.wilaya_code ? findWilaya(fields.wilaya_code) : null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("alerts").update({
    ...fields, lat: w?.lat ?? null, lng: w?.lng ?? null, location_precision: "wilaya",
  }).eq("id", id).select("id");
  if (error) return toActionError(error);
  if (!data?.length) return { ok: false, error: "ليست لديك صلاحية على هذا النداء." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function confirmVolunteer(alertId: string, userId: string, confirmed: boolean, hours: number | null): Promise<ActionResult> {
  if (!uuid.safeParse(alertId).success || !uuid.safeParse(userId).success) return { ok: false, error: "معرّف غير صالح" };
  if (hours != null && (hours <= 0 || hours > 24)) return { ok: false, error: "عدد الساعات بين 0 و24" };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("confirm_alert_volunteer", { alert: alertId, volunteer: userId, confirmed, hours: hours ?? undefined });
  if (error) return toActionError(error);
  revalidatePath("/admin"); revalidatePath("/profile");
  return { ok: true };
}

export async function retryIntake(intakeId: string): Promise<ActionResult> {
  // staff-only: RLS on intake_items update enforces it
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("intake_items").update({ status: "queued", error: null }).eq("id", intakeId).eq("status", "failed").select("id");
  if (error) return toActionError(error);
  if (!data?.length) return { ok: false, error: "غير متاح" };
  const { processIntake } = await import("@/lib/pipeline/run");
  try { await processIntake(intakeId); } catch (e) { return { ok: false, error: e instanceof Error ? e.message.slice(0, 120) : "فشل" }; }
  revalidatePath("/ingest"); revalidatePath("/admin");
  return { ok: true };
}
