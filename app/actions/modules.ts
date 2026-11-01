"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { toActionError, type ActionResult } from "@/lib/server/result";
import { keyedHash } from "@/lib/pipeline/hash";
import { normalizeBeneficiaryId } from "@/lib/beneficiary";

async function uid() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, id: user?.id ?? null };
}

// ---------------- blood donors ----------------
export async function saveDonor(input: { wilayaCode: number; available: boolean; lastDonationOn: string | null; consent: boolean }): Promise<ActionResult> {
  const p = z.object({ wilayaCode: z.number().int().min(1).max(58), available: z.boolean(), lastDonationOn: z.string().date().nullable(), consent: z.literal(true, { message: "الموافقة مطلوبة" }) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  if (p.data.lastDonationOn && new Date(p.data.lastDonationOn) > new Date()) return { ok: false, error: "تاريخ في المستقبل" };
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  const { data: priv } = await supabase.from("profile_private").select("blood_type").eq("user_id", id).single();
  if (!priv?.blood_type) return { ok: false, error: "أضف فصيلة دمك في ملفك أولاً (بموافقتك)." };
  const { error } = await supabase.from("blood_donors").upsert({ user_id: id, wilaya_code: p.data.wilayaCode, available: p.data.available, last_donation_at: p.data.lastDonationOn });
  if (error) return toActionError(error);
  const { data: c } = await supabase.from("consents").select("id").eq("user_id", id).eq("purpose", "donor_registry").is("revoked_at", null).maybeSingle();
  if (!c) await supabase.from("consents").insert({ user_id: id, purpose: "donor_registry", version: "donor-v1-2026-11" });
  revalidatePath("/donors");
  return { ok: true };
}

export async function leaveDonorRegistry(): Promise<ActionResult> {
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  await supabase.from("blood_donors").delete().eq("user_id", id);
  await supabase.from("consents").update({ revoked_at: new Date().toISOString() }).eq("user_id", id).eq("purpose", "donor_registry").is("revoked_at", null);
  revalidatePath("/donors");
  return { ok: true };
}

export async function logDonation(donatedOn: string, institution: string): Promise<ActionResult> {
  if (!z.string().date().safeParse(donatedOn).success || new Date(donatedOn) > new Date()) return { ok: false, error: "تاريخ غير صالح" };
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  const { error } = await supabase.from("blood_donations").insert({ user_id: id, donated_on: donatedOn, institution: institution.slice(0, 160) || null });
  if (error) return toActionError(error);
  await supabase.from("blood_donors").update({ last_donation_at: donatedOn }).eq("user_id", id);
  revalidatePath("/donors");
  return { ok: true };
}

export async function notifyDonors(alertId: string): Promise<ActionResult<number>> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("notify_compatible_donors", { alert: alertId });
  if (error) return error.message.includes("recently") ? { ok: false, error: "أُبلغ المتبرعون خلال آخر 6 ساعات." } : toActionError(error);
  return { ok: true, data: data as number };
}

export async function donorCount(alertId: string): Promise<ActionResult<number>> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("compatible_donor_count", { alert: alertId });
  if (error) return toActionError(error);
  return { ok: true, data: data as number };
}

// ---------------- in-kind ----------------
const ITEM_CATS = ["clothes", "food", "school", "medical", "furniture", "transport", "service", "other"] as const;
const Item = z.object({
  kind: z.enum(["offer", "need"]), category: z.enum(ITEM_CATS), title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).default(""), quantity: z.number().int().min(1).max(100000), unit: z.string().trim().min(1).max(30),
  wilayaCode: z.number().int().min(1).max(58), baladiyaName: z.string().trim().max(80).optional(),
});
export async function postItem(input: z.input<typeof Item>): Promise<ActionResult> {
  const p = Item.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  const d = p.data;
  const { error } = await supabase.from("donation_items").insert({ kind: d.kind, category: d.category, title: d.title, description: d.description, quantity: d.quantity,
    unit: d.unit, wilaya_code: d.wilayaCode, baladiya_name: d.baladiyaName || null, owner_id: id });
  if (error) return toActionError(error);
  revalidatePath("/donations");
  return { ok: true };
}

export async function cancelItem(itemId: string): Promise<ActionResult> {
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  const { error } = await supabase.from("donation_items").update({ status: "cancelled" }).eq("id", itemId).eq("owner_id", id).eq("status", "open");
  if (error) return toActionError(error);
  revalidatePath("/donations");
  return { ok: true };
}

export async function proposeMatch(offerId: string, needId: string, qty: number, note?: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("propose_match", { offer: offerId, need: needId, qty, note: note?.slice(0, 300) || undefined });
  if (error) return error.code === "23505" ? { ok: false, error: "اقتُرحت هذه المطابقة من قبل." } : toActionError(error);
  revalidatePath("/donations");
  return { ok: true };
}

export async function updateMatch(matchId: string, status: "accepted" | "picked_up" | "delivered" | "cancelled"): Promise<ActionResult<{ name: string | null; phone: string | null }>> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("update_match", { match: matchId, new_status: status });
  if (error) return error.message.includes("transition") ? { ok: false, error: "هذا الانتقال غير مسموح." } : toActionError(error);
  revalidatePath("/donations");
  const d = data as { counterpart_name: string | null; counterpart_phone: string | null };
  return { ok: true, data: { name: d.counterpart_name, phone: d.counterpart_phone } };
}

// ---------------- associations ----------------
export async function applyAssociation(input: { name: string; approvalNumber: string; wilayaCode: number; description: string; email?: string; phone?: string; documentPaths: string[] }): Promise<ActionResult> {
  const p = z.object({ name: z.string().trim().min(3).max(160), approvalNumber: z.string().trim().min(3).max(60), wilayaCode: z.number().int().min(1).max(58),
    description: z.string().trim().max(2000), email: z.string().email().optional().or(z.literal("")), phone: z.string().max(20).optional(),
    documentPaths: z.array(z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$/)).min(1, "أرفق وثيقة الاعتماد").max(5) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  if (p.data.documentPaths.some((x) => !x.startsWith(`${id}/`))) return { ok: false, error: "مسار وثيقة غير صالح" };
  const { error } = await supabase.from("associations").insert({ name: p.data.name, approval_number: p.data.approvalNumber, wilaya_code: p.data.wilayaCode,
    description: p.data.description, contact_email: p.data.email || null, contact_phone: p.data.phone || null, document_paths: p.data.documentPaths, applicant_id: id });
  if (error) return error.code === "23505" ? { ok: false, error: "رقم الاعتماد مسجّل مسبقاً في هذه الولاية." } : toActionError(error);
  revalidatePath("/associations");
  return { ok: true };
}

export async function reviewAssociation(id: string, approve: boolean, note?: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("review_association", { assoc: id, approve, note: note || undefined });
  if (error) return toActionError(error);
  revalidatePath("/associations"); revalidatePath("/admin");
  return { ok: true };
}

// ---------------- campaigns ----------------
const Campaign = z.object({
  kind: z.enum(["ramadan", "school", "winter", "environment", "blood", "other"]), title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).default(""), wilayaCode: z.number().int().min(1).max(58).nullable(), goalUnits: z.number().int().min(1).max(10_000_000),
  unitLabel: z.string().trim().min(1).max(30), startsOn: z.string().date(), endsOn: z.string().date(), associationId: z.string().uuid().nullable(),
});
export async function createCampaign(input: z.input<typeof Campaign>): Promise<ActionResult<string>> {
  const p = Campaign.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const d = p.data;
  if (d.endsOn < d.startsOn) return { ok: false, error: "تاريخ النهاية قبل البداية" };
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  const season = `${d.startsOn.slice(0, 4)}-${d.kind}`;
  const { data, error } = await supabase.from("campaigns").insert({ kind: d.kind, season, title: d.title, description: d.description, wilaya_code: d.wilayaCode,
    goal_units: d.goalUnits, unit_label: d.unitLabel, starts_on: d.startsOn, ends_on: d.endsOn, association_id: d.associationId, created_by: id }).select("id").single();
  if (error) return toActionError(error);
  revalidatePath("/campaigns");
  return { ok: true, data: data.id };
}

export async function addContribution(campaignId: string, units: number, note?: string): Promise<ActionResult> {
  if (!Number.isInteger(units) || units <= 0 || units > 100000) return { ok: false, error: "عدد غير صالح" };
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  const { error } = await supabase.from("campaign_contributions").insert({ campaign_id: campaignId, units, note: note?.slice(0, 300) || null, recorded_by: id });
  if (error) return toActionError(error);
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

export async function addShift(campaignId: string, startsAt: string, endsAt: string, location: string, capacity: number): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("campaign_shifts").insert({ campaign_id: campaignId, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), location: location.slice(0, 160), capacity });
  if (error) return toActionError(error);
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

export async function toggleShift(shiftId: string, join: boolean, campaignId: string): Promise<ActionResult> {
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  const { error } = join
    ? await supabase.from("shift_signups").insert({ shift_id: shiftId, user_id: id })
    : await supabase.from("shift_signups").delete().eq("shift_id", shiftId).eq("user_id", id);
  if (error && error.message.includes("shift full")) return { ok: false, error: "اكتمل العدد" };
  if (error && error.code !== "23505") return toActionError(error);
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

/**
 * Beneficiary dedupe. The raw identifier (national ID number or phone) is normalised and HMAC-ed
 * HERE with a server secret; only the hash reaches the database. The raw value is never stored or logged.
 */
export async function registerBeneficiary(campaignId: string, identifier: string): Promise<ActionResult<string>> {
  const norm = normalizeBeneficiaryId(identifier);
  if (!norm) return { ok: false, error: "معرّف غير صالح (رقم التعريف الوطني أو رقم هاتف)." };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("register_beneficiary", { campaign: campaignId, hash: keyedHash(`beneficiary:${norm}`) });
  if (error) return toActionError(error);
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, data: (data as { status: string }).status };
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "يجب تسجيل الدخول" };
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", id).is("read_at", null);
  revalidatePath("/notifications");
  return { ok: true };
}
