import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses RLS — use ONLY in server code for system work
 * (intake webhooks, AI pipeline, SMS jobs). Never import from a client component.
 */
let client: ReturnType<typeof createClient<Database>> | null = null;
export function supabaseAdmin() {
  if (client) return client;
  const env = serverEnv();
  client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
