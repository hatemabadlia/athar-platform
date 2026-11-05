import { supabaseServer } from "@/lib/supabase/server";

/** Right of access: downloads everything the platform holds about the signed-in user. */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return new Response("export failed", { status: 500 });
  return new Response(JSON.stringify({ email: user.email, ...(data as object) }, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="athar-my-data.json"`, "cache-control": "no-store" },
  });
}
