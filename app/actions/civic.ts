"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/server/guards";
import { toActionError, type ActionResult } from "@/lib/server/result";
import { haversineKm } from "@/lib/geo";
import { CIVIC_CATEGORY_KEYS, type CivicStatus } from "@/lib/civic";

const PHOTO = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/;
const NewReport = z.object({
  category: z.enum(CIVIC_CATEGORY_KEYS as [string, ...string[]]),
  description: z.string().trim().min(3, "الوصف قصير").max(500),
  notes: z.string().trim().max(1000).optional(),
  severity: z.enum(["low", "medium", "high", "danger"]),
  lat: z.number().min(18).max(38), lng: z.number().min(-9).max(12),
  accuracy: z.number().min(0).max(100000).nullable(),
  source: z.enum(["gps", "map", "search"]),
  address: z.string().trim().max(200).optional(),
  photos: z.array(z.object({ path: z.string().regex(PHOTO), hash: z.string().regex(/^-?\d{1,20}$/) })).min(1, "صورة واحدة على الأقل").max(4),
  exif: z.object({ lat: z.number().nullable(), lng: z.number().nullable(), takenAt: z.string().nullable() }),
  ai: z.object({ mode: z.enum(["gemini", "claude", "manual"]), suggestion: z.record(z.string(), z.unknown()).nullable(), accepted: z.boolean() }),
});

/** Creates a civic report (RPC checks ownership of photo paths, daily limit, recycled photos, wilaya). */
export async function createCivicReport(input: z.input<typeof NewReport>): Promise<ActionResult<{ ref: string }>> {
  const p = NewReport.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const d = p.data;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول" };
  if (!(await rateLimit(`civic-create:${user.id}`, 6, 600))) return { ok: false, error: "أرسلت بلاغات كثيرة في وقت قصير. حاول بعد دقائق." };

  // Moderator-only signals (never public): where/when the camera says the photo was taken, AI flags.
  const signals: Record<string, unknown> = { location_source: d.source, exif_present: d.exif.lat != null || d.exif.takenAt != null };
  if (d.exif.lat != null && d.exif.lng != null) signals.exif_distance_m = Math.round(haversineKm(d.lat, d.lng, d.exif.lat, d.exif.lng) * 1000);
  if (d.exif.takenAt) signals.photo_age_days = Math.round((Date.now() - new Date(d.exif.takenAt).getTime()) / 864e5);
  const s = d.ai.suggestion as { contains_people_or_plates?: boolean; private_property_visible?: boolean; is_public_issue?: boolean; category?: string | null } | null;
  if (s) Object.assign(signals, { ai_people_or_plates: !!s.contains_people_or_plates, ai_private_property: !!s.private_property_visible,
    ai_public_issue: s.is_public_issue ?? null, ai_category_changed_by_user: !!s.category && s.category !== d.category });

  const { data, error } = await supabase.rpc("civic_create", {
    p_category: d.category, p_description: d.description, p_notes: d.notes ?? null, p_severity: d.severity,
    p_lat: d.lat, p_lng: d.lng, p_accuracy: d.accuracy, p_source: d.source, p_address: d.address ?? null,
    p_photo_paths: d.photos.map((x) => x.path), p_photo_hashes: d.photos.map((x) => x.hash) as unknown as number[],
    p_ai: (d.ai.suggestion ?? {}) as never, p_ai_mode: d.ai.mode, p_signals: signals as never,
  });
  if (error) return error.message.includes("daily") ? { ok: false, error: "بلغت حد 10 بلاغات في اليوم." } : toActionError(error);
  revalidatePath("/civic/mine");
  return { ok: true, data: { ref: (data as { ref: string }[])[0].ref } };
}

export async function supportCivic(reportId: string, kind: "support" | "still_exists"): Promise<ActionResult<number>> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("civic_support", { p_report: reportId, p_kind: kind });
  if (error) return error.message.includes("you reported") ? { ok: false, error: "لا يمكنك دعم بلاغك." } : toActionError(error);
  return { ok: true, data: data as number };
}

export async function commentCivic(reportId: string, body: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("civic_comment", { p_report: reportId, p_body: body });
  if (error) return error.message.includes("limit") ? { ok: false, error: "بلغت حد 3 إضافات على هذا البلاغ." } : toActionError(error);
  return { ok: true };
}

export async function flagCivic(reportId: string, reason: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("civic_flag", { p_report: reportId, p_reason: reason });
  return error ? toActionError(error) : { ok: true };
}

export async function replyCivicInfo(reportId: string, body: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("civic_reply_info", { p_report: reportId, p_body: body });
  return error ? toActionError(error) : { ok: true };
}

// ---------------- moderators (the database re-checks wilaya scope and allowed transitions) ----------------
export async function setCivicStatus(reportId: string, status: CivicStatus, note: string, forwardedTo?: string, duplicateOf?: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  let dup: string | undefined;
  if (duplicateOf) {
    const { data } = await supabase.from("civic_reports").select("id").eq("ref", duplicateOf.trim().toUpperCase()).maybeSingle();
    if (!data) return { ok: false, error: "لم يُعثر على البلاغ الأصلي بهذا المرجع." };
    dup = data.id;
  }
  const { error } = await supabase.rpc("civic_set_status", { p_report: reportId, p_status: status, p_note: note || undefined, p_forwarded_to: forwardedTo || undefined, p_duplicate_of: dup });
  if (error) {
    if (error.message.includes("forwarding requires")) return { ok: false, error: "حدّد الجهة وطريقة الإحالة (مثلاً: بلدية باب الزوار — مراسلة رقم…)." };
    if (error.message.includes("reason is required")) return { ok: false, error: "اكتب السبب أو المعلومات المطلوبة." };
    if (error.message.includes("not allowed")) return { ok: false, error: "هذا الانتقال غير مسموح." };
    return toActionError(error);
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function civicInternalNote(reportId: string, body: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("civic_internal_note", { p_report: reportId, p_body: body });
  return error ? toActionError(error) : { ok: true };
}

export async function civicResolution(reportId: string, body: string, photoPath?: string): Promise<ActionResult> {
  if (photoPath && !PHOTO.test(photoPath)) return { ok: false, error: "مسار صورة غير صالح" };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("civic_add_resolution", { p_report: reportId, p_body: body, p_photo_path: photoPath });
  return error ? toActionError(error) : { ok: true };
}

export async function civicPhotoPublic(reportId: string, isPublic: boolean): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("civic_set_photo_public", { p_report: reportId, p_public: isPublic });
  return error ? toActionError(error) : { ok: true };
}
