import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { enqueueAndProcess } from "@/lib/server/intake";

export const runtime = "nodejs";

/**
 * Telegram Bot API webhook. Register with:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE>/api/webhooks/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 * Telegram sends the secret in the X-Telegram-Bot-Api-Secret-Token header.
 * Only messages sent to the bot (private chats or groups that added it) are received — no scraping.
 */
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(req: Request) {
  const env = serverEnv();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const secret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(secret, env.TELEGRAM_WEBHOOK_SECRET)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const update = (await req.json().catch(() => null)) as {
    message?: { message_id: number; text?: string; caption?: string; chat: { id: number; title?: string; type: string } };
  } | null;
  const msg = update?.message;
  const text = msg?.text ?? msg?.caption;
  if (!msg || !text || text.startsWith("/")) return NextResponse.json({ ok: true });
  if (text.trim().length < 20) return NextResponse.json({ ok: true });

  const r = await enqueueAndProcess({
    channel: "telegram", text: text.slice(0, 5000), externalId: `${msg.chat.id}:${msg.message_id}`,
    sourceLabel: msg.chat.title ?? `telegram:${msg.chat.type}`,
  });

  if (msg.chat.type === "private" && !r.duplicate) {
    // Best-effort acknowledgement; failure does not affect intake.
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: msg.chat.id, reply_to_message_id: msg.message_id,
        text: "وصلنا نداؤك ✅ سيراجعه مشرف قبل نشره على منصة إيثار." }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
