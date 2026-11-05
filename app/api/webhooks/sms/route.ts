import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isConfirmation, verifyTwilioSignature } from "@/lib/sms";
import { normalizePhone } from "@/lib/pipeline/text";

export const runtime = "nodejs";

/**
 * Inbound SMS ("reply 1"). Twilio posts form data signed with X-Twilio-Signature.
 * Other gateways can call it with header x-athar-secret = SMS_WEBHOOK_SECRET and JSON {from, body}.
 */
export async function POST(req: Request) {
  const env = serverEnv();
  let from = "", body = "", providerId: string | null = null;
  const ctype = req.headers.get("content-type") ?? "";
  if (ctype.includes("application/x-www-form-urlencoded")) {
    if (!env.TWILIO_AUTH_TOKEN) return NextResponse.json({ error: "not configured" }, { status: 503 });
    const params = Object.fromEntries(new URLSearchParams(await req.text())) as Record<string, string>;
    const url = `${env.NEXT_PUBLIC_SITE_URL}/api/webhooks/sms`;
    if (!verifyTwilioSignature(url, params, req.headers.get("x-twilio-signature") ?? "", env.TWILIO_AUTH_TOKEN)) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 });
    }
    from = params.From ?? ""; body = params.Body ?? ""; providerId = params.MessageSid ?? null;
  } else {
    if (!env.SMS_WEBHOOK_SECRET || req.headers.get("x-athar-secret") !== env.SMS_WEBHOOK_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const j = (await req.json().catch(() => ({}))) as { from?: string; body?: string; id?: string };
    from = j.from ?? ""; body = j.body ?? ""; providerId = j.id ?? null;
  }
  const phone = normalizePhone(from);
  if (!phone) return NextResponse.json({ ok: true });
  const db = supabaseAdmin();
  const { data: owner } = await db.from("profile_private").select("user_id").eq("phone", phone).maybeSingle();
  const { data: profile } = owner ? await db.from("profiles").select("wilaya_code").eq("id", owner.user_id).single() : { data: null };
  const { data: crisis } = profile?.wilaya_code
    ? await db.from("crises").select("id").eq("status", "active").eq("wilaya_code", profile.wilaya_code).maybeSingle()
    : { data: null };
  await db.from("sms_messages").insert({ crisis_id: crisis?.id ?? null, user_id: owner?.user_id ?? null, direction: "inbound", phone,
    body: body.slice(0, 500), provider: ctype.includes("urlencoded") ? "twilio" : "gateway", provider_id: providerId, status: "received" });
  if (crisis && owner && isConfirmation(body)) {
    await db.from("crisis_confirmations").upsert({ crisis_id: crisis.id, user_id: owner.user_id, via: "sms" }, { onConflict: "crisis_id,user_id", ignoreDuplicates: true });
  }
  return new Response("<Response></Response>", { headers: { "content-type": "text/xml" } });
}
