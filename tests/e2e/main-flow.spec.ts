import { test, expect } from "@playwright/test";
import { admin, anonClient, ensureUser, login } from "./helpers";

/**
 * Critical journey on a real local stack:
 * submit → pipeline → moderator approves → public map → volunteer joins (sees phone)
 * → club activity → QR check-in by lead → points exactly once → impact stats.
 */
const RUN = Date.now().toString(36);
const MOD = `mod-${RUN}@e2e.test`, VOL = `vol-${RUN}@e2e.test`, LEAD = `lead-${RUN}@e2e.test`;
const TEXT = `نداء عاجل للتبرع بالدم فصيلة O+ بمستشفى مصطفى باشا بالعاصمة لمريض يخضع لعملية جراحية، التوجه قبل 18:00. للتواصل 0555 44 ${RUN.slice(-2).replace(/\D/g, "1").padStart(2, "1")} 66 رقم ${RUN}`;

test.describe.configure({ mode: "serial" });

test("empty database renders honest empty states", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("الاحتياج الحقيقي، في وقته الحقيقي.")).toBeVisible();
  await page.goto("/impact");
  await expect(page.getByRole("heading", { name: /شفافية الأثر/ })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByText(/للمشرفين فقط/)).toBeVisible();
});

test("submit → moderate → join → QR check-in → points once", async ({ browser }) => {
  // --- 1. anonymous submission
  const anon = await browser.newPage();
  await anon.goto("/submit");
  await anon.getByLabel("نص النداء *").fill(TEXT);
  await anon.getByRole("checkbox").check();
  await anon.getByRole("button", { name: "إرسال للمراجعة" }).click();
  await expect(anon.getByText("وصلنا نداؤك")).toBeVisible();

  const db = admin();
  const { data: item } = await db.from("intake_items").select("id, status, alert_id").eq("raw_text", TEXT).single();
  expect(item?.status).toBe("processed");
  expect(item?.alert_id).toBeTruthy();
  const { data: alertRow } = await db.from("alerts").select("status, category, blood_type, wilaya_code, ai_mode").eq("id", item!.alert_id!).single();
  expect(alertRow).toMatchObject({ status: "pending", category: "blood", blood_type: "O+", wilaya_code: 16 });
  const { count: aiRuns } = await db.from("ai_runs").select("*", { count: "exact", head: true }).eq("intake_item_id", item!.id);
  expect(aiRuns).toBeGreaterThan(0);

  // pending alert is NOT public: RLS hides it from the anonymous API and the map
  const { data: asAnon } = await anonClient().from("alerts").select("id").eq("id", item!.alert_id!);
  expect(asAnon).toEqual([]);
  await anon.goto("/");
  await expect(anon.getByText("لا توجد نداءات معتمدة حالياً")).toBeVisible();

  // --- 2. moderator approves
  const modId = await ensureUser(MOD);
  await db.from("user_roles").upsert({ user_id: modId, role: "moderator", wilaya_code: 16 });
  const mod = await browser.newPage();
  await login(mod, MOD, "/admin");
  await mod.goto(`/admin?tab=queue&status=pending&alert=${item!.alert_id}`);
  await expect(mod.getByText(TEXT.slice(0, 30))).toBeVisible();
  await mod.getByRole("button", { name: "اعتماد ونشر" }).click();
  await expect.poll(async () => (await db.from("alerts").select("status").eq("id", item!.alert_id!).single()).data?.status).toBe("approved");

  // --- 3. volunteer finds it and joins
  await ensureUser(VOL);
  const vol = await browser.newPage();
  await login(vol, VOL, "/profile");
  await vol.getByLabel("الاسم الظاهر *").fill("متطوع تجريبي");
  await vol.getByRole("button", { name: "حفظ" }).click();
  await vol.goto("/");
  const card = vol.locator("aside").getByRole("button", { name: /أستطيع المساعدة/ }).first();
  await card.click();
  await vol.getByRole("checkbox").check();
  await vol.getByRole("button", { name: /تأكيد المشاركة/ }).click();
  await expect(vol.getByText("تم تسجيل مشاركتك")).toBeVisible();
  await expect(vol.locator('a[href^="tel:"]')).toBeVisible();

  // --- 4. club lead runs an activity and checks the volunteer in
  await ensureUser(LEAD);
  const lead = await browser.newPage();
  await login(lead, LEAD, "/profile");
  await lead.getByLabel("الاسم الظاهر *").fill("مسؤول نادٍ");
  await lead.getByRole("button", { name: "حفظ" }).click();
  await lead.goto("/clubs");
  await lead.getByRole("button", { name: /تأسيس نادٍ/ }).click();
  await lead.getByLabel("اسم النادي *").fill(`نادي الاختبار ${RUN}`);
  await lead.getByRole("button", { name: /تأسيس \(ستصبح/ }).click();
  await lead.getByRole("button", { name: /نشاط جديد/ }).click();
  await lead.getByLabel("العنوان *").fill("حملة تبرع بالدم");
  await lead.getByLabel("التاريخ والساعة *").fill("2026-11-01T10:00");
  await lead.getByRole("button", { name: "إنشاء" }).click();
  await lead.getByRole("button", { name: "تسجيل الحضور" }).click();

  await vol.goto("/profile");
  await vol.getByText("عرض الرمز كنص (بدون كاميرا)").click();
  const token = (await vol.getByTestId("qr-token").textContent())!.trim();
  expect(token.split(".")).toHaveLength(4);

  await lead.getByText("لصق الرمز يدوياً", { exact: true }).click();
  await lead.getByLabel("الرمز").fill(token);
  await lead.getByRole("button", { name: "تحقق" }).click();
  await expect(lead.getByText(/✓ حضور متطوع تجريبي/)).toBeVisible();
  // replay is refused
  await lead.getByLabel("الرمز").fill(token);
  await lead.getByRole("button", { name: "تحقق" }).click();
  await expect(lead.getByText("هذا الرمز استُخدم من قبل.")).toBeVisible();

  // --- 5. points exactly once, visible in profile and impact
  await vol.goto("/profile");
  await expect(vol.getByText(/20 نقطة مؤكدة/)).toBeVisible();
  await expect(vol.getByText("حضور مؤكد بـ QR (1)")).toBeVisible();
  const { count: att } = await db.from("attendance").select("*", { count: "exact", head: true }).eq("token_nonce", token.split(".")[2]);
  expect(att).toBe(1);

  await anon.goto("/impact");
  await expect(anon.getByText("حضور مؤكد بـ QR")).toBeVisible();
});

test("unauthorised users cannot moderate", async ({ page }) => {
  await ensureUser(VOL);
  await login(page, VOL, "/admin");
  await page.goto("/admin");
  await expect(page.getByText(/للمشرفين فقط/)).toBeVisible();
  const res = await page.request.post("/api/intake", { data: { text: "x".repeat(30), channel: "moderator_paste", consent: true } });
  expect(res.status()).toBe(403);
});
