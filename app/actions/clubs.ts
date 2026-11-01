"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { toActionError, type ActionResult } from "@/lib/server/result";
import { CATEGORIES } from "@/lib/pipeline/types";

const NewClub = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).default(""),
  wilayaCode: z.number().int().min(1).max(58),
  institutionName: z.string().trim().max(120).optional(),
  focus: z.array(z.enum(CATEGORIES)).max(6),
});

export async function createClub(input: z.input<typeof NewClub>): Promise<ActionResult<string>> {
  const p = NewClub.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("create_club", {
    name: p.data.name, wilaya: p.data.wilayaCode, description: p.data.description,
    institution_name: p.data.institutionName || undefined, focus: p.data.focus,
  });
  if (error) return toActionError(error);
  revalidatePath("/clubs");
  return { ok: true, data: data as string };
}

export async function joinClub(clubId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول" };
  const { error } = await supabase.from("club_members").insert({ club_id: clubId, user_id: user.id, role: "member" });
  if (error && error.code !== "23505") return toActionError(error);
  revalidatePath("/clubs");
  return { ok: true };
}

export async function leaveClub(clubId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول" };
  const { error } = await supabase.from("club_members").delete().eq("club_id", clubId).eq("user_id", user.id).eq("role", "member");
  if (error) return toActionError(error);
  revalidatePath("/clubs");
  return { ok: true };
}

const NewActivity = z.object({
  clubId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  location: z.string().trim().max(160).optional(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).optional(),
  alertId: z.string().uuid().optional(),
});

export async function createActivity(input: z.infer<typeof NewActivity>): Promise<ActionResult<string>> {
  const p = NewActivity.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول" };
  const { data: club } = await supabase.from("clubs").select("wilaya_code").eq("id", p.data.clubId).single();
  if (!club) return { ok: false, error: "النادي غير موجود" };
  const { data, error } = await supabase.from("club_activities").insert({
    club_id: p.data.clubId, title: p.data.title, location: p.data.location ?? null, wilaya_code: club.wilaya_code,
    starts_at: p.data.startsAt, ends_at: p.data.endsAt ?? null, alert_id: p.data.alertId ?? null, created_by: user.id,
  }).select("id").single();
  if (error) return toActionError(error);
  revalidatePath("/clubs");
  return { ok: true, data: data.id };
}

export async function checkIn(token: string, activityId: string, hours: number | null): Promise<ActionResult<{ status: string; name: string | null }>> {
  if (!/^[0-9a-f-]{36}\.\d+\.[0-9a-f]+\.[0-9a-f]{64}$/.test(token.trim())) return { ok: false, error: "رمز QR غير صالح." };
  if (hours != null && (!(hours > 0) || hours > 24)) return { ok: false, error: "عدد الساعات بين 0 و24" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("check_in", { token: token.trim(), activity: activityId, hours: hours ?? undefined });
  if (error) return toActionError(error);
  const d = data as { status: string; display_name?: string };
  revalidatePath("/clubs");
  return { ok: true, data: { status: d.status, name: d.display_name ?? null } };
}

export async function setActivityStatus(activityId: string, status: "planned" | "ongoing" | "done" | "cancelled"): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("club_activities").update({ status }).eq("id", activityId).select("id");
  if (error) return toActionError(error);
  if (!data?.length) return { ok: false, error: "ليست لديك صلاحية." };
  revalidatePath("/clubs");
  return { ok: true };
}

export async function submitReport(input: { alertId?: string; activityId?: string; outcome: string; attended: number; hours: number; resources?: string; organization?: string }): Promise<ActionResult<string>> {
  const s = z.object({ alertId: z.string().uuid().optional(), activityId: z.string().uuid().optional(), outcome: z.string().trim().min(5).max(2000),
    attended: z.number().int().min(0).max(100000), hours: z.number().min(0).max(1000000), resources: z.string().max(1000).optional(), organization: z.string().max(160).optional() }).safeParse(input);
  if (!s.success || (!s.data.alertId && !s.data.activityId)) return { ok: false, error: "بيانات غير صالحة" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("submit_report", {
    alert: s.data.alertId, activity: s.data.activityId, outcome: s.data.outcome, attended_count: s.data.attended,
    hours_total: s.data.hours, resources_used: s.data.resources ?? undefined, organization: s.data.organization ?? undefined,
  });
  if (error) return toActionError(error);
  revalidatePath("/"); revalidatePath("/clubs"); revalidatePath("/admin");
  return { ok: true, data: data as string };
}
