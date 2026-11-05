import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/server/guards";
import { getMyProfile } from "@/lib/data/profile";
import { DonationsClient } from "@/components/modules/donations-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "تبرعات عينية" };

export default async function DonationsPage() {
  const viewer = await getViewer();
  const supabase = await supabaseServer();
  const [{ data: items }, { data: matches }, profile] = await Promise.all([
    supabase.from("donation_items").select("id, kind, category, title, description, quantity, unit, wilaya_code, baladiya_name, owner_id, status, created_at")
      .in("status", ["open", "matched"]).order("created_at", { ascending: false }).limit(300),
    viewer ? supabase.from("donation_matches").select("id, offer_id, need_id, quantity, status, pickup_note, proposed_by, created_at").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    viewer ? getMyProfile() : Promise.resolve(null),
  ]);
  return <DonationsClient items={(items ?? []).map((i) => ({ id: i.id, kind: i.kind as "offer" | "need", category: i.category, title: i.title, description: i.description,
    quantity: i.quantity, unit: i.unit, wilayaCode: i.wilaya_code, baladiya: i.baladiya_name, ownerId: i.owner_id, status: i.status, createdAt: i.created_at }))}
    matches={matches ?? []} viewerId={viewer?.id ?? null} defaultWilaya={profile?.wilayaCode ?? 16} />;
}
