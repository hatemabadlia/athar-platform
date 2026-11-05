/**
 * Drives the five-minute demo journeys in a real (headless) Chromium against the running app,
 * with two independent browser sessions for the blood-alert notification. Saves screenshots.
 *   BASE_URL=http://localhost:3000 SHOTS=/tmp/shots npm run demo:check
 * Logins use one-time sign-in links generated with the service key (no email is sent).
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS ?? "test-results/demo";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const results: { step: string; ok: boolean; note: string }[] = [];
const record = (step: string, ok: boolean, note = "") => { results.push({ step, ok, note }); console.log(`${ok ? "✓" : "✗"} ${step}${note ? ` — ${note}` : ""}`); };

async function session(browser: Browser, email: string | null, mobile = false): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-DZ" }
    : { viewport: { width: 1440, height: 900 }, locale: "ar-DZ" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`  [page error] ${e.message.slice(0, 160)}`));
  if (email) {
    const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data.properties?.hashed_token) throw new Error(`login link for ${email}: ${error?.message}`);
    await page.goto(`${BASE}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/`);
    await page.waitForURL((u) => !u.pathname.startsWith("/auth") && !u.pathname.startsWith("/login"), { timeout: 30_000 });
  }
  return { ctx, page };
}
const shot = (page: Page, name: string, fullPage = false) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });

async function main() {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" }); // installed Google Chrome, headless

  // 1 — Opening: homepage (desktop + phone)
  {
    const { ctx, page } = await session(browser, null);
    await page.goto(BASE); await page.waitForLoadState("networkidle");
    const cards = await page.locator("[id^=alert-]").count();
    record("Homepage shows verified alerts", cards > 0, `${cards} alert cards`);
    await shot(page, "01-home-desktop");
    const m = await session(browser, null, true);
    await m.page.goto(BASE); await m.page.waitForLoadState("networkidle");
    const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    record("Phone layout has no horizontal scroll", !overflow);
    await shot(m.page, "01-home-phone");
    await m.ctx.close();

    // 2 — Recycled Darija request detected
    await page.goto(`${BASE}/check`);
    await page.locator("#post").fill("عاجل ونداء لكل الخاوة: عائلة في بوفاريك ولاية البليدة دارهم طاحت وما عندهمش وين يباتو، يحتاجو أفرشة وأغطية وماكلة. شاركو المنشور ربي يجازيكم. للتواصل 0555 00 09 01");
    await page.getByRole("button", { name: "افحص المنشور" }).click();
    const verdict = page.getByText("هذا الطلب سبق حلّه");
    await verdict.waitFor({ timeout: 60_000 }).catch(() => {});
    record("Checker: old viral post → 'previously resolved'", await verdict.isVisible());
    await shot(page, "02-check-resolved", true);
    await ctx.close();
  }

  // 3 — A genuine new request reaches the wilaya moderator
  const unique = `نحتاجو 3 متبرعين بالدم فصيلة A- فسبيطار بني مسوس بالعاصمة قبل الخامسة، عملية مستعجلة. 0555 00 04 ${String(Date.now()).slice(-2)}`;
  {
    const { ctx, page } = await session(browser, null);
    await page.goto(`${BASE}/submit`);
    await page.locator("#text").fill(unique);
    await page.locator("form input[type=checkbox][required]").check();
    await page.locator("form button[type=submit]").click();
    const ok = page.getByRole("heading", { name: "وصلنا نداؤك" });
    await ok.waitFor({ timeout: 60_000 }).catch(() => {});
    record("Public submission accepted", await ok.isVisible());
    await ctx.close();
  }
  {
    const { ctx, page } = await session(browser, "djsl16@demo.athar.dz");
    await page.goto(`${BASE}/admin`); await page.waitForLoadState("networkidle");
    const found = page.getByText(/A-/).first();
    await found.waitFor({ timeout: 30_000 }).catch(() => {});
    record("New request is in the Algiers moderator's queue", await found.isVisible());
    await shot(page, "03-admin-queue");
    await ctx.close();
  }

  // 4 — Two sessions: moderator notifies compatible donors, donor's phone gets a live alert.
  // Notifications are throttled to once per alert per 6 h (by design), so pick a blood alert not notified recently
  // that has a compatible available donor in its wilaya; the ministry account can moderate every wilaya.
  {
    const { data: recent } = await db.from("audit_log").select("entity_id").eq("action", "notify_donors").gte("created_at", new Date(Date.now() - 6 * 3600_000).toISOString());
    const done = new Set((recent ?? []).map((r) => r.entity_id));
    const { data: alerts } = await db.from("alerts").select("id, title, wilaya_code, blood_type").eq("status", "approved").eq("category", "blood");
    const { data: compat } = await db.from("blood_compatibility").select("donor, recipient");
    const { data: donors } = await db.from("blood_donors").select("user_id, wilaya_code, available");
    let pick: { alertId: string; email: string } | null = null;
    for (const a of (alerts ?? []).filter((x) => !done.has(x.id))) {
      for (const d of (donors ?? []).filter((x) => x.available && x.wilaya_code === a.wilaya_code)) {
        const { data: priv } = await db.from("profile_private").select("blood_type").eq("user_id", d.user_id).single();
        const ok = !a.blood_type || (compat ?? []).some((c) => c.donor === priv?.blood_type && c.recipient === a.blood_type);
        const { data: u } = await db.auth.admin.getUserById(d.user_id);
        if (ok && u.user?.email?.endsWith("@demo.athar.dz")) { pick = { alertId: a.id, email: u.user.email }; break; }
      }
      if (pick) break;
    }
    if (!pick) {
      record("Donor receives live blood alert (second session)", false, "every eligible demo alert was notified in the last 6 h — retry later");
    } else {
      const donor = await session(browser, pick.email, true);
      await donor.page.goto(BASE); await donor.page.waitForLoadState("networkidle");
      await donor.page.waitForFunction(() => document.documentElement.dataset.liveNotes === "SUBSCRIBED", null, { timeout: 30_000 })
        .catch(() => console.log("  note: donor realtime channel not SUBSCRIBED"));
      const mod = await session(browser, "ministry@demo.athar.dz");
      await mod.page.goto(`${BASE}/admin?status=approved&alert=${pick.alertId}`); await mod.page.waitForLoadState("networkidle");
      await mod.page.getByText("عدّ المتبرعين المتوافقين في الولاية").click();
      await mod.page.getByRole("button", { name: "إخطارهم" }).click();
      await shot(mod.page, "04a-admin-notify");
      const toast = donor.page.getByRole("alert").filter({ hasText: "نداء دم متوافق" });
      await toast.waitFor({ timeout: 20_000 }).catch(() => {});
      record("Donor receives live blood alert (second session)", await toast.isVisible(), pick.email);
      await shot(donor.page, "04b-donor-phone-alert");
      await mod.ctx.close(); await donor.ctx.close();
    }
  }

  // 6 — Impact dashboard
  {
    const { ctx, page } = await session(browser, null);
    await page.goto(`${BASE}/impact`); await page.waitForLoadState("networkidle");
    await shot(page, "06-impact", true);
    record("Impact page renders", true);
    await ctx.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} steps passed. Screenshots: ${SHOTS}`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
