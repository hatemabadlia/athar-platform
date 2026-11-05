import { listPublicAlerts } from "@/lib/data/alerts";
import { listShelters } from "@/lib/data/crisis";
import { supabaseServer } from "@/lib/supabase/server";
import { findWilaya } from "@/lib/wilayas";
import { MapExplorer } from "./map-explorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "خريطة إيثار", description: "كل ما يحدث على إيثار في خريطة واحدة: النداءات الموثّقة، طلبات المهارات، الأشجار، النوادي ومراكز الإيواء." };

export default async function MapPage() {
  const supabase = await supabaseServer();
  const [alerts, shelters, { data: trees }, { data: clubs }, { data: stats }] = await Promise.all([
    listPublicAlerts(),
    listShelters(undefined, true),
    supabase.from("trees").select("id, species, place, wilaya_code, lat, lng").eq("status", "approved").not("lat", "is", null).limit(1000),
    supabase.from("clubs").select("id, name, wilaya_code").eq("status", "approved").limit(500),
    supabase.from("club_stats").select("club_id, members, points"),
  ]);
  const s = new Map((stats ?? []).map((x) => [x.club_id as string, x]));
  return (
    <MapExplorer
      alerts={alerts}
      shelters={shelters}
      trees={(trees ?? []).map((t) => ({ id: t.id, species: t.species, place: t.place, wilaya: findWilaya(t.wilaya_code)?.nameAr ?? "", lat: t.lat!, lng: t.lng! }))}
      clubs={(clubs ?? []).flatMap((c) => {
        const w = findWilaya(c.wilaya_code);
        return w ? [{ id: c.id, name: c.name, wilaya: w.nameAr, lat: w.lat, lng: w.lng, members: Number(s.get(c.id)?.members ?? 0), points: Number(s.get(c.id)?.points ?? 0) }] : [];
      })}
    />
  );
}
