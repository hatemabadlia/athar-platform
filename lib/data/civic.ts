import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { findWilaya } from "@/lib/wilayas";
import type { CivicCategory, CivicSeverity, CivicStatus } from "@/lib/civic";

export interface CivicPublic {
  id: string; ref: string; category: CivicCategory; description: string; severity: CivicSeverity; status: CivicStatus;
  lat: number; lng: number; address: string | null; wilayaCode: number | null; wilaya: string;
  photoPaths: string[]; photoPublic: boolean; forwardedTo: string | null; forwardedAt: string | null;
  verifiedAt: string | null; resolvedAt: string | null; createdAt: string; supporters: number; confirmations: number; duplicateOf: string | null;
}

type PublicRow = { id: string; ref: string; category: string; description: string; severity: string; status: string; lat: number; lng: number;
  address: string | null; wilaya_code: number | null; photo_paths: string[]; photo_public: boolean; forwarded_to: string | null; forwarded_at: string | null;
  verified_at: string | null; resolved_at: string | null; created_at: string; supporters: number; confirmations: number; duplicate_of: string | null };

export function mapCivic(r: PublicRow): CivicPublic {
  return { id: r.id, ref: r.ref, category: r.category as CivicCategory, description: r.description, severity: r.severity as CivicSeverity,
    status: r.status as CivicStatus, lat: r.lat, lng: r.lng, address: r.address, wilayaCode: r.wilaya_code,
    wilaya: r.wilaya_code ? findWilaya(r.wilaya_code)?.nameAr ?? "" : "", photoPaths: r.photo_paths ?? [], photoPublic: r.photo_public,
    forwardedTo: r.forwarded_to, forwardedAt: r.forwarded_at, verifiedAt: r.verified_at, resolvedAt: r.resolved_at, createdAt: r.created_at,
    supporters: Number(r.supporters ?? 0), confirmations: Number(r.confirmations ?? 0), duplicateOf: r.duplicate_of };
}

const COLS = "id,ref,category,description,severity,status,lat,lng,address,wilaya_code,photo_paths,photo_public,forwarded_to,forwarded_at,verified_at,resolved_at,created_at,supporters,confirmations,duplicate_of";

export async function listPublicCivic(limit = 1000): Promise<CivicPublic[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("civic_public_reports").select(COLS).order("created_at", { ascending: false }).limit(limit);
  return ((data ?? []) as unknown as PublicRow[]).map(mapCivic);
}

/** Signed links, created as the current viewer: storage RLS decides which photos they may see. */
export async function signedCivicUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const supabase = await supabaseServer();
  const { data } = await supabase.storage.from("civic-photos").createSignedUrls(paths, 3600);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string]));
}
