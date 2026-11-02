/**
 * Creates fictional demo content THROUGH THE REAL UI and captures screenshots for the pitch deck.
 * Phone numbers are dummy (0555 00 00 0x). Run on a fresh local DB with the app on :3000:
 *   npx playwright test -c presentation/build/pw.config.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { admin, ensureUser, login } from "../../tests/e2e/helpers";

const OUT = "presentation/ASSETS/screens";
const ADMIN = "admin@demo.local", VOL = "volunteer@demo.local", ASSOC = "assoc@demo.local";

async function submit(page: Page, text: string) {
  await page.goto("/submit");
  await page.getByLabel("نص النداء *").fill(text);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "إرسال للمراجعة" }).click();
  await expect(page.getByText("وصلنا نداؤك")).toBeVisible();
}

test("capture", async ({ browser }) => {
  test.setTimeout(300_000);
  const db = admin();
  const ctx = () => browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "ar-DZ" });

  // 1) public submissions (anonymous)
  const anon = await (await ctx()).newPage();
  const ALERTS = [
    "عائلة في المدية تحتاج أغطية وملابس شتوية لخمسة أطفال، البرد شديد هذه الأيام. للتواصل 0555 00 00 02",
    "حملة تنظيف شاطئ في بومرداس يوم السبت على الساعة 9:00، نحتاج 20 متطوع. للتسجيل 0555 00 00 03",
    "نحتاج أساتذة متطوعين للدعم المدرسي في وهران لتلاميذ البكالوريا نهاية الأسبوع. 0555 00 00 04",
    "عاجل: مطلوب متبرعين بالدم فصيلة A+ بمستشفى تبسة لمريض في العناية المركزة قبل 17:00. 0555 00 00 01",
  ];
  for (const t of ALERTS) await submit(anon, t);
  await anon.goto("/submit");
  await anon.getByLabel("نص النداء *").fill("خاوتي راهم يحتاجو دم فصيلة O- فسبيطار سطيف، اللي يقدر يجي قبل الخمسة يتصل 0555 00 00 05");
  await anon.screenshot({ path: `${OUT}/submit.png` });

  // 2) admin approves through the moderation UI
  const adminId = await ensureUser(ADMIN);
  await db.from("profiles").update({ display_name: "مشرف تجريبي" }).eq("id", adminId);
  await db.from("user_roles").upsert({ user_id: adminId, role: "ministry_admin" });
  const mod = await (await ctx()).newPage();
  await login(mod, ADMIN, "/admin");
  const { data: pending } = await db.from("alerts").select("id, title").eq("status", "pending").order("created_at");
  let first = true;
  for (const a of pending ?? []) {
    await mod.goto(`/admin?tab=queue&status=pending&alert=${a.id}`);
    await expect(mod.getByRole("button", { name: "اعتماد ونشر" })).toBeVisible();
    if (first && a.title.includes("دم")) { await mod.screenshot({ path: `${OUT}/moderation.png` }); first = false; }
    await mod.getByRole("button", { name: "اعتماد ونشر" }).click();
    await expect.poll(async () => (await db.from("alerts").select("status").eq("id", a.id).single()).data?.status).toBe("approved");
  }
  if (first) { await mod.goto("/admin?tab=queue&status=approved"); await mod.screenshot({ path: `${OUT}/moderation.png` }); }

  // 3) AI pipeline on a Darija message (moderator paste) + duplicate detection
  await mod.goto("/ingest");
  await mod.getByLabel("لصق منشور اطّلعت عليه (مع رابطه إن وجد)").fill("خاوتي راهم يحتاجو دم فصيلة O- فسبيطار سطيف، اللي يقدر يجي قبل الخمسة يتصل 0555 00 00 05، عافاكم شاركو");
  await mod.getByRole("button", { name: /تشغيل المعالجة/ }).click();
  await expect(mod.getByText("لماذا هذه الدرجة؟")).toBeVisible({ timeout: 30_000 });
  await mod.locator("#pipeline").screenshot({ path: `${OUT}/pipeline.png` });
  await mod.getByLabel("لصق منشور اطّلعت عليه (مع رابطه إن وجد)").fill("عاجل: مطلوب متبرعين بالدم فصيلة A+ بمستشفى تبسة لمريض في العناية المركزة قبل 17:00. 0555 00 00 01 انشروا");
  await mod.getByRole("button", { name: /تشغيل المعالجة/ }).click();
  await expect(mod.getByText("لماذا هذه الدرجة؟")).toBeVisible({ timeout: 30_000 });
  await mod.locator("#pipeline").screenshot({ path: `${OUT}/duplicate.png` });
  await mod.goto("/ingest");
  await mod.locator("section").first().screenshot({ path: `${OUT}/intake-queue.png` });

  // 4) volunteer: profile, matching, join, QR
  await ensureUser(VOL);
  const vol = await (await ctx()).newPage();
  await login(vol, VOL, "/profile");
  await vol.getByLabel("الاسم الظاهر *").fill("أمينة (متطوعة تجريبية)");
  await vol.getByLabel("الولاية *").selectOption("12");
  await vol.getByRole("button", { name: "O-", exact: true }).click();
  await vol.getByText("أوافق على حفظ فصيلة دمي").click();
  await vol.getByRole("button", { name: "إسعافات أولية" }).click();
  await vol.getByRole("button", { name: "حفظ" }).click();
  await expect(vol.getByText("نداءات مناسبة لك")).toBeVisible();
  await vol.screenshot({ path: `${OUT}/profile.png` });
  await vol.goto("/");
  await vol.waitForTimeout(1500);
  await vol.locator("aside").screenshot({ path: `${OUT}/alerts-list.png` });
  await vol.locator("section").first().screenshot({ path: `${OUT}/hero.png` });

  // 5) association → verification → campaign with real progress rows
  await ensureUser(ASSOC);
  const as = await (await ctx()).newPage();
  await login(as, ASSOC, "/associations");
  await as.goto("/associations");
  await as.getByRole("button", { name: "تقديم طلب اعتماد جمعية" }).click();
  await as.getByLabel("اسم الجمعية *").fill("جمعية تجريبية للتضامن");
  await as.getByLabel("رقم الاعتماد *").fill("DEMO-12-001");
  await as.getByLabel("الولاية").selectOption("12");
  await as.locator('input[type="file"]').setInputFiles({ name: "agrement.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%demo\n") });
  await as.getByRole("button", { name: "إرسال" }).click();
  await expect(as.getByText("أُرسل الطلب")).toBeVisible();
  await mod.goto("/admin?tab=associations");
  await mod.getByRole("button", { name: "اعتماد", exact: true }).first().click();
  await expect(mod.getByText("اعتُمدت")).toBeVisible();
  await as.goto("/campaigns");
  await as.getByRole("button", { name: "حملة جديدة" }).click();
  await as.getByLabel("العنوان *").fill("قفة رمضان — حملة تجريبية");
  await as.getByLabel("الهدف *").fill("120");
  await as.getByLabel("البداية *").fill("2027-02-01");
  await as.getByLabel("النهاية *").fill("2027-03-15");
  await as.getByRole("button", { name: "إنشاء" }).click();
  await expect(as).toHaveURL(/\/campaigns\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await as.getByLabel(/مُوزّعة\/مجمّعة/).fill("45");
  await as.getByRole("button", { name: "تسجيل", exact: true }).click();
  await expect(as.getByText("سُجّل التقدّم")).toBeVisible();
  await as.getByLabel("المعرّف").fill("0555 00 00 09");
  await as.getByRole("button", { name: "فحص وتسجيل" }).click();
  await expect(as.getByText("✓ سُجّلت الأسرة")).toBeVisible();
  await as.getByLabel("المعرّف").fill("+213 555 00 00 09");
  await as.getByRole("button", { name: "فحص وتسجيل" }).click();
  await expect(as.getByText("مسجّلة مسبقاً في هذه الحملة")).toBeVisible();
  await as.reload();
  await as.screenshot({ path: `${OUT}/campaign.png` });

  // 6) donors + impact
  await vol.goto("/donors");
  await vol.screenshot({ path: `${OUT}/donors.png` });
  await anon.goto("/impact");
  await anon.screenshot({ path: `${OUT}/impact.png` });
  await vol.goto("/profile");
  await vol.getByRole("heading", { name: /بطاقة الحضور/ }).locator("..").screenshot({ path: `${OUT}/qr-card.png` });
});
