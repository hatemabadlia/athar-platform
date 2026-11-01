"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { toActionError, type ActionResult } from "@/lib/server/result";
import { haversineKm } from "@/lib/geo";

const NewTree = z.object({
  wilayaCode: z.number().int().min(1).max(58),
  place: z.string().trim().min(2).max(160),
  species: z.string().trim().min(2).max(60),
  note: z.string().trim().max(500).default(""),
  photoPath: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/),
  lat: z.number().min(18).max(38),
  lng: z.number().min(-9).max(12),
  gpsSource: z.enum(["device", "map"]),
  exif: z.object({ lat: z.number().nullable(), lng: z.number().nullable(), takenAt: z.string().nullable() }),
});

/**
 * Registers a tree for moderation. EXIF values are reported by the browser (read before the image is
 * re-encoded, which strips EXIF from the stored copy). They are moderation SIGNALS, not proof.
 */
export async function addTree(input: z.input<typeof NewTree>): Promise<ActionResult<string>> {
  const p = NewTree.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "بيانات غير صالحة" };
  const d = p.data;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول" };
  if (!d.photoPath.startsWith(`${user.id}/`)) return { ok: false, error: "مسار صورة غير صالح" };

  const check: Record<string, unknown> = { gps_source: d.gpsSource, exif_present: d.exif.lat != null || d.exif.takenAt != null };
  if (d.exif.lat != null && d.exif.lng != null) check.exif_distance_km = Math.round(haversineKm(d.lat, d.lng, d.exif.lat, d.exif.lng) * 10) / 10;
  if (d.exif.takenAt) {
    const days = (Date.now() - new Date(d.exif.takenAt).getTime()) / 864e5;
    check.photo_age_days = Math.round(days);
  }
  const { data, error } = await supabase.from("trees").insert({
    user_id: user.id, wilaya_code: d.wilayaCode, place: d.place, species: d.species, note: d.note, photo_path: d.photoPath,
    // public precision ~100 m
    lat: Math.round(d.lat * 1000) / 1000, lng: Math.round(d.lng * 1000) / 1000,
    exif_taken_at: d.exif.takenAt && !Number.isNaN(Date.parse(d.exif.takenAt)) ? new Date(d.exif.takenAt).toISOString() : null,
    location_check: check as never,
  }).select("id").single();
  if (error) return toActionError(error);
  revalidatePath("/trees");
  return { ok: true, data: data.id };
}

export async function toggleLike(treeId: string, like: boolean): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول" };
  const { error } = like
    ? await supabase.from("tree_likes").insert({ tree_id: treeId, user_id: user.id })
    : await supabase.from("tree_likes").delete().eq("tree_id", treeId).eq("user_id", user.id);
  if (error && error.code !== "23505") return toActionError(error);
  revalidatePath("/trees");
  return { ok: true };
}

export async function reviewTree(treeId: string, approve: boolean, note?: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("review_tree", { tree: treeId, approve, note: note ?? undefined });
  if (error) return toActionError(error);
  revalidatePath("/trees"); revalidatePath("/admin");
  return { ok: true };
}
