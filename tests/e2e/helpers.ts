import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

/** Loads .env.local for the test process (Next loads it for the app). */
export function env(): Record<string, string> {
  const out: Record<string, string> = { ...process.env } as Record<string, string>;
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !out[m[1]]) out[m[1]] = m[2];
    }
  }
  return out;
}

export function admin() {
  const e = env();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export function anonClient() {
  const e = env();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
}

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

async function latestCode(email: string, after: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const json = (await res.json()) as { messages: { ID: string; Created: string }[] };
    const msg = json.messages?.find((m) => Date.parse(m.Created) >= after - 2000);
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { Text: string; HTML: string };
      const code = (full.Text || full.HTML).match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no OTP email for ${email}`);
}

/** Signs in through the real UI with an emailed OTP (Mailpit catches local mail). */
export async function login(page: Page, email: string, next = "/profile") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("البريد الإلكتروني").fill(email);
  const t = Date.now();
  await page.getByRole("button", { name: "أرسل الرمز" }).click();
  const code = await latestCode(email, t);
  await page.locator("#code").fill(code);
  await page.getByRole("button", { name: "تأكيد" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function ensureUser(email: string): Promise<string> {
  const db = admin();
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const found = data.users.find((u) => u.email === email);
  if (found) return found.id;
  const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  return created.user!.id;
}
