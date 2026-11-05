import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { findWilaya } from "@/lib/wilayas";
import type { TreeView } from "@/lib/types";

type TreeRow = { id: string; user_id: string; wilaya_code: number; place: string; species: string; note: string; lat: number | null; lng: number | null;
  photo_path: string | null; status: "pending" | "approved" | "rejected"; created_at: string; location_check: unknown };

/** Trees with signed photo URLs (1 h), display names and like counts. */
export async function hydrateTrees(rows: TreeRow[], viewerId: string | null): Promise<TreeView[]> {
  if (!rows.length) return [];
  const supabase = await supabaseServer();
  const ids = rows.map((r) => r.id);
  const paths = rows.map((r) => r.photo_path).filter(Boolean) as string[];
  const [{ data: names }, { data: likes }, { data: mine }, signed] = await Promise.all([
    supabase.from("public_profiles").select("id, display_name").in("id", [...new Set(rows.map((r) => r.user_id))]),
    supabase.from("tree_like_counts").select("tree_id, likes").in("tree_id", ids),
    viewerId ? supabase.from("tree_likes").select("tree_id").eq("user_id", viewerId).in("tree_id", ids) : Promise.resolve({ data: [] as { tree_id: string }[] }),
    paths.length ? supabase.storage.from("tree-photos").createSignedUrls(paths, 3600) : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
  ]);
  const nameMap = new Map((names ?? []).map((n) => [n.id as string, n.display_name as string]));
  const likeMap = new Map((likes ?? []).map((l) => [l.tree_id as string, Number(l.likes)]));
  const liked = new Set((mine ?? []).map((l) => l.tree_id));
  const urlMap = new Map((signed.data ?? []).filter((s) => s.path).map((s) => [s.path as string, s.signedUrl]));
  return rows.map((r) => ({
    id: r.id, userName: nameMap.get(r.user_id) ?? "", wilayaCode: r.wilaya_code, wilaya: findWilaya(r.wilaya_code)?.nameAr ?? "",
    place: r.place, species: r.species, note: r.note, lat: r.lat, lng: r.lng,
    photoUrl: r.photo_path ? urlMap.get(r.photo_path) ?? null : null, status: r.status, createdAt: r.created_at,
    likes: likeMap.get(r.id) ?? 0, likedByMe: liked.has(r.id), mine: r.user_id === viewerId,
    locationCheck: (r.location_check ?? {}) as Record<string, unknown>,
  }));
}

export async function listTrees(viewerId: string | null): Promise<TreeView[]> {
  const supabase = await supabaseServer();
  const cols = "id,user_id,wilaya_code,place,species,note,lat,lng,photo_path,status,created_at,location_check";
  const { data: approved } = await supabase.from("trees").select(cols).eq("status", "approved").order("created_at", { ascending: false }).limit(200);
  const { data: mine } = viewerId
    ? await supabase.from("trees").select(cols).eq("user_id", viewerId).neq("status", "approved").order("created_at", { ascending: false })
    : { data: [] };
  return hydrateTrees([...(mine ?? []), ...(approved ?? [])] as TreeRow[], viewerId);
}

export async function listPendingTrees(): Promise<TreeView[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("trees").select("id,user_id,wilaya_code,place,species,note,lat,lng,photo_path,status,created_at,location_check")
    .eq("status", "pending").order("created_at").limit(50);
  return hydrateTrees((data ?? []) as TreeRow[], null);
}
