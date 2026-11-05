/**
 * صوّر وبلّغ end-to-end in real Chrome against the running app:
 * citizen A reports a pothole (photo → AI → GPS → submit) · citizen B uploads the same photo nearby → duplicate prompt →
 * supports A's report · Algiers moderator verifies, publishes the photo, forwards with authority, resolves with evidence ·
 * public map / details show it · A is notified. Plus API guard checks. Demo accounts only (@demo.athar.dz).
 *   PHOTOS=/path/to/dir npm run civic:check   (dir with pothole.jpg)
 */
import { chromium, type Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PHOTO = join(process.env.PHOTOS ?? "test-results", "pothole.jpg");
const SHOTS = process.env.SHOTS ?? "test-results/civic";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const results: { step: string; ok: boolean; note?: string }[] = [];
const rec = (step: string, ok: boolean, note = "") => { results.push({ step, ok, note }); console.log(`${ok ? "✓" : "✗"} ${step}${note ? ` — ${note}` : ""}`); };
const SPOT = { latitude: 36.7215, longitude: 3.1830 }; // Bab Ezzouar, Algiers

async function session(browser: Browser, email: string | null, mobile = true) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 900 }, isMobile: mobile, hasTouch: mobile, locale: "ar-DZ",
    geolocation: SPOT, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`  [page error] ${e.message.slice(0, 140)}`));
  if (email) {
    const { data } = await db.auth.admin.generateLink({ type: "magiclink", email });
    await page.goto(`${BASE}/auth/callback?token_hash=${data.properties!.hashed_token}&type=magiclink&next=/`);
    await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 30_000 });
  }
  return { ctx, page };
}

async function report(browser: Browser, email: string, shot: string) {
  const { ctx, page } = await session(browser, email);
  await page.goto(`${BASE}/civic/new`); await page.waitForLoadState("networkidle");
  await page.locator('input[type=file][multiple]').setInputFiles(PHOTO);
  const t0 = Date.now();
  const suggestion = page.getByText(/اقتراح آلي/);
  await Promise.race([suggestion.waitFor({ timeout: 35_000 }), page.getByText(/التحليل الآلي غير متاح/).waitFor({ timeout: 35_000 })]).catch(() => {});
  const aiOk = await suggestion.isVisible();
  const picked = await page.locator('[role=radio][aria-checked=true]').textContent().catch(() => null);
  const desc = await page.locator("#desc").inputValue();
  if (!picked) await page.getByRole("radio", { name: /طريق متضرر/ }).click();
  if (desc.trim().length < 3) await page.locator("#desc").fill("حفرة كبيرة في الطريق");
  await page.getByRole("button", { name: /استعمل موقعي الحالي/ }).click();
  await page.getByText(/تم \(دقة/).waitFor({ timeout: 20_000 }).catch(() => {});
  // the form is complete once the submit button is enabled (photo + category + description + location)
  await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === "بلّغ"); return !!b && !(b as HTMLButtonElement).disabled; }, null, { timeout: 30_000 }).catch(() => {});
  await page.screenshot({ path: `${SHOTS}/${shot}-form.png`, fullPage: true });
  return { ctx, page, aiOk, aiMs: Date.now() - t0, picked: picked?.trim() ?? null };
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome" });

  // test hygiene: remove reports this script created on earlier runs (demo test accounts only)
  const { data: all } = await db.auth.admin.listUsers({ perPage: 1000 });
  const testers = all.users.filter((u) => ["yacine@demo.athar.dz", "walid@demo.athar.dz"].includes(u.email ?? "")).map((u) => u.id);
  await db.from("civic_reports").delete().in("reporter_id", testers);

  // API guards
  const unauth = await fetch(`${BASE}/api/civic/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: "data:image/jpeg;base64,AAAA" }) });
  rec("AI endpoint refuses anonymous callers", unauth.status === 401, String(unauth.status));

  // 1 — citizen A reports
  const a = await report(browser, "yacine@demo.athar.dz", "civic-1");
  rec("AI vision suggested a category from the photo", a.aiOk, `${a.picked ?? "—"} in ${a.aiMs} ms`);
  await a.page.getByRole("button", { name: /^بلّغ$/ }).click();
  const okA = a.page.getByText("وصل بلاغك، شكراً!");
  // A previous run may have left a report here → duplicate prompt; send anyway for this test
  await Promise.race([okA.waitFor({ timeout: 60_000 }), a.page.getByRole("button", { name: /مشكل مختلف/ }).click({ timeout: 60_000 }).then(() => okA.waitFor({ timeout: 60_000 }))]).catch(() => {});
  const refA = (await a.page.locator("span.font-mono").first().textContent().catch(() => ""))?.trim() ?? "";
  rec("Citizen A's report submitted with a reference", /^SWB-\d{4}-[0-9A-F]{5}$/.test(refA), refA);
  await a.page.screenshot({ path: `${SHOTS}/civic-2-confirmation.png` });

  // 2 — citizen B, same photo, 15 m away → duplicate prompt → support
  const b = await report(browser, "walid@demo.athar.dz", "civic-3");
  await b.ctx.setGeolocation({ latitude: SPOT.latitude + 0.0001, longitude: SPOT.longitude + 0.0001 });
  await b.page.getByRole("button", { name: /^بلّغ$/ }).click();
  const dup = b.page.getByText("وجدنا بلاغاً مشابهاً قرب هذا الموقع");
  await dup.waitFor({ timeout: 30_000 }).catch(() => {});
  rec("Duplicate detected for the same problem nearby", await dup.isVisible());
  await b.page.screenshot({ path: `${SHOTS}/civic-4-duplicate.png`, fullPage: true });
  const supportBtn = b.page.getByRole("button", { name: /أدعم هذا البلاغ/ }).first();
  if (await supportBtn.isVisible().catch(() => false)) { await supportBtn.click(); await b.page.getByText("سُجّل دعمك").waitFor({ timeout: 15_000 }).catch(() => {}); }
  rec("Citizen B supported the existing report instead of duplicating", await b.page.getByText("سُجّل دعمك").isVisible().catch(() => false));
  await b.ctx.close();

  // 3 — moderator workflow
  const { data: row } = await db.from("civic_reports").select("id, status, wilaya_code, signals").eq("ref", refA).single();
  rec("Report scoped to wilaya 16 and pending review", row?.wilaya_code === 16 && row?.status === "pending_review");
  const m = await session(browser, "djsl16@demo.athar.dz", false);
  await m.page.goto(`${BASE}/admin?tab=civic`);
  await m.page.getByText(refA).first().click();
  const dialog = m.page.getByRole("dialog");
  await dialog.getByRole("button", { name: "تحقّق منه مشرف", exact: true }).click();
  await m.page.getByText("الحالة الآن: تحقّق منه مشرف").waitFor({ timeout: 20_000 }).catch(() => {});
  rec("Moderator verified the report", await m.page.getByText("الحالة الآن: تحقّق منه مشرف").isVisible().catch(() => false));
  await m.page.getByRole("dialog").getByRole("button", { name: "السماح بالنشر" }).click();
  await m.page.getByText("ستُنشر الصورة مع البلاغ").waitFor({ timeout: 15_000 }).catch(() => {});
  await m.page.reload(); await m.page.getByText(refA).first().click();
  await m.page.getByRole("dialog").getByRole("button", { name: "أُحيل إلى جهة مسؤولة", exact: true }).click();
  const refused = await m.page.getByText(/حدّد الجهة/).waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
  rec("'Forwarded' refused without naming the authority", refused);
  await m.page.getByLabel("الجهة").fill("بلدية باب الزوار — مراسلة تجريبية (عرض)");
  await m.page.getByRole("dialog").getByRole("button", { name: "أُحيل إلى جهة مسؤولة", exact: true }).click();
  await m.page.getByText("الحالة الآن: أُحيل إلى جهة مسؤولة").waitFor({ timeout: 15_000 }).catch(() => {});
  await m.page.screenshot({ path: `${SHOTS}/civic-5-moderator.png`, fullPage: true });
  await m.page.reload(); await m.page.getByText(refA).first().click();
  await m.page.getByRole("dialog").getByRole("button", { name: "حُلّ", exact: true }).click();
  await m.page.getByText("الحالة الآن: حُلّ").waitFor({ timeout: 15_000 }).catch(() => {});
  await m.page.getByLabel("دليل الإصلاح").fill("رُدمت الحفرة (بيانات تجريبية للعرض)");
  await m.page.getByRole("button", { name: "إضافة الدليل" }).click();
  await m.page.getByText("أُضيف دليل الإصلاح").waitFor({ timeout: 15_000 }).catch(() => {});
  const { data: after } = await db.from("civic_reports").select("status, photo_public, forwarded_to, resolved_at").eq("ref", refA).single();
  rec("Workflow stored: resolved, photo public, forwarding recorded", after?.status === "resolved" && after.photo_public && !!after.forwarded_to && !!after.resolved_at);
  const { count: hist } = await db.from("civic_report_events").select("*", { count: "exact", head: true }).eq("report_id", row!.id);
  rec("History log has every step", (hist ?? 0) >= 5, `${hist} events`);
  await m.ctx.close();

  // 4 — public views + notification
  const p = await session(browser, null, false);
  await p.page.goto(`${BASE}/civic/r/${refA}`);
  await p.page.getByText("مسار البلاغ").waitFor({ timeout: 30_000 }).catch(() => {});
  const photoVisible = await p.page.locator('img[alt^="صورة البلاغ"]').first().waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
  rec("Public details page shows the report, photo and timeline", photoVisible && await p.page.getByText("دليل الإصلاح").first().isVisible().catch(() => false));
  await p.page.screenshot({ path: `${SHOTS}/civic-6-public-details.png`, fullPage: true });
  await p.page.goto(`${BASE}/civic/map`); await p.page.waitForTimeout(3500);
  rec("Report appears on the public map", (await p.page.locator(".leaflet-marker-icon").count()) > 0);
  await p.page.screenshot({ path: `${SHOTS}/civic-7-map.png` });
  await p.ctx.close();
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const yid = users.users.find((u) => u.email === "yacine@demo.athar.dz")!.id;
  const { count: notes } = await db.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", yid).eq("kind", "civic_update").like("title", `%${refA}%`);
  rec("Reporter received status notifications", (notes ?? 0) >= 3, `${notes}`);
  await a.ctx.close();

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} civic steps passed`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
