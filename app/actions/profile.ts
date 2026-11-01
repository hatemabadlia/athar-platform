"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { toActionError, type ActionResult } from "@/lib/server/result";
import { BLOOD_TYPES } from "@/lib/pipeline/types";
import { normalizePhone } from "@/lib/pipeline/text";
import { SKILLS } from "@/lib/reference/meta";
import { PRIVACY_POLICY_VERSION } from "@/lib/consent";

const Profile = z.object({
  displayName: z.string().trim().min(2, "الاسم قصير").max(80),
  wilayaCode: z.number().int().min(1).max(58),
  skills: z.array(z.enum(SKILLS as unknown as [string, ...string[]])).max(10),
  availability: z.enum(["weekends", "evenings", "anytime"]),
  phone: z.string().trim().max(20).optional(),
  bloodType: z.enum(BLOOD_TYPES).nullable(),
  bloodConsent: z.boolean(),
  smsOptIn: z.boolean(),
});

export async function saveProfile(input: z.infer<typeof Profile>): Promise<ActionResult> {
  const p = Profile.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const d = p.data;
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return { ok: false, error: "رقم الهاتف غير صالح" };
  if (d.bloodType && !d.bloodConsent) return { ok: false, error: "الموافقة مطلوبة لحفظ فصيلة الدم" };
  if (d.smsOptIn && !phone) return { ok: false, error: "أضف رقم هاتف لتلقي الرسائل" };

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول" };

  const { error: e1 } = await supabase.from("profiles").update({
    display_name: d.displayName, wilaya_code: d.wilayaCode, skills: d.skills, availability: d.availability, onboarded: true,
  }).eq("id", user.id);
  if (e1) return toActionError(e1);
  const { error: e2 } = await supabase.from("profile_private").update({
    phone, blood_type: d.bloodType, sms_opt_in: d.smsOptIn,
  }).eq("user_id", user.id);
  if (e2) return toActionError(e2);

  // consent trail: record grants; revoke when the data is removed
  const consents: { purpose: "terms" | "blood_data" | "sms_alerts"; give: boolean }[] = [
    { purpose: "terms", give: true },
    { purpose: "blood_data", give: !!d.bloodType },
    { purpose: "sms_alerts", give: d.smsOptIn },
  ];
  const { data: existing } = await supabase.from("consents").select("id, purpose").eq("user_id", user.id).is("revoked_at", null);
  for (const c of consents) {
    const has = existing?.find((x) => x.purpose === c.purpose);
    if (c.give && !has) await supabase.from("consents").insert({ user_id: user.id, purpose: c.purpose, version: PRIVACY_POLICY_VERSION });
    if (!c.give && has) await supabase.from("consents").update({ revoked_at: new Date().toISOString() }).eq("id", has.id);
  }
  revalidatePath("/profile"); revalidatePath("/");
  return { ok: true };
}

export async function issueQrToken(): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("issue_qr_token");
  if (error) return toActionError(error);
  const d = data as { token: string; expires_at: string };
  return { ok: true, data: { token: d.token, expiresAt: d.expires_at } };
}

export async function issueCertificate(): Promise<ActionResult<string>> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("issue_certificate");
  if (error) return toActionError(error);
  revalidatePath("/profile");
  return { ok: true, data: data as string };
}

export async function requestDeletion(reason: string): Promise<ActionResult<string>> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("request_account_deletion", { reason: reason.slice(0, 500) || undefined });
  if (error) return toActionError(error);
  revalidatePath("/profile");
  return { ok: true, data: data as string };
}

export async function cancelDeletion(): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) return toActionError(error);
  revalidatePath("/profile");
  return { ok: true };
}
