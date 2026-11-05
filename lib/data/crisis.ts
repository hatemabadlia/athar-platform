import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { findWilaya } from "@/lib/wilayas";
import type { CrisisView, ShelterView } from "@/lib/types";

export async function activeCrises(): Promise<CrisisView[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("crises").select("id,type,wilaya_code,title,started_at").eq("status", "active").order("started_at", { ascending: false });
  return (data ?? []).map((c) => ({ id: c.id, type: c.type, wilayaCode: c.wilaya_code, wilaya: findWilaya(c.wilaya_code)?.nameAr ?? String(c.wilaya_code), title: c.title, startedAt: c.started_at }));
}

export async function listShelters(wilayas?: number[], openOnly = false): Promise<ShelterView[]> {
  const supabase = await supabaseServer();
  let q = supabase.from("shelters").select("*").order("name");
  if (wilayas) q = q.in("wilaya_code", wilayas.length ? wilayas : [-1]);
  if (openOnly) q = q.eq("is_open", true);
  const { data } = await q;
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, wilayaCode: s.wilaya_code, lat: s.lat, lng: s.lng, capacity: s.capacity,
    occupied: s.occupied, needs: s.needs, phone: s.phone, isOpen: s.is_open, updatedAt: s.updated_at }));
}
