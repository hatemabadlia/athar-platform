import "server-only";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { sha256 } from "@/lib/pipeline/hash";

export async function clientIpKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return sha256(`ip:${ip}`).slice(0, 32); // never store raw IPs
}

/** Fixed-window rate limit backed by Postgres. Returns true if the request is allowed. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("rate_limit_hit", { k: key, max_hits: max, window_seconds: windowSeconds });
  if (error) {
    console.error("rate limit check failed", error.message);
    return false; // fail closed
  }
  return data === true;
}

/**
 * Cloudflare Turnstile verification. When not configured (development), returns
 * { ok: true, skipped: true } so the form works locally; production must configure it.
 */
export async function verifyTurnstile(token: string | null | undefined): Promise<{ ok: boolean; skipped?: boolean }> {
  const secret = serverEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: process.env.NODE_ENV !== "production", skipped: true };
  if (!token) return { ok: false };
  const body = new URLSearchParams({ secret, response: token });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean };
  return { ok: json.success === true };
}

export type Role = "volunteer" | "club_lead" | "association" | "moderator" | "djsl_admin" | "ministry_admin";

export interface Viewer {
  id: string;
  email: string | null;
  roles: { role: Role; wilaya_code: number | null }[];
  isStaff: boolean;
  isMinistry: boolean;
  scope: number[]; // wilayas the viewer moderates (empty for ministry = all)
}

/** Current user + roles as read from the database (never from the client). */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roles } = await supabase.from("user_roles").select("role, wilaya_code").eq("user_id", user.id);
  const list = (roles ?? []) as Viewer["roles"];
  const isMinistry = list.some((r) => r.role === "ministry_admin");
  const scope = list.filter((r) => r.role === "moderator" || r.role === "djsl_admin").map((r) => r.wilaya_code!).filter(Boolean);
  return { id: user.id, email: user.email ?? null, roles: list, isMinistry, isStaff: isMinistry || scope.length > 0, scope };
}
