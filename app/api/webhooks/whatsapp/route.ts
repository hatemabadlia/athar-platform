import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { enqueueAndProcess } from "@/lib/server/intake";

export const runtime = "nodejs";

/**
 * WhatsApp Business Cloud API webhook (messages sent TO the organisation's business number).
 * GET = Meta verification handshake; POST = messages, verified with X-Hub-Signature-256 (HMAC of raw body with the app secret).
 */
export async function GET(req: Request) {
  const env = serverEnv();
  const u = new URL(req.url);
  if (env.WHATSAPP_VERIFY_TOKEN && u.searchParams.get("hub.mode") === "subscribe"
      && u.searchParams.get("hub.verify_token") === env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const env = serverEnv();
  if (!env.WHATSAPP_APP_SECRET) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const expected = "sha256=" + createHmac("sha256", env.WHATSAPP_APP_SECRET).update(raw).digest("hex");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  type Msg = { id: string; type: string; text?: { body: string } };
  const body = JSON.parse(raw) as { entry?: { changes?: { value?: { messages?: Msg[] } }[] }[] };
  const messages = body.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];
  for (const m of messages) {
    if (m.type !== "text" || !m.text?.body || m.text.body.trim().length < 20) continue;
    // The sender's number is NOT stored as alert contact unless it appears in the message text.
    await enqueueAndProcess({ channel: "whatsapp", text: m.text.body.slice(0, 5000), externalId: m.id, sourceLabel: "WhatsApp Business" });
  }
  return NextResponse.json({ ok: true });
}
