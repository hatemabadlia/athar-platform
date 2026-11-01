"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/server/guards";
import { toActionError, type ActionResult } from "@/lib/server/result";
import { smsProvider } from "@/lib/sms";
import { findWilaya } from "@/lib/wilayas";
import { parseCsv } from "@/lib/csv";
import { canonicalText } from "@/lib/pipeline/text";
import { contentHash, keyedHash } from "@/lib/pipeline/hash";
import { extractPhones } from "@/lib/pipeline/text";

const ROLES = ["club_lead", "association", "moderator", "djsl_admin", "ministry_admin"] as const;

// ---------------- crisis ----------------
const Crisis = z.object({
  type: z.enum(["flood", "earthquake", "fire", "cold", "other"]),
  wilayaCode: z.number().int().min(1).max(58),
  title: z.string().trim().min(3).max(120),
  smsTemplate: z.string().trim().min(10).max(320),
  hubShelterId: z.string().uuid().optional(),
  sendSms: z.boolean(),
  confirmCount: z.number().int().min(0).optional(),
});

/** Count of volunteers who would receive the crisis SMS (opted in, phone set, in the wilaya). */
export async function crisisAudience(wilayaCode: number): Promise<ActionResult<number>> {
  const viewer = await getViewer();
  if (!viewer || !(viewer.isMinistry || viewer.roles.some((r) => r.role === "djsl_admin" && r.wilaya_code === wilayaCode))) return { ok: false, error: "ليست لديك صلاحية" };
  const db = supabaseAdmin();
  const { data: users } = await db.from("profiles").select("id").eq("wilaya_code", wilayaCode).is("deleted_at", null);
  const ids = (users ?? []).map((u) => u.id);
  if (!ids.length) return { ok: true, data: 0 };
  const { count } = await db.from("profile_private").select("*", { count: "exact", head: true }).in("user_id", ids).eq("sms_opt_in", true).not("phone", "is", null);
  return { ok: true, data: count ?? 0 };
}

export async function activateCrisis(input: z.infer<typeof Crisis>): Promise<ActionResult<{ crisisId: string; sent: number; failed: number; provider: string }>> {
  const p = Crisis.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const d = p.data;
  const supabase = await supabaseServer();
  const { data: crisisId, error } = await supabase.rpc("activate_crisis", { t: d.type, wilaya: d.wilayaCode, title: d.title, sms_template: d.smsTemplate });
  if (error) return toActionError(error);
  let sent = 0, failed = 0;
  const provider = smsProvider();
  if (d.sendSms) {
    // The RPC above already proved the caller administers this wilaya.
    const db = supabaseAdmin();
    let hub = "";
    if (d.hubShelterId) {
      const { data: sh } = await db.from("shelters").select("name").eq("id", d.hubShelterId).eq("wilaya_code", d.wilayaCode).single();
      hub = sh?.name ?? "";
    }
    const text = d.smsTemplate.replace("{w}", findWilaya(d.wilayaCode)?.nameAr ?? "").replace("{hub}", hub || "سيُعلن لاحقاً");
    const { data: users } = await db.from("profiles").select("id").eq("wilaya_code", d.wilayaCode).is("deleted_at", null);
    const ids = (users ?? []).map((u) => u.id);
    const { data: recipients } = ids.length
      ? await db.from("profile_private").select("user_id, phone").in("user_id", ids).eq("sms_opt_in", true).not("phone", "is", null)
      : { data: [] };
    for (const r of recipients ?? []) {
      const res = await provider.send(r.phone!, text);
      if (res.status === "failed") failed++; else sent++;
      await db.from("sms_messages").insert({ crisis_id: crisisId as string, user_id: r.user_id, direction: "outbound", phone: r.phone!, body: text,
        provider: provider.name, provider_id: res.providerId, status: res.status, error: res.error ?? null });
    }
    await db.from("audit_log").insert({ actor_id: (await getViewer())?.id ?? null, action: "crisis_sms", entity: "crisis", entity_id: crisisId as string,
      wilaya_code: d.wilayaCode, details: { sent, failed, provider: provider.name } });
  }
  revalidatePath("/admin"); revalidatePath("/");
  return { ok: true, data: { crisisId: crisisId as string, sent, failed, provider: provider.name } };
}

export async function closeCrisis(crisisId: string, report: string): Promise<ActionResult> {
  if (report.trim().length < 5) return { ok: false, error: "اكتب تقرير الإغلاق" };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("close_crisis", { crisis: crisisId, report: report.trim().slice(0, 4000) });
  if (error) return toActionError(error);
  revalidatePath("/admin"); revalidatePath("/");
  return { ok: true };
}

export async function postCrisisUpdate(crisisId: string, body: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "يجب تسجيل الدخول" };
  const { error } = await supabase.from("crisis_updates").insert({ crisis_id: crisisId, body: body.trim().slice(0, 1000), created_by: viewer.id });
  if (error) return toActionError(error);
  revalidatePath(`/crisis/${crisisId}`);
  return { ok: true };
}

// ---------------- shelters ----------------
const Shelter = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(3).max(160),
  wilayaCode: z.number().int().min(1).max(58),
  lat: z.number().min(18).max(38).nullable(),
  lng: z.number().min(-9).max(12).nullable(),
  capacity: z.number().int().min(0).max(100000),
  occupied: z.number().int().min(0).max(100000),
  needs: z.array(z.string().trim().min(1).max(60)).max(20),
  phone: z.string().trim().max(20).nullable(),
  isOpen: z.boolean(),
});

export async function saveShelter(input: z.infer<typeof Shelter>): Promise<ActionResult> {
  const p = Shelter.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  if (p.data.occupied > p.data.capacity) return { ok: false, error: "الإشغال أكبر من الطاقة" };
  const viewer = await getViewer();
  const supabase = await supabaseServer();
  const row = { name: p.data.name, wilaya_code: p.data.wilayaCode, lat: p.data.lat, lng: p.data.lng, capacity: p.data.capacity, occupied: p.data.occupied,
    needs: p.data.needs, phone: p.data.phone, is_open: p.data.isOpen, updated_by: viewer?.id ?? null, updated_at: new Date().toISOString() };
  const { data, error } = p.data.id
    ? await supabase.from("shelters").update(row).eq("id", p.data.id).select("id")
    : await supabase.from("shelters").insert(row).select("id");
  if (error) return toActionError(error);
  if (!data?.length) return { ok: false, error: "ليست لديك صلاحية على هذه الولاية" };
  revalidatePath("/admin"); revalidatePath("/");
  return { ok: true };
}

// ---------------- roles ----------------
export async function grantRoleByEmail(email: string, role: (typeof ROLES)[number], wilayaCode: number | null): Promise<ActionResult> {
  if (!z.string().email().safeParse(email).success || !ROLES.includes(role)) return { ok: false, error: "بيانات غير صالحة" };
  const supabase = await supabaseServer();
  const { data: users, error } = await supabase.rpc("find_user_by_email", { email });
  if (error) return toActionError(error);
  const target = (users as { id: string }[] | null)?.[0];
  if (!target) return { ok: false, error: "لا يوجد مستخدم بهذا البريد (يجب أن يسجّل الدخول مرة أولاً)." };
  const { error: e2 } = await supabase.rpc("grant_role", { target: target.id, r: role, wilaya: wilayaCode ?? undefined });
  if (e2) return toActionError(e2);
  revalidatePath("/admin");
  return { ok: true };
}

export async function revokeRole(userId: string, role: (typeof ROLES)[number]): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("revoke_role", { target: userId, r: role });
  if (error) return toActionError(error);
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------- reports ----------------
export async function reviewReport(reportId: string, approve: boolean): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("review_report", { report: reportId, approve });
  if (error) return toActionError(error);
  revalidatePath("/admin"); revalidatePath("/");
  return { ok: true };
}

// ---------------- CSV imports ----------------
const MAX_ROWS = 5000;

/**
 * Imports reference rows from CSV. The admin must state the source; rows are stored with it.
 * kinds: institutions (name_ar,name_fr,kind,wilaya_code,address,lat,lng,phone),
 *        shelters (name,wilaya_code,capacity,lat,lng,phone),
 *        baladiyas (wilaya_code,name_ar,name_fr,lat,lng,ons_code),
 *        historical (text,first_seen_at,wilaya_code,category,resolved_at) — known old/recycled posts.
 */
export async function importCsv(kind: "institutions" | "shelters" | "baladiyas" | "historical", csv: string, source: string): Promise<ActionResult<{ inserted: number; skipped: number; errors: string[] }>> {
  const viewer = await getViewer();
  if (!viewer?.isStaff) return { ok: false, error: "ليست لديك صلاحية" };
  if (source.trim().length < 3) return { ok: false, error: "اذكر مصدر البيانات" };
  const rows = parseCsv(csv);
  if (!rows.length) return { ok: false, error: "ملف فارغ" };
  if (rows.length > MAX_ROWS) return { ok: false, error: `الحد الأقصى ${MAX_ROWS} سطر` };
  const supabase = await supabaseServer(); // RLS decides which wilayas this admin may write
  const errors: string[] = [];
  let inserted = 0, skipped = 0;
  const num = (v: string | undefined) => (v && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);

  for (const [i, r] of rows.entries()) {
    const line = i + 2;
    const w = num(r.wilaya_code);
    if (!w || !findWilaya(w)) { errors.push(`سطر ${line}: wilaya_code غير صالح`); skipped++; continue; }
    let res: { error: { message: string; code?: string } | null };
    if (kind === "institutions") {
      const k = (r.kind || "other").trim();
      if (!["youth_house", "youth_center", "hospital", "blood_center", "school", "civil_protection", "other"].includes(k) || !r.name_ar) { errors.push(`سطر ${line}: kind/name_ar`); skipped++; continue; }
      res = await supabase.from("institutions").upsert({ kind: k as "other", name_ar: r.name_ar.trim(), name_fr: r.name_fr?.trim() || null, wilaya_code: w,
        address: r.address?.trim() || null, lat: num(r.lat), lng: num(r.lng), phone: r.phone?.trim() || null, source: source.trim(), verified: true, created_by: viewer.id },
        { onConflict: "kind,wilaya_code,name_ar" });
    } else if (kind === "shelters") {
      if (!r.name) { errors.push(`سطر ${line}: name`); skipped++; continue; }
      res = await supabase.from("shelters").insert({ name: r.name.trim(), wilaya_code: w, capacity: num(r.capacity) ?? 0, lat: num(r.lat), lng: num(r.lng),
        phone: r.phone?.trim() || null, is_open: false, updated_by: viewer.id });
    } else if (kind === "baladiyas") {
      if (!r.name_ar) { errors.push(`سطر ${line}: name_ar`); skipped++; continue; }
      res = await supabase.from("baladiyas").upsert({ wilaya_code: w, name_ar: r.name_ar.trim(), name_fr: r.name_fr?.trim() || null, lat: num(r.lat), lng: num(r.lng),
        ons_code: r.ons_code?.trim() || null, source: source.trim() }, { onConflict: "wilaya_code,name_ar" });
    } else {
      const text = r.text?.trim();
      const first = r.first_seen_at && !Number.isNaN(Date.parse(r.first_seen_at)) ? new Date(r.first_seen_at).toISOString() : null;
      if (!text || text.length < 20 || !first) { errors.push(`سطر ${line}: text/first_seen_at`); skipped++; continue; }
      const cat = ["blood", "relief", "cleanup", "orphans", "medical", "education"].includes(r.category ?? "") ? r.category as "relief" : null;
      // archive is service-role only; staff check above
      res = await supabaseAdmin().from("historical_posts").upsert({ content_hash: contentHash(text), normalized_text: canonicalText(text),
        phone_hashes: extractPhones(text).map(keyedHash), category: cat, wilaya_code: w, first_seen_at: first,
        resolved_at: r.resolved_at && !Number.isNaN(Date.parse(r.resolved_at)) ? new Date(r.resolved_at).toISOString() : null, source: "import" },
        { onConflict: "content_hash", ignoreDuplicates: true });
    }
    if (res.error) { errors.push(`سطر ${line}: ${res.error.code === "42501" ? "خارج صلاحيتك" : "رُفض"}`); skipped++; } else inserted++;
  }
  await supabaseAdmin().from("audit_log").insert({ actor_id: viewer.id, action: `import_${kind}`, entity: kind, details: { inserted, skipped, source: source.trim() } });
  revalidatePath("/admin");
  return { ok: true, data: { inserted, skipped, errors: errors.slice(0, 20) } };
}
