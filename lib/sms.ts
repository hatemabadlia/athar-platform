import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

export interface SmsResult { providerId: string | null; status: "sent" | "failed" | "queued"; error?: string }
export interface SmsProvider { readonly name: string; readonly real: boolean; send(to: string, body: string): Promise<SmsResult> }

/** Development provider: records the message, sends nothing. */
class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";
  readonly real = false;
  async send(to: string, body: string): Promise<SmsResult> {
    console.info(`[sms:console] to=${to.slice(0, 4)}****** len=${body.length}`);
    return { providerId: `console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, status: "sent" };
  }
}

/** Twilio Programmable Messaging (REST). Used only when SMS_PROVIDER=twilio and credentials are set. */
class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";
  readonly real = true;
  constructor(private sid: string, private token: string, private from: string) {}
  async send(to: string, body: string): Promise<SmsResult> {
    const e164 = to.startsWith("0") ? `+213${to.slice(1)}` : to;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`, {
      method: "POST",
      headers: { authorization: "Basic " + Buffer.from(`${this.sid}:${this.token}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: e164, From: this.from, Body: body }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) return { providerId: null, status: "failed", error: json.message ?? `HTTP ${res.status}` };
    return { providerId: json.sid ?? null, status: "queued" };
  }
}

export function smsProvider(): SmsProvider {
  const e = serverEnv();
  if (e.SMS_PROVIDER === "twilio" && e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && e.TWILIO_FROM_NUMBER) {
    return new TwilioSmsProvider(e.TWILIO_ACCOUNT_SID, e.TWILIO_AUTH_TOKEN, e.TWILIO_FROM_NUMBER);
  }
  return new ConsoleSmsProvider();
}

/** Twilio request signature: base64(HMAC-SHA1(authToken, url + sorted(key+value))). */
export function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string, authToken: string): boolean {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "1", "١", "نعم", "oui", "yes" → availability confirmation. */
export function isConfirmation(body: string): boolean {
  return /^\s*(1|١|نعم|oui|yes|ok)\s*[.!]?\s*$/i.test(body);
}
