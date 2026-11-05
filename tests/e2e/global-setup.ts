import { env } from "./helpers";

/** After `supabase db reset`, PostgREST and Auth restart; wait until both answer before testing. */
export default async function globalSetup() {
  const e = env();
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const [rest, auth] = await Promise.all([
        fetch(`${e.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/wilayas?select=code&limit=1`, { headers: { apikey: e.NEXT_PUBLIC_SUPABASE_ANON_KEY } }),
        fetch(`${e.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, { headers: { apikey: e.NEXT_PUBLIC_SUPABASE_ANON_KEY } }),
      ]);
      if (rest.ok && auth.ok && ((await rest.json()) as unknown[]).length === 1) {
        await new Promise((r) => setTimeout(r, 3000)); // let realtime/storage settle
        return;
      }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Supabase did not become healthy within 90s");
}
