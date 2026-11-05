import { test, expect } from "@playwright/test";
import { admin, ensureUser, login } from "./helpers";

const RUN = Date.now().toString(36);
const ASSOC = `assoc-${RUN}@e2e.test`, DJSL = `djsl-${RUN}@e2e.test`;

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-athar-public"]).toBe("1");
});

test("service worker excludes private pages", async ({ request }) => {
  const sw = await (await request.get("/sw.js")).text();
  expect(sw).toMatch(/PRIVATE = .*admin.*profile/);
});

test("association verification → campaign → beneficiary dedupe", async ({ browser }) => {
  const db = admin();
  // DJSL admin for Oran (31)
  const djslId = await ensureUser(DJSL);
  await db.from("user_roles").upsert({ user_id: djslId, role: "djsl_admin", wilaya_code: 31 });

  // association applies with an approval document
  await ensureUser(ASSOC);
  const a = await browser.newPage();
  await login(a, ASSOC, "/associations");
  await a.goto("/associations");
  await a.getByRole("button", { name: "تقديم طلب اعتماد جمعية" }).click();
  await a.getByLabel("اسم الجمعية *").fill(`جمعية الاختبار ${RUN}`);
  await a.getByLabel("رقم الاعتماد *").fill(`AGR-${RUN}`);
  await a.getByLabel("الولاية").selectOption("31");
  await a.locator('input[type="file"]').setInputFiles({ name: "agrement.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%test\n") });
  await a.getByRole("button", { name: "إرسال" }).click();
  await expect(a.getByText("أُرسل الطلب")).toBeVisible();

  // DJSL verifies
  const d = await browser.newPage();
  await login(d, DJSL, "/admin?tab=associations");
  await d.goto("/admin?tab=associations");
  await expect(d.getByText(`جمعية الاختبار ${RUN}`)).toBeVisible();
  await d.getByRole("button", { name: "اعتماد", exact: true }).first().click();
  await expect(d.getByText("اعتُمدت")).toBeVisible();

  // association creates a campaign and checks duplicate beneficiaries
  await a.goto("/campaigns");
  await a.getByRole("button", { name: "حملة جديدة" }).click();
  await a.getByLabel("العنوان *").fill(`قفة رمضان ${RUN}`);
  await a.getByLabel("البداية *").fill("2027-02-01");
  await a.getByLabel("النهاية *").fill("2027-03-15");
  await a.getByRole("button", { name: "إنشاء" }).click();
  await expect(a.getByRole("alert").filter({ hasText: /./ })).toHaveCount(0, { timeout: 5000 }).catch(async () => { throw new Error("campaign form error: " + (await a.getByRole("alert").allTextContents()).join(" | ")); });
  await expect(a).toHaveURL(/\/campaigns\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await a.getByLabel("المعرّف").fill("0555 12 34 99");
  await a.getByRole("button", { name: "فحص وتسجيل" }).click();
  await expect(a.getByText("✓ سُجّلت الأسرة")).toBeVisible();
  await a.getByLabel("المعرّف").fill("+213 555 12 34 99");
  await a.getByRole("button", { name: "فحص وتسجيل" }).click();
  await expect(a.getByText("مسجّلة مسبقاً في هذه الحملة")).toBeVisible();

  // raw identifier is never stored
  const { data: regs } = await db.from("beneficiary_registrations").select("beneficiary_hash");
  expect(JSON.stringify(regs)).not.toContain("555");
});
